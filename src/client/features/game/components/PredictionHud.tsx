import type { ReactNode } from "react";

import { Button } from "../../../components/ui/Button";
import { usePredictionReadout, type PredictionReadoutSource } from "../hooks/usePredictionReadout";

/**
 * The development readout of the cursor engine (docs/architecture.md, §6.5). It sits **above the
 * arena and outside it**: §11.19 makes the veil the only thing allowed over the arena, and a
 * development panel is no exception to that.
 *
 * « souris » is the average over the window, pauses included; « pointe » is the fastest the hand
 * went over one send, which is what the ceiling is compared with — the two can differ tenfold.
 * « événement » is the largest single mouse event: a real flick spreads over several, so a value
 * close to the peak's own send means the browser, not the hand.
 *
 * Two rows, because a measurement is taken after the fact. The first covers the last three
 * seconds, which is what the hand remembers; the second covers the whole game, and is what is
 * still there once the interesting moment has passed and the key is finally pressed.
 */
export function PredictionHud(source: PredictionReadoutSource) {
  const { readout, copied, copy } = usePredictionReadout(source);
  if (readout === null) {
    return null;
  }

  const scale = source.scaleRef.current;
  const { window, game } = readout;
  const share = (value: number | null): string =>
    value === null ? "—" : `${Math.round(value * 100)} %`;
  const pixels = (units: number): string => `${Math.round(units * scale)} px`;

  return (
    <div className="mb-3 flex items-center gap-4 rounded-sm border border-line bg-surface-2 px-3 py-2">
      <div className="flex-1">
        <Row title="3 s">
          <Figure label="écart" value={`${readout.gap.toFixed(1)} u`} />
          <Figure label="max" value={`${window.gap.toFixed(1)} u`} />
          <Figure label="sauts" value={`${readout.snapsPerSecond.toFixed(1)}/s`} />
          <Figure label="perdu" value={share(readout.lostShare)} />
          <Figure label="tronqué" value={`${readout.truncatedNow.toFixed(0)} u`} />
          <Figure label="souris" value={`${pixels(readout.askedPerSecond)}/s`} />
          <Figure label="pointe" value={`${pixels(window.peak)}/s`} />
          <Figure label="événement" value={pixels(window.largestEvent)} />
          <Figure label="rattrapage" value={`${Math.round(window.glide)} ms`} />
        </Row>

        <Row title="partie">
          <Figure label="écart" value={`${game.gap.toFixed(1)} u`} />
          <Figure label="sauts" value={`${game.snaps}`} />
          <Figure label="perdu" value={share(game.lostShare)} />
          <Figure label="tronqué" value={`${game.truncated.toFixed(0)} u`} />
          <Figure label="souris" value={`${pixels(game.askedPerSecond)}/s`} />
          <Figure label="pointe" value={`${pixels(game.peak)}/s`} />
          <Figure label="événement" value={pixels(game.largestEvent)} />
          <Figure label="rattrapage" value={`${Math.round(game.glide)} ms`} />
          <Figure label="plafond" value={`${pixels(source.maxSpeed)}/s`} />
        </Row>
      </div>

      <Button variant="quiet" onClick={copy}>
        {copied ? "Copié" : "Copier (F9)"}
      </Button>
    </div>
  );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-4">
      <dt className="t-micro w-12 shrink-0 text-ink-disabled">{title}</dt>
      {children}
    </dl>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="t-micro text-ink-secondary">{label}</dt>
      <dd className="t-small text-ink">{value}</dd>
    </div>
  );
}
