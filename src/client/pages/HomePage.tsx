import { useNavigate } from "react-router";

import { AppShell } from "../features/appShell/components/AppShell";
import { HomeScreen } from "../features/home/components/HomeScreen";
import { fieldErrorOf, screenErrorOf } from "../features/room/errorMessages";
import { useJoinFlow } from "../features/room/hooks/useJoinFlow";
import { useStoredPseudo } from "../features/session/hooks/useStoredPseudo";

export function HomePage() {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useStoredPseudo();
  const flow = useJoinFlow();

  async function create(): Promise<void> {
    const answer = await flow.create(pseudo);

    if (answer.ok) {
      void navigate(`/r/${answer.data.code}`);
    }
  }

  const fieldError = fieldErrorOf(flow.error);

  return (
    <AppShell>
      <HomeScreen
        pseudo={pseudo}
        onPseudoChange={setPseudo}
        onCreate={() => void create()}
        busy={flow.busy}
        serverFull={screenErrorOf(flow.error) === "serverFull"}
        {...(fieldError === undefined ? {} : { fieldError })}
      />
    </AppShell>
  );
}
