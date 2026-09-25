import { useEffect, useRef, useState } from "react";

/**
 * How many times each value has changed since the form appeared, keyed by option. A player's form
 * lights a value up when the host changes it (docs/design-system.md, §11.5); the count lets the
 * form replay the animation at every change, by giving the row a new key. The first values count
 * for nothing: arriving in the lobby changes nothing.
 */
export function useOptionHighlight(
  values: Readonly<Record<string, number>> | null,
): Readonly<Record<string, number>> {
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>({});
  const previous = useRef(values);

  useEffect(() => {
    const before = previous.current;
    previous.current = values;
    if (before === null || values === null) {
      return;
    }

    const changed = Object.keys(values).filter((key) => before[key] !== values[key]);
    if (changed.length > 0) {
      setCounts((current) => ({
        ...current,
        ...Object.fromEntries(changed.map((key) => [key, (current[key] ?? 0) + 1])),
      }));
    }
  }, [values]);

  return counts;
}
