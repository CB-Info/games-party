import { useCallback, useEffect, useState, type RefObject } from "react";

import { MOVE_BUDGET_CAP_MS } from "../../../../shared/constants";
import type { PredictionProbe, PredictionReadout } from "../../../engine/predictionStats.types";
import { copyToClipboard } from "../../../services/clipboard";

/** Twice a second is enough to read, and keeps the readout well clear of règle d'or 4. */
const REFRESH_MS = 500;

/** The key that copies the readout. Improbable on purpose: a game may want the letters. */
const COPY_KEY = "F9";

/**
 * What the readout needs to say anything. Declared here rather than in the engine so that a
 * component can name it: the layer table lets only a hook reach the engine, and this hook is the
 * door the development readout goes through.
 */
export interface PredictionReadoutSource {
  probe: RefObject<PredictionProbe | null>;
  /** Displayed width over `ARENA_WIDTH`, which turns units back into pixels on this screen. */
  scaleRef: RefObject<number>;
  maxSpeed: number;
  /** The game's « Rattrapage », in milliseconds; zero while it is off. */
  catchUpMs: number;
}

export interface ReadoutState {
  readout: PredictionReadout | null;
  copied: boolean;
  copy: () => void;
}

/**
 * Reads the prediction probe twice a second, and copies the figures on `F9`
 * (docs/architecture.md, §6.5). Development only.
 *
 * A key rather than a button alone: during a game the mouse is captured, and reaching a button
 * would mean pressing Escape first, which stops the sending of inputs and destroys the very state
 * being measured. The button stays for when the mouse is free.
 */
export function usePredictionReadout({
  probe,
  scaleRef,
  maxSpeed,
  catchUpMs,
}: PredictionReadoutSource): ReadoutState {
  const [readout, setReadout] = useState<PredictionReadout | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setReadout(probe.current?.read(performance.now()) ?? null);
    }, REFRESH_MS);

    return () => clearInterval(timer);
  }, [probe]);

  const copy = useCallback(() => {
    const current = probe.current?.read(performance.now());
    if (current === undefined) {
      return;
    }

    const settings = { maxSpeed, catchUpMs };
    void copyToClipboard(readoutLine(current, scaleRef.current, settings)).then(setCopied);
  }, [probe, scaleRef, maxSpeed, catchUpMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === COPY_KEY) {
        event.preventDefault();
        copy();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [copy]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), REFRESH_MS * 4);
    return () => clearTimeout(timer);
  }, [copied]);

  return { readout, copied, copy };
}

/**
 * Everything in two parts, so that a measurement can be pasted into a message as it stands. The
 * game's own maxima are there because the three-second window has usually fallen back by the time
 * the key is pressed: the interesting moment is over before a hand can leave the mouse.
 */
function readoutLine(
  readout: PredictionReadout,
  scale: number,
  { maxSpeed, catchUpMs }: { maxSpeed: number; catchUpMs: number },
): string {
  const one = (value: number): string => value.toFixed(1);
  const share = (value: number | null): string =>
    value === null ? "—" : `${Math.round(value * 100)}%`;
  const px = (units: number): string => `${Math.round(units * scale)}px`;
  const { window, game } = readout;

  return [
    `3s: gap=${one(readout.gap)} max=${one(window.gap)}`,
    `sauts/s=${one(readout.snapsPerSecond)}`,
    `demande=${Math.round(readout.askedPerSecond)}u/s`,
    `pointe=${px(window.peak)}/s evenement=${px(window.largestEvent)}`,
    `rattrapage=${Math.round(window.glide)}ms`,
    `parcouru=${Math.round(readout.travelledPerSecond)}u/s`,
    `perdu=${share(readout.lostShare)} tronque=${Math.round(readout.truncatedNow)}u`,
    `| partie: gap=${one(game.gap)}`,
    `souris=${px(game.askedPerSecond)}/s`,
    `pointe=${px(game.peak)}/s evenement=${px(game.largestEvent)}`,
    `rattrapage=${Math.round(game.glide)}ms`,
    `perdu=${share(game.lostShare)}`,
    `tronque=${Math.round(game.truncated)}u`,
    `sauts=${game.snaps}`,
    `| maxSpeed=${maxSpeed} laisse=${catchUpMs}ms plafond=${Math.round(maxSpeed * scale)}px/s`,
    `reserve=${Math.round((maxSpeed * MOVE_BUDGET_CAP_MS) / 1000)}u`,
    `scale=${scale.toFixed(3)}`,
  ].join(" ");
}
