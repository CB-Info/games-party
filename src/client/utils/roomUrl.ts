/**
 * The link a player shares. The origin comes in as a parameter: this layer reads nothing from the
 * browser (CLAUDE.md, « Rôle de chaque couche »).
 */
export function buildRoomUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/r/${code}`;
}
