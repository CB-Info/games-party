import { ROOM_CAPACITY } from "../../../../shared/constants";
import type { PlayerColorId, RoomState } from "../../../../shared/types";
import { countReady } from "../../../utils/lobbyPlayers";
import { CopyLinkButton } from "./CopyLinkButton";
import { GameGrid } from "./GameGrid";
import { LeaveRoomButton } from "./LeaveRoomButton";
import { PlayerList } from "./PlayerList";
import { ReadyToggle } from "./ReadyToggle";
import { SettingsColumn } from "./SettingsColumn";
import { StartGameButton } from "./StartGameButton";
import { WaitingMessage } from "./WaitingMessage";

interface LobbyScreenProps {
  state: RoomState;
  myPlayerId: string | null;
  onPickColor: (color: PlayerColorId) => void;
  onToggleReady: (ready: boolean) => void;
  onCopyLink: () => Promise<boolean>;
  onLeave: () => void;
  onStart: (force: boolean) => void;
}

/** The lobby (docs/design-system.md, §13). No game is registered before step 4, so the room stays
 * in its "aucun jeu choisi" shape: two columns, with the grid or the waiting message. */
export function LobbyScreen({
  state,
  myPlayerId,
  onPickColor,
  onToggleReady,
  onCopyLink,
  onLeave,
  onStart,
}: LobbyScreenProps) {
  const host = state.players.find((player) => player.playerId === state.hostId);
  const amHost = myPlayerId !== null && myPlayerId === state.hostId;
  const { ready, total } = countReady(state.players, state.hostId, state.readyPlayerIds);
  const amReady = myPlayerId !== null && state.readyPlayerIds.includes(myPlayerId);

  // Whoever takes the room over when the host leaves: the next human in arrival order (§5.3).
  const successor =
    state.players.find((player) => player.playerId !== state.hostId && player.connected) ?? null;

  return (
    <main className="flex flex-1 flex-col gap-6 px-12 pb-10 wide:px-14">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="t-title-1">La room de {host?.pseudo ?? "…"}</h1>
          <p className="t-body text-ink-secondary">
            {state.players.length >= ROOM_CAPACITY
              ? `Room pleine : ${ROOM_CAPACITY} joueurs.`
              : "Envoie le lien à tes potes, ils arrivent en un clic."}
          </p>
        </div>

        <CopyLinkButton onCopy={onCopyLink} highlighted={state.selectedGameId === null} />
      </div>

      <div className="flex items-stretch gap-6">
        <div className="w-[400px] shrink-0">
          <PlayerList
            players={state.players}
            hostId={state.hostId}
            readyPlayerIds={state.readyPlayerIds}
            myPlayerId={myPlayerId}
            onPickColor={onPickColor}
            footer={
              <LeaveRoomButton
                nextHostPseudo={amHost ? (successor?.pseudo ?? null) : null}
                onLeave={onLeave}
              />
            }
          />
        </div>

        {state.selectedGameId === null ? (
          amHost ? (
            <GameGrid isEmpty />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6 shadow-1">
              <WaitingMessage>{`${host?.pseudo ?? "L’hôte"} choisit un jeu…`}</WaitingMessage>
            </div>
          )
        ) : (
          <SettingsColumn
            ready={ready}
            total={total}
            action={
              amHost ? (
                <StartGameButton
                  everyoneIsReady={ready === total}
                  disabled={false}
                  onStart={onStart}
                />
              ) : (
                <ReadyToggle ready={amReady} onToggle={onToggleReady} />
              )
            }
          />
        )}
      </div>
    </main>
  );
}
