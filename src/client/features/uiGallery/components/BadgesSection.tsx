import { Badge } from "../../../components/ui/Badge";
import { RolePill } from "../../../components/ui/RolePill";
import { GallerySection } from "./GallerySection";

export function BadgesSection() {
  return (
    <GallerySection
      title="Badges et pastilles de rôle"
      note="Les badges sont en micro sans capitales (4 × 8) ; les pastilles de rôle en corps-fort (8 × 16)."
    >
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 p-4">
        <Badge variant="host">Hôte</Badge>
        <Badge variant="you">Toi</Badge>
        <Badge variant="ready">Prêt</Badge>
        <Badge variant="disconnected">Déconnecté</Badge>
        <Badge variant="takenPseudo">C’est ce pseudo</Badge>
        <span className="t-small text-ink-secondary">sur Surface 2 : variante à point</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-4">
        <Badge variant="cat">Chat</Badge>
        <Badge variant="disconnectedFlat">Déconnecté</Badge>
        <Badge variant="playerCount">3 à 10 joueurs</Badge>
        <span className="t-small text-ink-secondary">sur Surface : variante plate</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RolePill role="runner">Coureur</RolePill>
        <RolePill role="cat">Chat</RolePill>
        <RolePill role="frozen">Gelé 2 s</RolePill>
        <RolePill role="spectator">Spectateur</RolePill>
      </div>
    </GallerySection>
  );
}
