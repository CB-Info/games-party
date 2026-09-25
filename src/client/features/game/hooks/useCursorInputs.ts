import { useEffect, useMemo, type RefObject } from "react";

import { createInputSender, type InputSender } from "../../../engine/inputSender";
import { isLocked } from "../../../engine/pointerLock";
import type { PredictionProbe } from "../../../engine/predictionStats.types";
import { subscribeToReconnection } from "../../../services/socketClient";

interface CursorInputsDeps {
  sendInput: (input: unknown) => void;
  /** The arena's canvas, which holds the mouse while it is captured. */
  canvas: RefObject<HTMLCanvasElement | null>;
  scaleRef: RefObject<number>;
  /** No input is sent while the mouse is free, so the cursor stands still server-side (§6.5). */
  locked: boolean;
  probe: RefObject<PredictionProbe | null>;
}

/**
 * The mouse movement of a cursor game, gathered and sent (docs/architecture.md, §6.5). Built once:
 * rebuilding the sender would throw away the sequence number and everything waiting.
 *
 * Movement is recorded from the very moment the mouse is captured. The listener stays for as long
 * as the screen does and asks, event by event, whether the canvas holds the mouse: installed only
 * once React had seen the capture, it lost the movement of the first frame after the click.
 * Sending follows the capture through React, which costs nothing, since what is gathered in
 * between is sent at the first beat.
 */
export function useCursorInputs(deps: CursorInputsDeps): InputSender {
  const { sendInput, canvas, scaleRef, locked, probe } = deps;
  const sender = useMemo(() => createInputSender({ send: sendInput }), [sendInput]);

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
    return () => sender.stop();
  }, [locked, sender]);

  useEffect(() => {
    const onMove = (event: MouseEvent): void => {
      const element = canvas.current;
      if (element === null || !isLocked(element)) {
        return;
      }

      sender.add(event.movementX, event.movementY, scaleRef.current);
      probe.current?.asked(Math.hypot(event.movementX, event.movementY) / scaleRef.current);
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [sender, canvas, scaleRef, probe]);

  return sender;
}
