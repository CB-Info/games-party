# Cursor Tag — fiche de jeu

> Aucun point **À DÉCIDER** ne doit subsister avant de coder la partie concernée.
> Le moteur curseur commun (Pointer Lock, inputs, `moveCursor`, prédiction, interpolation) est décrit dans `docs/architecture.md`, section 6.5.

## 1. Pitch

Un ou plusieurs joueurs sont le **Chat** et doivent toucher les curseurs des autres. Le joueur touché est gelé quelques secondes puis devient Chat à son tour. Le but : passer le plus de temps possible sans être Chat.

## 2. Identité technique

| Champ | Valeur |
|---|---|
| `id` | `cursor-tag` |
| Nom affiché | `Cursor Tag` |
| Joueurs minimum | `MIN_PLAYERS` (3) |
| Joueurs maximum | `MAX_PLAYERS` (10) |

## 3. Options réglables par l'hôte

Toutes les options sont des nombres entiers, modifiés par l'hôte avec des boutons − et +. Chaque clic ajoute ou retire un pas.

| Option | Clé | Minimum | Maximum | Pas | Défaut |
|---|---|---|---|---|---|
| Nombre de Chats | `chatCount` | `1` | nombre de joueurs − 1 | `1` | `1` |
| Nombre de manches | `roundCount` | `1` | `5` | `1` | `3` |
| Durée d'une manche (secondes) | `roundDurationS` | `30` | `120` | `15` | `60` |
| Durée du gel (secondes) | `freezeDurationS` | `1` | `5` | `1` | `3` |

- **Nombre de Chats :** il faut toujours au moins un Chat et au moins un Coureur. Exemple : à 5 joueurs, de 1 à 4 Chats. Avec 2 joueurs, la seule valeur possible est 1.
- **Durée du gel :** elle s'applique aux deux gels du jeu, le gel d'un joueur touché (6.3) et le gel des Chats au début de chaque manche (section 4).
- **`normalizeOptions`**, appliquée à chaque réception d'options et à chaque changement du nombre de joueurs :
  - une valeur inférieure au minimum est ramenée au minimum, une valeur supérieure au maximum est ramenée au maximum ;
  - une valeur qui ne tombe pas sur un pas est ramenée à la valeur valide la plus proche (ex. : 70 secondes → 75), en cas d'égalité à la valeur inférieure ;
  - `chatCount` est recalculé avec le nombre de joueurs actuel (ex. : un joueur quitte le lobby et 4 Chats deviennent trop nombreux).
- Les options choisies sont conservées par la room quand l'hôte change de jeu puis revient à Cursor Tag (architecture 5.3).

## 4. Déroulé d'une partie

- La partie compte `roundCount` manches de `roundDurationS` secondes chacune.
- **Chaque manche est précédée d'une phase de préparation** (section 4.1), y compris la première : dès que la room passe en `PLAYING`, la partie commence par la préparation de la manche 1.
- **Début de chaque manche**, à la fin du compte à rebours de la préparation :
  1. Les points d'apparition (section 6.5) sont mélangés avec `ctx.random`, puis attribués aux joueurs.
  2. Nombre de Chats de la manche : `max(1, min(chatCount, P − 1, C − 1))`, où P est le nombre de joueurs non retirés et C le nombre de joueurs connectés.
  3. Les Chats sont tirés au sort avec `ctx.random` parmi les joueurs connectés. S'il y a moins de joueurs connectés que de Chats à tirer, le complément est tiré parmi les joueurs déconnectés. Aucun joueur n'est exclu du tirage : le Chat de la manche précédente peut être tiré à nouveau. Les autres joueurs sont Coureurs.
  4. Pour chaque joueur : budget de déplacement à 0, recharges de portails à 0, compteur `lastProcessedSeq` conservé.
  5. Chaque Chat est gelé pendant `freezeDurationS` secondes. Les Coureurs peuvent bouger immédiatement.
  6. Le temps restant de la manche passe à `roundDurationS` secondes. Événement `roundStart`.
- **Fin de manche** quand le temps restant atteint 0 : événement `roundEnd`.
  - Après la dernière manche, `isOver()` renvoie `true` et la room passe aux résultats.
  - Sinon, la partie passe à la **phase de préparation** de la manche suivante (section 4.1).
- **Plus aucun Coureur :** si, après le retrait d'un joueur, la partie n'est pas abandonnée (architecture 5.2) mais qu'il ne reste aucun Coureur non retiré, la manche se termine immédiatement. Les scores sont conservés, l'événement `roundEnd` est envoyé, puis la partie passe à la préparation de la manche suivante, ou aux résultats si c'était la dernière manche. La manche suivante recalcule le nombre de Chats (étape 2), ce qui garantit au moins un Coureur.

### 4.1 Phase de préparation

- **Ce que voient les joueurs :** l'arène avec ses murs et ses portails, sans aucun curseur. Personne ne peut bouger ni toucher, et les scores ne changent pas.
  - Avant la manche 1 : un rappel des réglages de la partie (nombre de manches, durée d'une manche, nombre de Chats, durée du gel), lu dans les options du jeu de `room:state`.
  - Avant les manches suivantes : les scores provisoires, à la place du rappel.
- À la fin d'une manche, le client libère la souris (`document.exitPointerLock()`).
- La préparation commence dans l'étape **attente**, et le délai de départ automatique de `PREPARATION_AUTO_START_MS` démarre. Ce délai n'est jamais remis à zéro pendant la préparation, ni par une déconnexion, ni par une reconnexion.
- **Se déclarer prêt :** chaque joueur voit le bouton « Je suis prêt ». Le clic demande la capture de la souris (Pointer Lock). Quand la capture est obtenue, le client envoie l'action `{ type: "ready" }`. Si la capture échoue, rien n'est envoyé.
- **Perdre la souris pendant l'attente** (Échap, changement de fenêtre) : le client envoie l'action `{ type: "notReady" }`. Le joueur n'est plus prêt et revoit le bouton.
- **Passage au compte à rebours**, dès que l'une de ces conditions est remplie :
  - au moins un joueur est connecté, et tous les joueurs connectés sont prêts ;
  - le délai de départ automatique atteint 0.
- La condition « tous prêts » est vérifiée après chaque action `ready`, chaque déconnexion et chaque retrait. Un joueur déconnecté ne bloque donc jamais le démarrage.
- **Compte à rebours :** il dure `PREPARATION_COUNTDOWN_MS`, ne peut pas être annulé et envoie l'événement `preparationCountdown`. À 0, la manche démarre (section 4, étapes 1 à 6). Les joueurs qui n'étaient pas prêts démarrent sans souris capturée : ils voient l'écran « Clique pour reprendre » (architecture 6.5) et peuvent cliquer à tout moment.
- **Déconnexion pendant l'attente :** le joueur perd son statut « prêt ». Tant qu'il est déconnecté, il ne bloque pas le démarrage.
- **Reconnexion pendant l'attente :** le joueur n'est pas prêt, même s'il avait cliqué avant sa déconnexion. Il voit le bouton, et le démarrage attend de nouveau son clic, dans la limite du délai de départ automatique.
- **Reconnexion pendant le compte à rebours :** le joueur rejoint simplement la manche.
- Les bots envoient l'action `ready` dès le début de la préparation.
- **Validation des actions :**
  - `ready` ou `notReady` hors de l'étape attente : `INVALID_STATE` ;
  - `ready` d'un joueur déjà prêt, ou `notReady` d'un joueur non prêt : acceptée, sans effet.

## 5. Contrôles

- Le joueur ne contrôle que son curseur virtuel (voir architecture 6.5).
- Pendant une manche, le clic ne sert qu'à capturer la souris (Pointer Lock). Aucune touche du clavier n'est utilisée.
- Pendant la préparation, le joueur clique sur le bouton « Je suis prêt » (section 4.1).

## 6. Règles

### 6.1 Rôles

| Rôle | Description |
|---|---|
| **Chat** | Doit toucher un Coureur. Ne marque aucun point. |
| **Coureur** | Doit éviter les Chats. Marque des points tant qu'il est Coureur et connecté. |

Un joueur **gelé** ne peut pas bouger. Seul un Chat peut être gelé.

### 6.2 Déplacement

- Rayon du curseur : `CURSOR_RADIUS`.
- Vitesse maximale d'un Coureur : `RUNNER_MAX_SPEED`.
- Vitesse maximale d'un Chat : `RUNNER_MAX_SPEED × CHAT_SPEED_MULTIPLIER`. Elle s'applique dès qu'un joueur devient Chat, et la vitesse de Coureur dès qu'il redevient Coureur.
- Sensibilité commune à tous les joueurs (`CURSOR_SENSITIVITY`, architecture 6.5). Aucun réglage par joueur.
- Pendant un gel : les inputs du joueur sont ignorés, mais leur `seq` est enregistré comme traité. Le budget reste à 0 et la position ne change pas.

### 6.3 Toucher

> **En attente :** l'instant où la distance est testée (15.1) et les positions contre lesquelles elle l'est (15.2).

- Un Chat touche un Coureur quand la distance entre leurs centres est inférieure ou égale à `TAG_DISTANCE`.
- Seuls peuvent toucher les Chats **non gelés et connectés**. Seuls peuvent être touchés les Coureurs **connectés**.
- **Résolution dans un tick :**
  1. Les Chats sont traités par ordre croissant de `playerId`.
  2. Pour chaque Chat, parmi les Coureurs touchables à portée, le plus proche est touché. En cas de distance égale : le plus petit `playerId`.
  3. Un joueur qui a changé de rôle pendant ce tick ne peut plus toucher ni être touché avant le tick suivant.
- **Effet d'un toucher :**
  - le Coureur touché devient Chat et est gelé pendant `freezeDurationS` secondes ;
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

| Mur | x | y | width | height |
|---|---|---|---|---|
| Pilier central | 740 | 390 | 120 | 120 |
| Barre haut gauche | 300 | 200 | 300 | 40 |
| Barre bas droite | 1000 | 660 | 300 | 40 |
| Barre verticale haut droite | 1180 | 120 | 40 | 260 |
| Barre verticale bas gauche | 380 | 520 | 40 | 260 |

**Portails** (centres)

| Paire | Portail 1 | Portail 2 |
|---|---|---|
| A | (120, 120) | (1480, 780) |
| B | (1480, 120) | (120, 780) |

**Points d'apparition** (10, centres)

(800, 160), (800, 740), (220, 450), (1380, 450), (560, 120), (1040, 780), (1040, 120), (560, 780), (560, 450), (1040, 450)

Ces valeurs vont dans `games/cursor-tag/shared/map.ts`.

### 6.6 Ordre de résolution d'un tick

Avant `tick(dt)`, la room applique les inputs dans leur ordre d'arrivée. Chaque input passe par `moveCursor`, puis par la vérification des portails. Ensuite, `tick(dt)` exécute dans l'ordre :

Pendant la phase de préparation, les inputs sont ignorés (leur `seq` est enregistré comme traité). `tick(dt)` décrémente le délai de départ automatique pendant l'étape attente (et lance le compte à rebours quand il atteint 0), ou le compte à rebours pendant l'étape compte à rebours (et démarre la manche quand il atteint 0).

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
- **Classement en direct** (affiché pendant la partie) : trié par score exact en millisecondes, décroissant. À égalité, ordre alphabétique des pseudos (architecture 5.6). Le tri sur le score exact évite que des joueurs affichant le même nombre de secondes échangent leur place en boucle.
- La conversion en points cumulés suit `docs/architecture.md`, section 5.6.

## 8. Ce que chacun voit

Toutes les informations du jeu sont publiques : pas d'information cachée.

```ts
type CursorTagView = {
  phase: "preparation" | "round";
  preparationStep: "waiting" | "countdown" | null; // null pendant une manche
  round: number;               // manche en cours, ou manche à venir pendant la préparation (de 1 à roundCount)
  roundCount: number;          // nombre total de manches de la partie
  roundTimeLeftMs: number;     // 0 pendant la préparation
  readyPlayerIds: string[];    // vide pendant une manche
  autoStartMsLeft: number | null; // uniquement pendant l'étape attente
  countdownMsLeft: number | null; // uniquement pendant l'étape compte à rebours
  players: Array<{
    playerId: string;
    x: number;
    y: number;
    role: "chat" | "runner";
    frozenMsLeft: number;      // 0 si non gelé
    connected: boolean;
    scoreMs: number;
  }>;
  me: {                        // null pour un spectateur
    lastProcessedSeq: number;
    budget: number;
    portalCooldownMs: { A: number; B: number };
  } | null;
};
```

- Les murs, portails et points d'apparition ne sont pas envoyés : le client les lit dans `shared/map.ts`.
- La mise en page (HUD, apparence du Chat, du gel et des portails) est définie par le design system.

## 9. Événements (`game:event`)

| Événement | Payload | Moment |
|---|---|---|
| `roundStart` | `{ round, chatIds }` | Début d'une manche |
| `roundEnd` | `{ round }` | Fin d'une manche |
| `tag` | `{ chatId, taggedId }` | Un Coureur est touché |
| `portal` | `{ playerId, pair: "A" \| "B" }` | Un joueur est téléporté |
| `chatReplaced` | `{ previousChatId, newChatId }` | Un Chat déconnecté est remplacé |
| `readyChanged` | `{ playerId, ready }` | Un joueur se déclare prêt ou ne l'est plus pendant la préparation |
| `preparationCountdown` | `{ round, auto }` | Début du compte à rebours ; `auto: true` s'il est déclenché par le délai de départ automatique |

Tous les événements sont envoyés à toute la room.

## 10. Input et actions

- **Input** (`game:input`) : `{ seq, dx, dy }`, schéma défini dans `docs/architecture.md`, section 6.5.
- **Actions** (`game:action`) : `{ type: "ready" }` ou `{ type: "notReady" }`. Schéma Zod : union discriminée sur `type`, objets stricts.

## 11. Déconnexion, reconnexion, départ

- **Un Chat se déconnecte :** un Coureur connecté est immédiatement tiré au sort avec `ctx.random` pour le remplacer. Le remplaçant devient Chat **sans gel**. Le joueur déconnecté devient Coureur. Événement `chatReplaced`. S'il n'existe aucun Coureur connecté, il n'y a pas de remplacement.
- **Un Coureur se déconnecte :** son curseur reste à sa position mais n'est pas dessiné par les clients (`connected: false` dans la vue). Il ne peut pas être touché, et son score est en pause jusqu'à son retour.
- **Reconnexion :** le joueur retrouve sa position, son rôle actuel et son score. Son `lastProcessedSeq` repart à −1 (architecture 6.5). Si la partie est en préparation (étape attente), il voit le bouton « Je suis prêt ».
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
- `normalizeOptions` pour chaque option : valeur sous le minimum, au-dessus du maximum, hors pas (70 → 75, 67 → 60 pour la durée de manche), `chatCount` recalculé quand le nombre de joueurs baisse.
- `freezeDurationS` appliqué au gel d'un joueur touché et au gel des Chats en début de manche.
- `normalizeOptions` : valeur trop haute ramenée à « joueurs − 1 », valeur inférieure à 1 ramenée à 1.
- Gel des Chats au début d'une manche, Coureurs libres.
- Coureur déconnecté : non touchable, score en pause.
- La partie commence par la préparation de la manche 1, sans curseur.
- Préparation : inputs ignorés, actions `ready` et `notReady` enregistrées, actions hors de l'étape attente refusées.
- Joueur prêt qui se déconnecte : retiré de `readyPlayerIds`. À sa reconnexion pendant l'attente, il n'est pas prêt et bloque le démarrage jusqu'à son clic.
- Compte à rebours déclenché quand tous les connectés sont prêts, non déclenché s'il manque un joueur connecté, déclenché quand le seul joueur non prêt se déconnecte, déclenché à la fin du délai de départ automatique (`auto: true`).
- Délai de départ automatique non remis à zéro par une déconnexion ou une reconnexion.
- Manche suivante lancée à la fin du compte à rebours, avec le gel des Chats.
- Plus aucun Coureur après un retrait : fin de manche immédiate, puis préparation de la manche suivante ou fin de partie.
- Tirage des Chats avec moins de joueurs connectés que de Chats : complément parmi les déconnectés.
- Un Chat gelé ne touche pas. Un joueur gelé ne bouge pas.
- Score : un Coureur connecté gagne `dt`, un Chat et un Coureur déconnecté ne gagnent rien.
- Portails : entrée qui déclenche, traversée rapide qui déclenche, recharge qui bloque, arrivée au centre qui ne déclenche pas.
- Vitesse différente entre Chat et Coureur.
- Remplacement d'un Chat déconnecté.
- Enchaînement des manches et fin de partie après `roundCount` manches.
- Durée de manche égale à `roundDurationS`.
- `getRanking()` trié par score décroissant.

## 14. Constantes (`shared/constants.ts`)

| Constante | Valeur |
|---|---|
| `MIN_PLAYERS` | `3` |
| `MAX_PLAYERS` | `10` |
| `CURSOR_RADIUS` | `14` |
| `RUNNER_MAX_SPEED` | `1000` (unités logiques par seconde) |
| `CHAT_SPEED_MULTIPLIER` | `1.15` |
| `TAG_DISTANCE` | `28` |
| `PREPARATION_COUNTDOWN_MS` | `3000` |
| `PREPARATION_AUTO_START_MS` | `20000` |
| `CHAT_COUNT_MIN` / `CHAT_COUNT_DEFAULT` / `CHAT_COUNT_STEP` | `1` / `1` / `1` |
| `ROUND_COUNT_MIN` / `ROUND_COUNT_MAX` / `ROUND_COUNT_DEFAULT` / `ROUND_COUNT_STEP` | `1` / `5` / `3` / `1` |
| `ROUND_DURATION_S_MIN` / `ROUND_DURATION_S_MAX` / `ROUND_DURATION_S_DEFAULT` / `ROUND_DURATION_S_STEP` | `30` / `120` / `60` / `15` |
| `FREEZE_DURATION_S_MIN` / `FREEZE_DURATION_S_MAX` / `FREEZE_DURATION_S_DEFAULT` / `FREEZE_DURATION_S_STEP` | `1` / `5` / `3` / `1` |
| `PORTAL_RADIUS` | `36` |
| `PORTAL_COOLDOWN_MS` | `2000` |
| `BOT_WANDER_CHANGE_MS` | `1000` |
| `BOT_JITTER_RAD` | `0.3` |

Vitesses, rayons et durées sont des valeurs de départ, à ajuster après le test avec le groupe en modifiant ce tableau.

## 15. À DÉCIDER

Trois points relevés à l'étape 3b, en éprouvant le moteur curseur dans le bac à sable. Les deux premiers ne dépendent pas de la valeur de `RUNNER_MAX_SPEED` : ils existent déjà à la valeur actuelle et s'aggravent quand elle monte. Le troisième est cette valeur elle-même. Tous sont à trancher avant ou pendant l'étape 4.

### 15.1 Toucher manqué entre deux ticks

- **Le problème.** Le toucher (6.3) compare la distance entre les centres une fois par tick, sur les positions de fin de tick. Deux curseurs qui se croisent peuvent donc se chevaucher entre deux ticks sans jamais se chevaucher à un tick. À `RUNNER_MAX_SPEED` = 1000 et `CHAT_SPEED_MULTIPLIER` = 1,15, un Chat et un Coureur face à face se rapprochent de 72 unités par tick, alors que la zone de toucher mesure au plus 56 unités de long (2 × `TAG_DISTANCE`).
- **L'ampleur.** Parmi les passages où les disques se chevauchent vraiment, le serveur n'en voit pas 39 % de face et 16 % à angle droit ; en poursuite, aucun ne lui échappe. À 2000, 69 % de face. Calculé à l'étape 3b en échantillonnant, aux instants des ticks, des passages en ligne droite de décalage et de phase aléatoires. À l'écran, les joueurs voient pourtant les disques se traverser : les autres curseurs y sont interpolés entre deux vues (architecture 6.5).
- **La piste.** Tester le segment parcouru pendant le tick, comme le font déjà les portails (6.4) : la plus petite distance entre les deux curseurs quand chacun va en ligne droite de sa position de début de tick à celle de fin.
- **À décider :** ce test ; le Coureur retenu quand plusieurs sont à portée sur le segment (6.3 prend aujourd'hui le plus proche en fin de tick) ; le cas d'un joueur téléporté pendant le tick, dont le trajet fait alors deux segments.

### 15.2 Retard d'affichage des autres curseurs

- **Le problème.** Un joueur voit les autres curseurs `INTERPOLATION_DELAY_MS` dans le passé, plus le temps de trajet de la vue. Son propre curseur, prédit, est en avance sur le serveur du temps de trajet de ses inputs (architecture 6.5). Le serveur, lui, décide du toucher sur ses propres positions.
- **L'ampleur.** En poursuite, l'écart entre ce que voit le Chat et ce que sait le serveur vaut `vitesse × (INTERPOLATION_DELAY_MS + trajet de la vue + CHAT_SPEED_MULTIPLIER × trajet des inputs)`. Pour 50 ms d'aller-retour, cela fait 154 unités à 1000, soit 5,5 × `TAG_DISTANCE`. Le Chat voit son curseur au contact du Coureur, puis devant lui, pendant environ une seconde avant que le serveur n'accorde le toucher. Cette durée ne dépend pas de la vitesse, puisque l'écart et le rattrapage grandissent ensemble. Calcul tiré des formules de l'architecture 6.5 à l'étape 3b ; ce n'est pas une mesure.
- **Les pistes.** La compensation de latence : le serveur teste le toucher contre les positions que le Chat voyait, en remontant le temps de son retard, ce qui demande un historique des positions et une estimation du retard de chaque joueur. Réduire `INTERPOLATION_DELAY_MS`, au risque de saccades quand une vue arrive en retard. Ou les deux.
- **À décider :** la piste retenue, et ce qui reste acceptable pour le Coureur, qui peut alors être touché alors que, sur son écran, le Chat est encore derrière lui.

### 15.3 Vitesse maximale et rattrapage

- **Le problème.** À `RUNNER_MAX_SPEED` = 1000, un geste plus rapide que le plafond arrive court. Le bac à sable permet d'essayer d'autres vitesses et un mode « rattrapage », où ce que le budget refuse est gardé, dans une limite, puis payé ensuite (architecture 6.5). Mais le bon réglage dépend d'une vraie poursuite, avec un Chat, des portails et un gel. Les mesures de l'étape 3b, faites au trackpad, ne suffisent pas à fixer une règle de jeu.
- **À décider à l'étape 4, en partie réelle :** la valeur de `RUNNER_MAX_SPEED`, et l'adoption ou non du rattrapage pour Cursor Tag.
- **Si le rattrapage est retenu :**
  - le reste est remis à zéro au gel, à la téléportation par un portail, au début de chaque manche et à la reconnexion — sinon un joueur dégelé ou téléporté reprendrait un geste d'avant ;
  - le tick paie le reste **avant** de recharger le budget, pour que la borne de l'architecture 9 reste celle d'aujourd'hui.