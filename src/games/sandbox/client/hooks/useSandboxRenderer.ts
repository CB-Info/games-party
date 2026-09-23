import { useEffect, useMemo, type RefObject } from "react";

import { readArenaTheme } from "../../../../client/engine/arenaTheme";
import { createCursorSmoother } from "../../../../client/engine/correction";
import { displayTime, frameStep } from "../../../../client/engine/interpolation";
import { createInputSender } from "../../../../client/engine/inputSender";
import { predictCursor } from "../../../../client/engine/prediction";
import { createRenderLoop } from "../../../../client/engine/renderLoop";
import { subscribeToReconnection } from "../../../../client/services/socketClient";
import { distance, type Point } from "../../../../shared/cursor/collision";
import { WALLS } from "../../../cursor-tag/shared/map";
import type { GameScreenProps } from "../../../gameClient.types";
import { isSandboxView, mySnapshot } from "../../logic/sandboxView";
import {
  SANDBOX_CATCH_UP_MS_DEFAULT,
  SANDBOX_CURSOR_RADIUS,
  SANDBOX_SPEED_DEFAULT,
} from "../../shared/constants";
import { sandboxOptionsSchema } from "../../shared/schemas";
import { drawArena } from "../render/drawArena";
import { usePredictionProbe } from "./usePredictionProbe";
import { drawCursors } from "../render/drawCursors";
import { otherDrawableCursors } from "../render/otherCursors";

interface RendererDeps extends Pick<
  GameScreenProps,
  "viewStore" | "options" | "sendInput" | "me" | "players"
> {
  canvas: RefObject<HTMLCanvasElement | null>;
  scaleRef: RefObject<number>;
  /** No input is sent while the mouse is free, so the cursor stands still server-side (§6.5). */
  locked: boolean;
}

export interface RendererHandle {
  /** The development readout, or a box that stays empty in production. */
  probe: ReturnType<typeof usePredictionProbe>;
  /** The speed the host chose, which the readout needs to say what the ceiling is worth. */
  maxSpeed: number;
  /** The « Rattrapage » the host chose, which the readout copies with its figures. */
  catchUpMs: number;
}

/**
 * The whole moving part of the sandbox, in one place and outside React: it reads the view buffer,
 * predicts the local cursor, interpolates the others and draws, sixty times a second
 * (règle d'or 4).
 */
export function useSandboxRenderer(deps: RendererDeps): RendererHandle {
  const { canvas, scaleRef, locked, viewStore, options, sendInput, me, players } = deps;

  // The prediction must move the cursor as the server does, and the host sets how in the lobby.
  const parsed = sandboxOptionsSchema.safeParse(options);
  const maxSpeed = parsed.success ? parsed.data.maxSpeed : SANDBOX_SPEED_DEFAULT;
  const catchUpMs = parsed.success ? parsed.data.catchUpMs : SANDBOX_CATCH_UP_MS_DEFAULT;
  // One stable object, so that the render loop restarts only when one of the two really changes.
  const settings = useMemo(() => ({ maxSpeed, catchUpMs }), [maxSpeed, catchUpMs]);

  const myPlayerId = "playerId" in me ? me.playerId : null;
  // Built once: rebuilding it would throw away the sequence number and everything waiting.
  const sender = useMemo(() => createInputSender({ send: sendInput }), [sendInput]);
  // Hides the server's corrections; the player's own movement goes through untouched (§6.5).
  const smoother = useMemo(() => createCursorSmoother(maxSpeed), [maxSpeed]);
  const probe = usePredictionProbe();

  // `seq` restarts at 0 when a game starts and when the connection comes back, and the server
  // resets its own counter at those two moments and no other (§6.5).
  useEffect(() => {
    sender.restart();
    return subscribeToReconnection(() => sender.restart());
  }, [sender]);

  useEffect(() => {
    if (!locked) {
      sender.stop();
      return;
    }

    sender.start();
    const onMove = (event: MouseEvent): void => {
      sender.add(event.movementX, event.movementY, scaleRef.current);
      probe.current?.asked(Math.hypot(event.movementX, event.movementY) / scaleRef.current);
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      sender.stop();
    };
  }, [locked, sender, scaleRef, probe]);

  useEffect(() => {
    const element = canvas.current;
    if (element === null) {
      return;
    }

    type Sample = NonNullable<ReturnType<typeof viewStore.latest>>;

    const theme = readArenaTheme();
    const colorOf = new Map(players.map((player) => [player.playerId, player.color]));
    const pseudoOf = new Map(players.map((player) => [player.playerId, player.pseudo]));
    let previousFrameAt = performance.now();
    let lastSample: Sample | null = null;

    const loop = createRenderLoop((now) => {
      const context = element.getContext("2d");
      const scale = scaleRef.current;
      if (context === null || scale <= 0) {
        return;
      }

      const dtMs = frameStep(previousFrameAt, now);
      previousFrameAt = now;

      drawArena(context, theme, scale);

      const latest = viewStore.latest();
      if (latest === null || !isSandboxView(latest.view)) {
        return;
      }

      const at = displayTime(latest, Date.now());
      const drawable = otherDrawableCursors({ viewStore, myPlayerId, at, colorOf, pseudoOf });

      const mine = myPlayerId === null ? null : mySnapshot(latest.view, myPlayerId);
      if (mine !== null) {
        // The same instant seen through the previous view: what the prediction said just before
        // this one landed. The difference between the two is the server's correction and nothing
        // else — the player's own movement is in both, so it cancels out (§6.5).
        const asBefore = latest === lastSample ? null : predictFrom(lastSample);

        sender.acknowledge(mine.lastProcessedSeq, latest.receivedAt);
        lastSample = latest;

        const predicted = predictFrom(latest);
        if (predicted === null) {
          return;
        }

        const roundTrip = sender.ackDelayMs() ?? 0;
        const snapped =
          asBefore !== null && smoother.correct(asBefore.position, predicted.position, roundTrip);
        probe.current?.frame({
          at: now,
          gap: distance(predicted.position, mine.position),
          snapped,
          truncated: predicted.truncated,
          predicted: predicted.position,
          official: mine.position,
        });

        drawable.push({
          position: smoother.positionAt(predicted.position, dtMs),
          pseudo: pseudoOf.get(myPlayerId ?? "") ?? "",
          color: colorOf.get(myPlayerId ?? "") ?? "c1",
          isMine: true,
        });
      }

      drawCursors(context, theme, scale, drawable);
    });

    /** Where this browser thinks its own cursor is, from one view and everything still waiting. */
    function predictFrom(sample: Sample | null) {
      if (sample === null || !isSandboxView(sample.view) || myPlayerId === null) {
        return null;
      }

      const snapshot = mySnapshot(sample.view, myPlayerId);
      if (snapshot === null) {
        return null;
      }

      return predictCursor({
        officialPosition: snapshot.position,
        officialBudget: snapshot.budget,
        officialBacklog: snapshot.backlog,
        pendingInputs: sender.pending(),
        pendingDelta: toPoint(sender.pendingDelta()),
        viewReceivedAt: sample.receivedAt,
        now: Date.now(),
        ackDelayMs: sender.ackDelayMs(),
        ...settings,
        radius: SANDBOX_CURSOR_RADIUS,
        walls: WALLS,
      });
    }

    loop.start();
    return () => loop.stop();
  }, [canvas, scaleRef, viewStore, sender, myPlayerId, players, settings, probe, smoother]);

  return { probe, maxSpeed, catchUpMs };
}

function toPoint(delta: { dx: number; dy: number }): Point {
  return { x: delta.dx, y: delta.dy };
}
