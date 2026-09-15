import { useConnectionStatus } from "../hooks/useConnectionStatus";

export function ConnectionStatus() {
  const connected = useConnectionStatus();

  return <p>{connected ? "Connecté au serveur" : "Déconnecté — reconnexion en cours…"}</p>;
}
