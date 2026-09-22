import { useEffect, useRef } from "react";

import { PLAYER_COLOR_IDS } from "../../../../shared/constants";
import type { PlayerColorId } from "../../../../shared/types";
import { PlayerSwatch } from "../../../components/ui/PlayerSwatch";

interface ColorPaletteProps {
  /** Who holds each colour, so that a taken one can name its owner (§11.11). */
  takenBy: Partial<Record<PlayerColorId, string>>;
  mine: PlayerColorId;
  onPick: (color: PlayerColorId) => void;
  onClose: () => void;
}

/** Opens right under your row, closes on a pick, on Escape or on a click outside (§11.11). */
export function ColorPalette({ takenBy, mine, onPick, onClose }: ColorPaletteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function onPointerDown(event: MouseEvent): void {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="grid animate-appear grid-cols-5 justify-items-center gap-2 rounded-md border border-line bg-surface p-3 shadow-2"
    >
      {PLAYER_COLOR_IDS.map((color) => {
        const owner = takenBy[color];
        const isMine = color === mine;
        const isTaken = owner !== undefined && !isMine;

        return (
          <button
            key={color}
            type="button"
            title={isMine ? "Ta couleur" : isTaken ? `Prise par ${owner}` : "Libre"}
            disabled={isTaken}
            onClick={() => onPick(color)}
            className={`focus-ring relative inline-flex rounded-sm ${isMine ? "shadow-focus" : ""} ${isTaken ? "cursor-not-allowed" : ""}`}
          >
            <PlayerSwatch color={color} size="palette" />
            {isTaken ? (
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-[3px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-xs bg-on-accent"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
