import { Badge } from "../../../components/ui/Badge";
import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { DemoArena } from "../../demo/components/DemoArena";
import { HeroBadge, HeroCard, HeroIntro } from "./HeroCard";
import { RoomErrorScreen } from "../../room/components/RoomErrorScreen";
import { PseudoForm } from "./PseudoForm";

interface HomeScreenProps {
  pseudo: string;
  onPseudoChange: (pseudo: string) => void;
  onCreate: () => void;
  /** Shown under the field (docs/design-system.md, §13). */
  fieldError?: string;
  /** Replaces the whole left column when the server has no room left (§13). */
  serverFull: boolean;
  busy: boolean;
}

const TITLE = "Tes potes, un lien, dix curseurs.";
const INTRO =
  "Crée une room, envoie le lien à tes potes, ils arrivent en un clic. Jusqu’à 10 joueurs, sur ordinateur, à la souris.";
const HINT = "2 à 16 caractères. Tu choisiras ta couleur dans le lobby.";

/** The home screen (docs/maquettes/5.1, docs/design-system.md, §13). */
export function HomeScreen({
  pseudo,
  onPseudoChange,
  onCreate,
  fieldError,
  serverFull,
  busy,
}: HomeScreenProps) {
  return (
    <HeroCard
      left={
        serverFull ? (
          <RoomErrorScreen
            kind="serverFull"
            hostPseudo={null}
            onCreateRoom={onCreate}
            onRetry={onCreate}
          />
        ) : (
          <>
            <HeroIntro
              badge={<HeroBadge>Mini-jeux multijoueurs</HeroBadge>}
              title={TITLE}
              intro={INTRO}
            />
            <PseudoForm
              pseudo={pseudo}
              onPseudoChange={onPseudoChange}
              submitLabel="Créer une room"
              onSubmit={onCreate}
              hint={HINT}
              busy={busy}
              {...(fieldError === undefined ? {} : { error: fieldError })}
            />
          </>
        )
      }
      aside={
        <>
          <DemoArena />
          <div className="flex items-center gap-4 rounded-lg border border-line p-5">
            <CursorTagIcon />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="t-title-3">Cursor Tag</span>
              <span className="t-small text-ink-secondary">
                Un jeu du chat à la souris. Esquive, prends les portails, ne te fais pas toucher.
              </span>
            </div>
            <Badge variant="playerCount">3 à 10 joueurs</Badge>
          </div>
        </>
      }
    />
  );
}
