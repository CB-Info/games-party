import { ConnectionStatus } from "../features/connection/components/ConnectionStatus";

export function HomePage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="t-title-1">Games Party</h1>
      <ConnectionStatus />
    </main>
  );
}
