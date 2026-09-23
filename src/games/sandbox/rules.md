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
| Vitesse du curseur (unités logiques par seconde) | `maxSpeed` | `1000` | `8000` | `1000` | `1000` |
| Rattrapage (millisecondes) | `catchUpMs` | `0` | `500` | `100` | `0` |

`normalizeOptions` ramène une valeur hors bornes à la borne la plus proche, puis sur le pas valide
le plus proche, comme les options de Cursor Tag (`rules.md` de `cursor-tag`, section 3).

- **Vitesse du curseur :** réglable ici, et ici seulement, pour essayer plusieurs plafonds contre
  une vraie souris dans une même session. Dans Cursor Tag, la vitesse est une règle du jeu
  (`RUNNER_MAX_SPEED`), pas un réglage.
- **Rattrapage :** affiché « Non », puis en secondes (« 0,1 s » à « 0,5 s ») pour tenir dans la
  largeur fixe du stepper. « Non » est le moteur tel qu'il est partout ailleurs. Un essai, à
  comparer à la main avant de décider quoi que ce soit pour Cursor Tag (section 6).

## 4. Déroulé d'une partie

- Au lancement, les points d'apparition de Cursor Tag sont mélangés avec `ctx.random` et attribués.
- La partie dure `durationS` secondes. Aucune manche, aucune phase de préparation.
- À la fin, `isOver()` renvoie `true` et la room passe aux résultats.

## 5. Contrôles

Le curseur virtuel, et rien d'autre (`docs/architecture.md`, section 6.5). Le clic ne sert qu'à
capturer la souris. Aucune touche du clavier.

- **Avant la première capture :** voile d'arène avec « Clique pour capturer ta souris »
  (`docs/design-system.md`, section 12).
- **Après une perte de capture :** écran « Clique pour reprendre » (section 11.18), dont la phrase
  d'avertissement est, pour ce jeu, **« Ton curseur ne bouge plus. »** Il n'y a rien d'autre à
  perdre ici : personne ne poursuit personne.

## 6. Règles

- Rayon du curseur : `SANDBOX_CURSOR_RADIUS`. Vitesse maximale : l'option `maxSpeed` (section 3).
- Déplacement, budget, sous-pas, glissement le long des murs et bords : `shared/cursor/moveCursor.ts`,
  décrit à la section 6.5 de `docs/architecture.md`.
- **Rattrapage** (`catchUpMs` > 0) : le mouvement que le budget refuse n'est plus perdu mais gardé
  comme un **reste**, jusqu'à une **laisse** de `catchUpMs` millisecondes de trajet à la vitesse
  maximale, puis payé par les inputs et les ticks suivants (`shared/cursor/backlog.ts`).
  - Le reste n'est pas du budget : il est payé par le même budget que tout le reste, donc un
    curseur ne va jamais plus loin en un tick qu'aujourd'hui.
  - **Ordre du tick :** payer le reste avec ce qui reste du budget, **puis** recharger le budget.
    Dans l'ordre inverse, un curseur resté immobile irait une fois et demie plus loin qu'aujourd'hui
    au premier tick de son geste (99 unités au lieu de 66 à 1000 u/s), ce qui déplacerait une borne
    de la sécurité (`docs/architecture.md`, section 9) et ramènerait le bond du démarrage.
  - **Contre un mur ou un bord :** la part du reste qu'un mur ou un bord a arrêtée sur un axe est
    jetée, l'autre est gardée — le reste glisse le long du mur comme le curseur. Gardé en entier,
    il pousserait dans le mur et brûlerait le budget pour rien : le mur deviendrait collant.
  - Un geste de retour mange d'abord le reste : le reste et le nouveau geste s'additionnent.
  - Le reste d'un joueur déconnecté n'est pas payé : il reste où il est.
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
    backlog: { x: number; y: number };  // le reste dû, toujours nul sans rattrapage
  } | null;
};
```

Le reste est envoyé au joueur pour la même raison que le budget : le serveur en a autorité, et un
reste tenu par le client dériverait au premier input perdu. Sa prédiction repart des deux.

Les murs, portails et points d'apparition ne sont pas envoyés : le client les lit dans `map.ts`.

## 9. Événements

Aucun.

## 10. Input et actions

- **Input** (`game:input`) : `{ seq, dx, dy }`, schéma commun de `shared/cursor/cursorInput.ts`.
- **Actions** (`game:action`) : aucune. Le schéma est `z.never()`, donc toute action est refusée.

## 11. Déconnexion, reconnexion, départ

- **Déconnexion :** le curseur reste où il est et n'est plus dessiné. Rien d'autre ne change.
- **Reconnexion :** le joueur retrouve sa position et son score. Son `lastProcessedSeq` repart à
  −1, son budget à 0 (section 6.5) et son reste à zéro : sinon, son curseur finirait un geste fait
  avant la coupure.
- **Retrait :** le joueur disparaît de la vue et du classement.

## 12. Bot

Le bot avance en décrivant un arc lent, avec un léger tremblement. Sa direction est calculée à
partir du temps restant que porte la vue, décalé pour chaque bot : il ne garde donc **aucun état**
entre deux ticks.

- **Il se détourne de ce qu'il va toucher :** avant d'avancer, il regarde devant lui en trois points
  de son chemin ; si un mur ou un bord s'y trouve, il essaie la direction suivante, par huitièmes de
  tour. Sans cela, les bots finissaient collés au bord et n'exerçaient plus les collisions du milieu.
- **Il va à la vitesse par défaut** (`SANDBOX_SPEED_DEFAULT`), quelle que soit l'option `maxSpeed` :
  un bot à allure fixe sert de repère pour comparer son propre curseur.

## 13. Tests à écrire (`logic/`)

- Attribution des points d'apparition, mélangés avec la seule source d'aléa fournie.
- Application d'un input : position, budget, distance parcourue.
- Rattrapage : le reste gardé plutôt que perdu, perdu sans rattrapage, payé au tick pour un joueur
  présent, pas pour un absent ; au plus la réserve de budget en un tick après une pause ; reste
  remis à zéro à la reconnexion.
- Input d'un joueur déconnecté : position inchangée, `seq` enregistré.
- Distance comptée seulement sur le déplacement réellement effectué contre un mur.
- Recharge du budget.
- Arrondi des positions à une décimale.

## 14. Constantes (`shared/constants.ts`)

| Constante | Valeur |
|---|---|
| `SANDBOX_CURSOR_RADIUS` | `14` |
| `SANDBOX_SPEED_MIN` / `SANDBOX_SPEED_MAX` / `SANDBOX_SPEED_DEFAULT` / `SANDBOX_SPEED_STEP` | `1000` / `8000` / `1000` / `1000` |
| `SANDBOX_CATCH_UP_MS_MIN` / `SANDBOX_CATCH_UP_MS_MAX` / `SANDBOX_CATCH_UP_MS_DEFAULT` / `SANDBOX_CATCH_UP_MS_STEP` | `0` / `500` / `0` / `100` |
| `SANDBOX_DURATION_S_MIN` | `30` |
| `SANDBOX_DURATION_S_MAX` | `300` |
| `SANDBOX_DURATION_S_DEFAULT` | `60` |
| `SANDBOX_DURATION_S_STEP` | `15` |

## 15. À DÉCIDER

Aucun point en attente.
