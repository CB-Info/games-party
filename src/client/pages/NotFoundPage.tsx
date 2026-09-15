import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <Link to="/" className="underline">
        Retour à l’accueil
      </Link>
    </main>
  );
}
