import { Link } from "react-router";

import { AppShell } from "../features/appShell/components/AppShell";

export function NotFoundPage() {
  return (
    <AppShell>
      <main className="flex flex-1 flex-col items-start gap-6 px-12 pb-16 wide:px-14">
        <h1 className="t-title-1">Cette page n’existe pas.</h1>
        <Link to="/" className="t-body">
          Retour à l’accueil
        </Link>
      </main>
    </AppShell>
  );
}
