/**
 * A copy of `items` in a random order, drawn from the randomness it is given, never from
 * `Math.random` (CLAUDE.md, règle d'or 7): the same sequence always gives the same order, which is
 * what makes a game's tests reproducible. Fisher-Yates, walking from the end; the input is left
 * untouched.
 */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    // Both indices are inside the array, so neither read can miss.
    const held = shuffled[index] as T;
    shuffled[index] = shuffled[other] as T;
    shuffled[other] = held;
  }

  return shuffled;
}
