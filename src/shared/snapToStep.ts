/**
 * Brings a value back inside its bounds and onto a valid step: the rule every game applies to the
 * options the host sends (docs/architecture.md, §5.3). Halfway between two steps it goes to the
 * lower one, as Cursor Tag's rules say (their §3, which the sandbox follows): `Math.round` would
 * go up. The caller guarantees that `max` is not below `min`.
 */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  const bounded = Math.min(max, Math.max(min, value));
  const steps = (bounded - min) / step;
  const lower = Math.floor(steps);

  return min + (steps - lower > 0.5 ? lower + 1 : lower) * step;
}
