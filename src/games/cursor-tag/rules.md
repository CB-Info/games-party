# Cursor Tag — fiche de jeu

> Aucun point **À DÉCIDER** ne doit subsister avant de coder la partie concernée.
> Le moteur curseur commun (Pointer Lock, inputs, `moveCursor`, prédiction, interpolation) est décrit dans `docs/architecture.md`, section 6.5.

## 1. Pitch

Un ou plusieurs joueurs sont le **Chat** et doivent toucher les curseurs des autres. Le joueur touché est gelé quelques secondes puis devient Chat à son tour. Le but : passer le plus de temps possible sans être Chat.

## 2. Identité technique

| Champ           | Valeur             |
| --------------- | ------------------ |
| `id`            | `cursor-tag`       |
| Nom affiché     | `Cursor Tag`       |
| Joueurs minimum | `MIN_PLAYERS` (3)  |
| Joueurs maximum | `MAX_PLAYERS` (10) |

## 3. Options réglables par l'hôte

**Nombre de Chats** (`chatCount`)

- Nombre entier, choisi librement par l'hôte dans un champ numérique.
- Bornes : de 1 à « nombre de joueurs − 1 ». Il faut toujours au moins un Chat et au moins un Coureur. Exemple : à 5 joueurs, de 1 à 4 Chats.
- Valeur par défaut : `1`.
- `normalizeOptions` : si la valeur dépasse la borne haute (par exemple parce qu'un joueur a quitté le lobby), elle est ramenée à « nombre de joueurs − 1 ». Si elle est inférieure à 1, elle est ramenée à 1.

## 4. Déroulé d'une partie

- La partie compte `ROUNDS` manches de `ROUND_DURATION_MS` chacune.
- **Début de chaque manche :**
  1. Les points d'apparition (section 6.5) sont mélangés avec `ctx.random`, puis attribués aux joueurs.
  2. Nombre de Chats de la manche : `max(1, min(chatCount, P − 1, C − 1))`, où P est le nombre de joueurs non retirés et C le nombre de joueurs connectés.
  3. Les Chats sont tirés au sort avec `ctx.random` parmi les joueurs connectés. S'il y a moins de joueurs connectés que de Chats à tirer, le complément est tiré parmi les joueurs déconnectés. Aucun joueur n'est exclu du tirage : le Chat de la manche précédente peut être tiré à nouveau. Les autres joueurs sont Coureurs.
  4. Pour chaque joueur : budget de déplacement à 0, recharges de portails à 0, compteur `lastProcessedSeq` conservé.
  5. Chaque Chat est gelé pendant `ROUND_START_FREEZE_MS`. Les Coureurs peuvent bouger immédiatement.
  6. Le temps restant de la manche passe à `ROUND_DURATION_MS`. Événement `roundStart`.
- **Fin de manche** quand le temps restant atteint 0 : événement `roundEnd`.
  - Après la dernière manche, `isOver()` renvoie `true` et la room passe aux résultats.
  - Sinon, la partie passe en **pause entre deux manches** (section 4.1).
- **Plus aucun Coureur :** si, après le retrait d'un joueur, la partie n'est pas abandonnée (architecture 5.2) mais qu'il ne reste aucun Coureur non retiré, la manche se termine immédiatement. Les scores sont conservés, l'événement `roundEnd` est envoyé, puis la partie passe à la pause, ou aux résultats si c'était la dernière manche. La manche suivante recalcule le nombre de Chats (étape 2), ce qui garantit au moins un Coureur.

### 4.1 Pause entre deux manches

- Les scores provisoires sont affichés. Le temps ne s'écoule pas pour les scores, et personne ne peut bouger ni toucher.
- À la fin de la manche, le client libère la souris (`document.exitPointerLock()`) pour que les joueurs puissent cliquer sur le bouton.
- La pause commence dans l'étape **attente**. Chaque joueur voit un bouton « Prêt pour la manche suivante ». Un clic envoie l'action `{ type: "ready" }`. Ce clic capture aussi la souris (Pointer Lock), pour que le joueur soit prêt à jouer au démarrage.
- L'hôte voit en plus un bouton « Lancer quand même », qui envoie l'action `{ type: "forceStart" }`.
- **Passage au compte à rebours.** La pause passe de l'étape attente à l'étape **compte à rebours** dès que l'une de ces conditions est remplie :
  - au moins un joueur est connecté, et tous les joueurs connectés sont prêts ;
  - l'hôte envoie `forceStart`.
- La condition est vérifiée après chaque action `ready`, chaque déconnexion et chaque retrait. Un joueur déconnecté ne bloque donc jamais le démarrage.
- **Compte à rebours :** il dure `INTERMISSION_COUNTDOWN_MS`, ne peut pas être annulé et envoie l'événement `nextRoundCountdown`. À 0, la manche suivante démarre (section 4, étapes 1 à 6).
- **Déconnexion pendant l'attente :** le joueur perd son statut « prêt » (il est retiré de `readyPlayerIds`). Tant qu'il est déconnecté, il ne bloque pas le démarrage.
- **Reconnexion pendant l'attente :** le joueur n'est pas prêt, même s'il avait cliqué avant sa déconnexion. Il voit le bouton, et le démarrage attend de nouveau son clic.
- **Reconnexion pendant le compte à rebours :** le joueur rejoint simplement la manche.
- Les bots envoient l'action `ready` dès le début de la pause.
- **Validation des actions :**
  - `ready` ou `forceStart` hors de l'étape attente : `INVALID_STATE` ;
  - `forceStart` envoyé par un joueur qui n'est pas l'hôte (`ctx.getHostId()`) : `NOT_HOST` ;
  - `ready` d'un joueur déjà prêt : acceptée, sans effet.

## 5. Contrôles

- Le joueur ne contrôle que son curseur virtuel (voir architecture 6.5).
- Pendant une manche, le clic ne sert qu'à capturer la souris (Pointer Lock). Aucune touche du clavier n'est utilisée.
- Pendant la pause, le joueur clique sur les boutons décrits en 4.1.

## 6. Règles

### 6.1 Rôles

| Rôle        | Description                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| **Chat**    | Doit toucher un Coureur. Ne marque aucun point.                              |
| **Coureur** | Doit éviter les Chats. Marque des points tant qu'il est Coureur et connecté. |

Un joueur **gelé** ne peut pas bouger. Seul un Chat peut être gelé.

### 6.2 Déplacement

- Rayon du curseur : `CURSOR_RADIUS`.
- Vitesse maximale d'un Coureur : `RUNNER_MAX_SPEED`.
- Vitesse maximale d'un Chat : `RUNNER_MAX_SPEED × CHAT_SPEED_MULTIPLIER`. Elle s'applique dès qu'un joueur devient Chat, et la vitesse de Coureur dès qu'il redevient Coureur.
- Sensibilité commune à tous les joueurs (`CURSOR_SENSITIVITY`, architecture 6.5). Aucun réglage par joueur.
- Pendant un gel : les inputs du joueur sont ignorés, mais leur `seq` est enregistré comme traité. Le budget reste à 0 et la position ne change pas.

### 6.3 Toucher

- Un Chat touche un Coureur quand la distance entre leurs centres est inférieure ou égale à `TAG_DISTANCE`.
- Seuls peuvent toucher les Chats **non gelés et connectés**. Seuls peuvent être touchés les Coureurs **connectés**.
- **Résolution dans un tick :**
  1. Les Chats sont traités par ordre croissant de `playerId`.
  2. Pour chaque Chat, parmi les Coureurs touchables à portée, le plus proche est touché. En cas de distance égale : le plus petit `playerId`.
  3. Un joueur qui a changé de rôle pendant ce tick ne peut plus toucher ni être touché avant le tick suivant.
- **Effet d'un toucher :**
  - le Coureur touché devient Chat et est gelé pendant `TAG_FREEZE_MS` ;
  - le Chat qui a touché devient Coureur, sans gel ;
  - événement `tag`.
- **Aucune protection après un toucher.** Dès que le nouveau Chat n'est plus gelé, il peut retoucher immédiatement l'ancien Chat, s'il est à portée.

### 6.4 Téléporteurs

- Deux paires de portails, `A` et `B` (positions en 6.5). Rayon : `PORTAL_RADIUS`.
- Un portail se déclenche quand un joueur **entre** dans son cercle : sa position avant le déplacement est hors du cercle, et le segment entre la position avant et la position après le déplacement passe à une distance du centre strictement inférieure à `PORTAL_RADIUS`.
- La vérification est faite après chaque input appliqué, pour tous les rôles.
- **Effet :**
  - le joueur est placé au centre de l'autre portail de la paire ;
  - la paire est inutilisable pour ce joueur pendant `PORTAL_COOLDOWN_MS` ;
  - événement `portal`.
- Un portail en recharge pour un joueur n'a aucun effet sur lui. Les autres joueurs ne sont pas concernés par sa recharge.
- Arriver par téléportation au centre d'un portail ne le déclenche pas : il faut en sortir puis y rentrer.

### 6.5 Carte

Arène de 1600 × 900 unités logiques, origine en haut à gauche. Carte unique, symétrique par rotation de 180° autour du centre.

**Murs** (`{ x, y, width, height }`)

| Mur                         | x    | y   | width | height |
| --------------------------- | ---- | --- | ----- | ------ |
| Pilier central              | 740  | 390 | 120   | 120    |
| Barre haut gauche           | 300  | 200 | 300   | 40     |
| Barre bas droite            | 1000 | 660 | 300   | 40     |
| Barre verticale haut droite | 1180 | 120 | 40    | 260    |
| Barre verticale bas gauche  | 380  | 520 | 40    | 260    |

**Portails** (centres)

| Paire | Portail 1   | Portail 2   |
| ----- | ----------- | ----------- |
| A     | (120, 120)  | (1480, 780) |
| B     | (1480, 120) | (120, 780)  |

**Points d'apparition** (10, centres)

(800, 160), (800, 740), (220, 450), (1380, 450), (560, 120), (1040, 780), (1040, 120), (560, 780), (560, 450), (1040, 450)

Ces valeurs vont dans `games/cursor-tag/shared/map.ts`.

### 6.6 Ordre de résolution d'un tick

Avant `tick(dt)`, la room applique les inputs dans leur ordre d'arrivée. Chaque input passe par `moveCursor`, puis par la vérification des portails. Ensuite, `tick(dt)` exécute dans l'ordre :

Pendant la pause entre deux manches, les inputs sont ignorés (leur `seq` est enregistré comme traité). `tick(dt)` décrémente seulement le compte à rebours s'il est lancé, et démarre la manche suivante quand il atteint 0.

Pendant une manche :

1. décrémenter de `dt` le temps restant de la manche, les gels et les recharges de portails (minimum 0) ;
2. ajouter `dt` au score de chaque Coureur connecté ;
3. résoudre les touchers (6.3) ;
4. recharger le budget de déplacement de chaque joueur non gelé (formule architecture 6.5), pour les inputs du tick suivant ;
5. si le temps restant de la manche vaut 0, terminer la manche (section 4).

## 7. Score et classement

- Le score est un nombre de millisecondes passées en tant que Coureur connecté.
- Les scores des manches s'additionnent.
- `getRanking()` renvoie les joueurs non retirés, triés par score décroissant.
- La conversion en points cumulés suit `docs/architecture.md`, section 5.6.

## 8. Ce que chacun voit

Toutes les informations du jeu sont publiques : pas d'information cachée.

```ts
type CursorTagView = {
  phase: "round" | "intermission";
  round: number; // manche en cours, ou manche qui vient de se terminer pendant la pause
  roundTimeLeftMs: number; // 0 pendant la pause
  readyPlayerIds: string[]; // vide pendant une manche
  nextRoundCountdownMsLeft: number | null; // null sauf pendant le compte à rebours de la pause
  players: Array<{
    playerId: string;
    x: number;
    y: number;
    role: "chat" | "runner";
    frozenMsLeft: number; // 0 si non gelé
    connected: boolean;
    scoreMs: number;
  }>;
  me: {
    // null pour un spectateur
    lastProcessedSeq: number;
    budget: number;
    portalCooldownMs: { A: number; B: number };
  } | null;
};
```

- Les murs, portails et points d'apparition ne sont pas envoyés : le client les lit dans `shared/map.ts`.
- La mise en page (HUD, apparence du Chat, du gel et des portails) est définie par le design system.

## 9. Événements (`game:event`)

| Événement            | Payload                          | Moment                                             |
| -------------------- | -------------------------------- | -------------------------------------------------- |
| `roundStart`         | `{ round, chatIds }`             | Début d'une manche                                 |
| `roundEnd`           | `{ round }`                      | Fin d'une manche                                   |
| `tag`                | `{ chatId, taggedId }`           | Un Coureur est touché                              |
| `portal`             | `{ playerId, pair: "A" \| "B" }` | Un joueur est téléporté                            |
| `chatReplaced`       | `{ previousChatId, newChatId }`  | Un Chat déconnecté est remplacé                    |
| `playerReady`        | `{ playerId }`                   | Un joueur clique sur « Prêt » pendant la pause     |
| `nextRoundCountdown` | `{ round, forcedByHost }`        | Début du compte à rebours avant la manche suivante |

Tous les événements sont envoyés à toute la room.

## 10. Input et actions

- **Input** (`game:input`) : `{ seq, dx, dy }`, schéma défini dans `docs/architecture.md`, section 6.5.
- **Actions** (`game:action`) : `{ type: "ready" }` ou `{ type: "forceStart" }`. Schéma Zod : union discriminée sur `type`, objets stricts.

## 11. Déconnexion, reconnexion, départ

- **Un Chat se déconnecte :** un Coureur connecté est immédiatement tiré au sort avec `ctx.random` pour le remplacer. Le remplaçant devient Chat **sans gel**. Le joueur déconnecté devient Coureur. Événement `chatReplaced`. S'il n'existe aucun Coureur connecté, il n'y a pas de remplacement.
- **Un Coureur se déconnecte :** son curseur reste à sa position mais n'est pas dessiné par les clients (`connected: false` dans la vue). Il ne peut pas être touché, et son score est en pause jusqu'à son retour.
- **Reconnexion :** le joueur retrouve sa position, son rôle actuel et son score. Son `lastProcessedSeq` repart à −1 (architecture 6.5). Si la partie est en pause, il voit le bouton « Prêt ».
- **Retrait :** le joueur est supprimé de la partie et n'apparaît plus dans la vue ni dans le classement. Si le nombre de joueurs passe sous `MIN_PLAYERS`, la partie est abandonnée (architecture 5.2).

## 12. Bot

À chaque tick, pour un bot non gelé :

- **Chat :** direction vers le Coureur connecté le plus proche.
- **Coureur :** direction opposée au Chat non gelé le plus proche. S'il n'y en a aucun : direction aléatoire, changée toutes les `BOT_WANDER_CHANGE_MS`.
- Un angle aléatoire compris entre −`BOT_JITTER_RAD` et +`BOT_JITTER_RAD` est ajouté à la direction.
- L'input produit a pour longueur `vitesse maximale du rôle × dt / 1000`. Les murs sont gérés normalement par `moveCursor`.

## 13. Tests à écrire (`logic/`)

- Toucher à `TAG_DISTANCE` exactement, et absence de toucher à `TAG_DISTANCE + 1`.
- Échange des rôles, gel du nouveau Chat, absence de gel pour l'ancien Chat.
- Deux Chats à portée du même Coureur dans le même tick : un seul toucher, attribué au plus petit `playerId`.
- Un joueur ayant changé de rôle dans le tick ne touche pas et n'est pas touché.
- Absence de protection : un nouveau Chat dégelé retouche immédiatement l'ancien Chat à portée.
- Nombre de Chats au début d'une manche : borné par `chatCount`, P − 1 et C − 1, avec un minimum de 1.
- `normalizeOptions` : valeur trop haute ramenée à « joueurs − 1 », valeur inférieure à 1 ramenée à 1.
- Gel des Chats au début d'une manche, Coureurs libres.
- Coureur déconnecté : non touchable, score en pause.
- Pause : inputs ignorés, action `ready` enregistrée, `ready` et `forceStart` hors de l'étape attente refusées, `forceStart` d'un non-hôte refusé avec `NOT_HOST`.
- Joueur prêt qui se déconnecte : retiré de `readyPlayerIds`. À sa reconnexion pendant l'attente, il n'est pas prêt et bloque le démarrage jusqu'à son clic.
- Compte à rebours déclenché quand tous les connectés sont prêts, non déclenché s'il manque un joueur connecté, déclenché quand le seul joueur non prêt se déconnecte, déclenché par `forceStart`.
- Manche suivante lancée à la fin du compte à rebours, avec le gel des Chats.
- Plus aucun Coureur après un retrait : fin de manche immédiate, puis pause ou fin de partie.
- Tirage des Chats avec moins de joueurs connectés que de Chats : complément parmi les déconnectés.
- Un Chat gelé ne touche pas. Un joueur gelé ne bouge pas.
- Score : un Coureur connecté gagne `dt`, un Chat et un Coureur déconnecté ne gagnent rien.
- Portails : entrée qui déclenche, traversée rapide qui déclenche, recharge qui bloque, arrivée au centre qui ne déclenche pas.
- Vitesse différente entre Chat et Coureur.
- Remplacement d'un Chat déconnecté.
- Enchaînement des manches et fin de partie après `ROUNDS` manches.
- `getRanking()` trié par score décroissant.

## 14. Constantes (`shared/constants.ts`)

| Constante                   | Valeur                               |
| --------------------------- | ------------------------------------ |
| `MIN_PLAYERS`               | `3`                                  |
| `MAX_PLAYERS`               | `10`                                 |
| `ROUNDS`                    | `3`                                  |
| `ROUND_DURATION_MS`         | `60000`                              |
| `CURSOR_RADIUS`             | `14`                                 |
| `RUNNER_MAX_SPEED`          | `1000` (unités logiques par seconde) |
| `CHAT_SPEED_MULTIPLIER`     | `1.15`                               |
| `TAG_DISTANCE`              | `28`                                 |
| `TAG_FREEZE_MS`             | `3000`                               |
| `ROUND_START_FREEZE_MS`     | `3000`                               |
| `INTERMISSION_COUNTDOWN_MS` | `3000`                               |
| `DEFAULT_CHAT_COUNT`        | `1`                                  |
| `PORTAL_RADIUS`             | `36`                                 |
| `PORTAL_COOLDOWN_MS`        | `2000`                               |
| `BOT_WANDER_CHANGE_MS`      | `1000`                               |
| `BOT_JITTER_RAD`            | `0.3`                                |

Vitesses, rayons et durées sont des valeurs de départ, à ajuster après le test avec le groupe en modifiant ce tableau.

## 15. À DÉCIDER

Aucun point en attente.
