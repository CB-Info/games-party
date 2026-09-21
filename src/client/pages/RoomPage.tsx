import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import type { RoomState } from "../../shared/types";
import { AppShell } from "../features/appShell/components/AppShell";
import { InvitationScreen } from "../features/room/components/InvitationScreen";
import { LobbyScreen } from "../features/room/components/LobbyScreen";
import { fieldErrorOf, screenErrorOf } from "../features/room/errorMessages";
import { useJoinFlow } from "../features/room/hooks/useJoinFlow";
import { useRoomActions } from "../features/room/hooks/useRoomActions";
import { useRoomPreview, type PreviewState } from "../features/room/hooks/useRoomPreview";
import { useSession } from "../features/session/hooks/useSession";
import { useStoredPseudo } from "../features/session/hooks/useStoredPseudo";

export function RoomPage() {
  const { code = "" } = useParams();

  // Keyed on the code so that nothing from a previous room can survive a change of link.
  return (
    <AppShell>
      <RoomContent key={code} code={code} />
    </AppShell>
  );
}

/** Whether this browser already holds a seat in the room, as far as the client can tell. */
type Membership = "unknown" | "member" | "outside";

/**
 * A member is told so by `room:state`, which the server emits while it handles the connection
 * itself, before it can read any request; the preview travels on the same connection and is sent
 * afterwards, so its answer always arrives second. That order is what makes "the preview answered
 * and no state came" mean "not a member", and it is the whole basis of this screen. It is locked by
 * the integration test "sends the room back before it answers anything the member asks", in
 * src/server/socket/socketReconnect.test.ts — never rely on it without reading that test first.
 *
 * The same three states answer a reconnection (§10): `useRoom` forgets the room and `useRoomPreview`
 * asks again, both from the same callback, so the screen goes back to "unknown" in one step. The
 * room still holds the seat, the lobby comes back; the seat expired, the invitation comes back with
 * the pseudo already filled in; the room is gone, the answer is `ROOM_NOT_FOUND` and the screen says
 * so. The test "says nothing to a player whose seat expired while they were away" covers the middle
 * one.
 */
function membershipOf(state: RoomState | null, preview: PreviewState): Membership {
  if (state !== null) {
    return "member";
  }

  return preview.status === "loading" ? "unknown" : "outside";
}

/** Inside the shell, so that a refusal can be reported through its notification stack. */
function RoomContent({ code }: { code: string }) {
  const navigate = useNavigate();
  const { playerId } = useSession();
  const [pseudo, setPseudo] = useStoredPseudo();
  const flow = useJoinFlow();
  const { state, actions, copyLink } = useRoomActions(code);
  const { preview, refresh } = useRoomPreview(code);

  // The pseudo the room turned down, so that the preview can point at whoever already wears it.
  const [takenPseudo, setTakenPseudo] = useState<string | null>(null);

  const fieldError = fieldErrorOf(flow.error);
  const shownPreview = preview.status === "ready" ? preview.preview : null;

  async function join(): Promise<void> {
    const answer = await flow.join(code, pseudo);

    if (!answer.ok && answer.error === "PSEUDO_TAKEN") {
      setTakenPseudo(pseudo);
      refresh();
    }
  }

  const membership = membershipOf(state, preview);

  // Neither screen while it is unknown: showing the invitation to a member, even for one frame,
  // reads as if the room had forgotten them (docs/architecture.md, §2).
  if (membership === "unknown") {
    return null;
  }

  if (state !== null) {
    return (
      <LobbyScreen
        state={state}
        myPlayerId={playerId}
        onPickColor={actions.pickColor}
        onToggleReady={actions.toggleReady}
        onCopyLink={copyLink}
        onStart={actions.start}
        onLeave={() => {
          actions.leave();
          void navigate("/");
        }}
      />
    );
  }

  return (
    <InvitationScreen
      preview={shownPreview}
      errorKind={
        screenErrorOf(flow.error) ??
        (preview.status === "failed" ? screenErrorOf(preview.error) : null)
      }
      pseudo={pseudo}
      onPseudoChange={setPseudo}
      onJoin={() => void join()}
      onCreateRoom={() => void navigate("/")}
      onRetry={() => void join()}
      busy={flow.busy}
      {...(fieldError === undefined ? {} : { fieldError })}
      {...(takenPseudo === null ? {} : { takenPseudo })}
    />
  );
}
