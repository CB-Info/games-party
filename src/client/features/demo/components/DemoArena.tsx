import { ARENA_HEIGHT, ARENA_WIDTH } from "../../../../shared/constants";
import { PORTAL_PAIRS, WALLS } from "../../../../games/cursor-tag/shared/map";

/**
 * A still picture of the arena, with fictional players, shown on the home screen and in the lobby
 * (docs/design-system.md, §13). The animated demonstration replaces it at step 5, and the real
 * arena is drawn by the game engine from step 3.
 */

const WALL_RADIUS = 8;
const PORTAL_RADIUS = 36;
const CURSOR_RADIUS = 14;

/** Pixel (le Chat), Nova, Biscuit et Zippy, jamais les joueurs de la room (§13). */
const DEMO_PLAYERS = [
  { pseudo: "Pixel", x: 560, y: 300, color: "var(--color-player-2)", isCat: true },
  { pseudo: "Nova", x: 1040, y: 240, color: "var(--color-player-5)", isCat: false },
  { pseudo: "Biscuit", x: 480, y: 650, color: "var(--color-player-7)", isCat: false },
  { pseudo: "Zippy", x: 1180, y: 560, color: "var(--color-player-9)", isCat: false },
];

export function DemoArena({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${ARENA_WIDTH} ${ARENA_HEIGHT}`}
      role="img"
      aria-label="Aperçu de l’arène de Cursor Tag"
      className={`w-full rounded-xl ${className}`}
    >
      <rect width={ARENA_WIDTH} height={ARENA_HEIGHT} fill="var(--color-arena)" />

      {WALLS.map((wall) => (
        <rect
          key={`${wall.x}-${wall.y}`}
          x={wall.x}
          y={wall.y}
          width={wall.width}
          height={wall.height}
          rx={WALL_RADIUS}
          fill="var(--color-arena-wall)"
        />
      ))}

      {PORTAL_PAIRS.flatMap(({ pair, first, second }) =>
        [first, second].map((point) => (
          <g key={`${pair}-${point.x}-${point.y}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={PORTAL_RADIUS}
              fill="none"
              stroke="var(--color-portal)"
              strokeWidth="5"
              strokeDasharray={pair === "B" ? "12 10" : undefined}
            />
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-portal)"
              className="t-label"
            >
              {pair}
            </text>
          </g>
        )),
      )}

      {DEMO_PLAYERS.map((player) => (
        <g key={player.pseudo}>
          {player.isCat ? (
            <>
              <circle
                cx={player.x}
                cy={player.y}
                r={CURSOR_RADIUS + 9}
                fill={player.color}
                fillOpacity="0.12"
              />
              <circle
                cx={player.x}
                cy={player.y}
                r={CURSOR_RADIUS + 4}
                fill={player.color}
                fillOpacity="0.28"
              />
              <rect
                x={player.x - 13}
                y={player.y - 20}
                width="11"
                height="11"
                rx="3"
                transform={`rotate(45 ${player.x - 7.5} ${player.y - 14.5})`}
                fill={player.color}
              />
              <rect
                x={player.x + 2}
                y={player.y - 20}
                width="11"
                height="11"
                rx="3"
                transform={`rotate(45 ${player.x + 7.5} ${player.y - 14.5})`}
                fill={player.color}
              />
            </>
          ) : null}
          <circle cx={player.x} cy={player.y} r={CURSOR_RADIUS} fill={player.color} />
          <text
            x={player.x + CURSOR_RADIUS + 10}
            y={player.y}
            dominantBaseline="central"
            fill="var(--color-arena-ink)"
            className="t-label"
          >
            {player.pseudo}
            {player.isCat ? <tspan fill="var(--color-arena-ink-secondary)"> · chat</tspan> : null}
          </text>
        </g>
      ))}
    </svg>
  );
}
