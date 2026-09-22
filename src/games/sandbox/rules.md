# Bac à sable — fiche de jeu

> **Ce n'est pas un jeu.** C'est un outil de développement, enregistré uniquement hors production,
> qui sert à éprouver le moteur curseur (`docs/architecture.md`, section 6.5) sans les règles de
> Cursor Tag. Il n'apparaît jamais sur le site déployé et ne sera pas proposé au groupe.

## 1. Pitch

Des curseurs se déplacent dans l'arène. Ils glissent le long des murs et ne sortent pas du cadre.
Rien d'autre : pas de Chat, pas de gel, pas de portail, pas de manche.

## 2. Identité technique

| Champ | Valeur |
|---|---|
| `id` | `sandbox` |
| Nom affiché | `Bac à sable` |
| Joueurs minimum | `1` |
| Joueurs maximum | `10` |

Le minimum est de 1 pour qu'on puisse ouvrir un seul onglet et regarder un curseur bouger.

## 3. Options réglables par l'hôte

| Option | Clé | Minimum | Maximum | Pas | Défaut |
|---|---|---|---|---|---|
| Durée de la partie (secondes) | `durationS` | `30` | `300` | `15` | `60` |

`normalizeOptions` ramène une valeur hors bornes à la borne la plus proche, puis sur le pas valide
le plus proche, comme les options de Cursor Tag (`rules.md` de `cursor-tag`, section 3).

## 4. Déroulé d'une partie

- Au lancement, les points d'apparition de Cursor Tag sont mélangés avec `ctx.random` et attribués.
- La partie dure `durationS` secondes. Aucune manche, aucune phase de préparation.
- À la fin, `isOver()` renvoie `true` et la room passe aux résultats.

## 5. Contrôles

Le curseur virtuel, et rien d'autre (`docs/architecture.md`, section 6.5). Le clic ne sert qu'à
capturer la souris. Aucune touche du clavier.

## 6. Règles

- Rayon du curseur : `SANDBOX_CURSOR_RADIUS`. Vitesse maximale : `SANDBOX_MAX_SPEED`.
- Déplacement, budget, sous-pas, glissement le long des murs et bords : `shared/cursor/moveCursor.ts`,
  décrit à la section 6.5 de `docs/architecture.md`.
- **Arène :** celle de Cursor Tag, lue depuis `games/cursor-tag/shared/map.ts`. C'est le seul import
  d'un jeu vers un autre du dépôt, et il est délibéré : éprouver le moteur sur la vraie carte est
  tout l'intérêt de ce bac à sable. Les portails sont dessinés mais **n'ont aucun effet**.
- Les curseurs ne se touchent pas et ne se gênent pas : ils se traversent.
- Un joueur déconnecté reste à sa position, n'est pas dessiné, et ses inputs sont ignorés — mais
  leur `seq` est enregistré, comme le prévoit la section 6.5.

## 7. Score et classement

Le score est la **distance parcourue**, en unités logiques. `getRanking()` trie par distance
décroissante. C'est un score sans intérêt de jeu ; il existe pour que le classement et les points
cumulés de la room soient exercés de bout en bout.

## 8. Ce que chacun voit

Tout est public.

```ts
type SandboxView = {
  timeLeftMs: number;
  players: Array<{
    playerId: string;
    x: number;          // arrondi à une décimale
    y: number;
    connected: boolean;
    distance: number;
  }>;
  me: {                 // null pour un spectateur
    lastProcessedSeq: number;
    budget: number;
  } | null;
};
```

Les murs, portails et points d'apparition ne sont pas envoyés : le client les lit dans `map.ts`.

## 9. Événements

Aucun.

## 10. Input et actions

- **Input** (`game:input`) : `{ seq, dx, dy }`, schéma commun de `shared/cursor/cursorInput.ts`.
- **Actions** (`game:action`) : aucune. Le schéma est `z.never()`, donc toute action est refusée.

## 11. Déconnexion, reconnexion, départ

- **Déconnexion :** le curseur reste où il est et n'est plus dessiné. Rien d'autre ne change.
- **Reconnexion :** le joueur retrouve sa position et son score. Son `lastProcessedSeq` repart à
  −1 et son budget à 0 (section 6.5).
- **Retrait :** le joueur disparaît de la vue et du classement.

## 12. Bot

Le bot avance en décrivant un arc lent, avec un léger tremblement. Sa direction est calculée à
partir du temps restant que porte la vue, décalé pour chaque bot : il ne garde donc **aucun état**
entre deux ticks, et un bot coincé contre un mur finit par s'en dégager en tournant.

## 13. Tests à écrire (`logic/`)

- Attribution des points d'apparition, mélangés avec la seule source d'aléa fournie.
- Application d'un input : position, budget, distance parcourue.
- Input d'un joueur déconnecté : position inchangée, `seq` enregistré.
- Distance comptée seulement sur le déplacement réellement effectué contre un mur.
- Recharge du budget.
- Arrondi des positions à une décimale.

## 14. Constantes (`shared/constants.ts`)

| Constante | Valeur |
|---|---|
| `SANDBOX_CURSOR_RADIUS` | `14` |
| `SANDBOX_MAX_SPEED` | `1000` |
| `SANDBOX_DURATION_S_MIN` | `30` |
| `SANDBOX_DURATION_S_MAX` | `300` |
| `SANDBOX_DURATION_S_DEFAULT` | `60` |
| `SANDBOX_DURATION_S_STEP` | `15` |

## 15. À DÉCIDER

Aucun point en attente.
