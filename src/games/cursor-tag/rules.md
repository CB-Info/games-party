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
| Description (carte de jeu) | « Un jeu du chat à la souris. Esquive, prends les portails, ne te fais pas toucher. » |
| Joueurs minimum | `MIN_PLAYERS` (3) |
| Joueurs maximum | `MAX_PLAYERS` (10) |

## 3. Options réglables par l'hôte

Toutes les options sont des nombres entiers, modifiés par l'hôte avec des boutons − et +. Chaque clic ajoute ou retire un pas.

| Option | Clé | Minimum | Maximum | Pas | Défaut |
|---|---|---|---|---|---|
| Nombre de Chats | `chatCount` | `1` | nombre de joueurs − 1, et au moins 1 | `1` | `1` |
| Nombre de manches | `roundCount` | `1` | `5` | `1` | `3` |
| Durée d'une manche (secondes) | `roundDurationS` | `30` | `120` | `15` | `60` |
| Durée du gel (secondes) | `freezeDurationS` | `1` | `5` | `1` | `3` |

- **Nombre de Chats :** il faut toujours au moins un Chat et au moins un Coureur. Exemple : à 5 joueurs, de 1 à 4 Chats. Avec 2 joueurs, la seule valeur possible est 1. Avec un seul joueur, l'hôte seul dans le lobby, le maximum reste 1 : il faut toujours au moins un Chat, et la partie ne peut de toute façon pas démarrer sous `MIN_PLAYERS`.
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
  2. Nombre de Chats de la manche : `max(1, min(chatCount, C − 1))`, où C est le nombre de joueurs connectés.
  3. Les Chats sont tirés au sort avec `ctx.random` parmi les joueurs connectés. S'il y a moins de joueurs connectés que de Chats à tirer, le complément est tiré parmi les joueurs déconnectés. Aucun joueur n'est exclu du tirage : le Chat de la manche précédente peut être tiré à nouveau. Les autres joueurs sont Coureurs.
  4. Pour chaque joueur : budget de déplacement à 0, reste du rattrapage à 0 (6.2), recharges de portails à 0, compteur `lastProcessedSeq` conservé. Sa position de début de tick est son point d'apparition (6.3).
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
- **Déconnexion pendant l'attente :** le joueur perd son statut « prêt », avec l'événement `readyChanged { ready: false }` s'il était prêt. Tant qu'il est déconnecté, il ne bloque pas le démarrage.
- **Retrait pendant l'attente :** un joueur prêt qui est retiré (11) quitte la liste des joueurs prêts sans événement `readyChanged` : il n'est plus joueur.
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
- **Rattrapage** (architecture 6.5, décision provisoire 15.3) : chaque déplacement passe par `moveWithBacklog`, avec une laisse de `CATCH_UP_MS` millisecondes de trajet à la vitesse du rôle. À 0, sa valeur de départ, c'est exactement `moveCursor` : ce que le budget refuse est perdu. Au-dessus de 0, ce que le budget refuse est gardé comme un **reste**, dans la limite de la laisse, et payé ensuite (6.6).
  - Le reste est remis à zéro au gel, à la téléportation par un portail, au début de chaque manche et à chaque reconnexion, reprise de place comprise. Sinon un joueur dégelé, téléporté ou revenu reprendrait un geste d'avant.
  - Au changement de rôle sans gel (le Chat qui vient de toucher, le remplaçant d'un Chat déconnecté ou retiré), le reste est gardé. Sa laisse suit la nouvelle vitesse : un reste devenu trop long est ramené à la nouvelle laisse à son prochain déplacement.
- Pendant un gel : les inputs du joueur sont ignorés, mais leur `seq` est enregistré comme traité. Le budget et le reste restent à 0 et la position ne change pas.

### 6.3 Toucher

- Un Chat touche un Coureur quand, pendant un tick, la distance entre leurs centres descend à `TAG_DISTANCE` ou moins. Pourquoi un test sur tout le tick plutôt qu'en fin de tick : section 15.1.
- **Trajet pendant un tick :** chaque joueur va en ligne droite, à vitesse constante, de sa position de début de tick à sa position de fin de tick, et tous parcourent leur trajet au même rythme. Le test cherche le premier instant où les deux centres sont à `TAG_DISTANCE` ou moins, les deux joueurs avançant ensemble. Ce n'est pas la distance entre deux traits immobiles : deux trajets qui se croisent à des moments différents du tick ne se touchent pas.
- **Position de début de tick :** la position de fin du tick précédent ; au début d'une manche, le point d'apparition ; après une téléportation, le centre du portail d'arrivée. **Seul le trajet après le portail compte** : atteindre le portail, c'est passer.
- **Rembobinage** (`TAG_REWIND_TICKS`, décision provisoire 15.2) : le trajet du Chat est celui du tick en cours, celui du Coureur est le sien d'il y a `TAG_REWIND_TICKS` ticks. À 0, sa valeur de départ, les deux trajets sont ceux du tick en cours.
  - Le rembobinage ne remonte jamais avant le dernier des événements suivants, pour l'un ou l'autre des deux joueurs : une téléportation, un changement de rôle, la fin d'un gel, le début de la manche, une reconnexion (reprise de place comprise). Le rembobinage n'utilise jamais un trajet commencé avant l'événement.
  - Le Coureur touché est gelé là où il se trouve à la fin du tick, pas à sa position rembobinée.
- Seuls peuvent toucher les Chats **non gelés et connectés**. Seuls peuvent être touchés les Coureurs **connectés**. Ces états sont lus une seule fois, au moment de résoudre les touchers (6.6), et valent pour tout le tick.
- **Résolution dans un tick :**
  1. Tous les contacts du tick (un Chat, un Coureur, l'instant de leur premier contact) sont rangés du plus tôt au plus tard. À instant égal, leur ordre est tiré avec `ctx.random`.
  2. Ils sont appliqués dans cet ordre. Un Chat touche ainsi le premier Coureur qu'il rencontre, et un Coureur atteint par plusieurs Chats est touché par le premier.
  3. Un joueur qui a changé de rôle pendant ce tick ne peut plus toucher ni être touché avant le tick suivant : tout contact qui le concerne est sauté. Seuls comptent les rôles échangés par les touchers de ce tick : le remplaçant d'un Chat déconnecté ou retiré (11), qui change de rôle entre deux ticks, peut toucher dès le tick suivant.
- **Effet d'un toucher :**
  - le Coureur touché devient Chat et est gelé pendant `freezeDurationS` secondes ; son budget et son reste passent à 0 ;
  - le Chat qui a touché devient Coureur, sans gel ;
  - événement `tag`.
- **Aucune protection après un toucher.** Dès que le nouveau Chat n'est plus gelé, il peut retoucher immédiatement l'ancien Chat, s'il est à portée.

### 6.4 Téléporteurs

- Deux paires de portails, `A` et `B` (positions en 6.5). Rayon : `PORTAL_RADIUS`.
- Un portail se déclenche quand un joueur **entre** dans son cercle : sa position avant le déplacement est hors du cercle, et le segment entre la position avant et la position après le déplacement passe à une distance du centre strictement inférieure à `PORTAL_RADIUS`.
- La vérification est faite après chaque input appliqué et après le paiement du reste du rattrapage (6.6), pour tous les rôles.
- **Effet :**
  - le joueur est placé au centre de l'autre portail de la paire, qui devient sa position de début de tick (6.3) ;
  - son reste du rattrapage est remis à zéro ;
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

Avant `tick(dt)`, la room applique les inputs dans leur ordre d'arrivée. Chaque input passe par `moveWithBacklog` (6.2), puis par la vérification des portails. Ensuite, `tick(dt)` exécute dans l'ordre :

Pendant la phase de préparation, les inputs sont ignorés (leur `seq` est enregistré comme traité). `tick(dt)` décrémente le délai de départ automatique pendant l'étape attente (et lance le compte à rebours quand il atteint 0), ou le compte à rebours pendant l'étape compte à rebours (et démarre la manche quand il atteint 0).

Pendant une manche :

1. décrémenter de `dt` le temps restant de la manche, les gels et les recharges de portails (minimum 0) ;
2. payer le reste du rattrapage de chaque joueur connecté et non gelé, avec ce qui reste de son budget, puis vérifier les portails sur ce déplacement ;
3. ajouter au score de chaque Coureur connecté le temps de manche écoulé pendant ce tick : `dt`, ou seulement ce qu'il restait de la manche au dernier tick. Un surplus de quelques millisecondes ne doit jamais donner un point au classement en secondes entières (7) ;
4. résoudre les touchers (6.3), sur les trajets du tick, déplacement de l'étape 2 compris ;
5. recharger le budget de déplacement de chaque joueur non gelé (formule architecture 6.5), pour les inputs du tick suivant ;
6. retenir la position de chaque joueur comme position de début du tick suivant (6.3) ;
7. si le temps restant de la manche vaut 0, terminer la manche (section 4).

**Payer avant de recharger** : dans l'ordre inverse, un curseur resté immobile paierait son reste avec une réserve pleine plus une recharge fraîche, et irait une fois et demie plus loin qu'aujourd'hui au premier tick de son geste, ce qui déplacerait la borne de sécurité de l'architecture 9. **Payer avant les touchers** : sinon le trajet payé ne serait jamais testé, et la position testée ne serait pas celle que montre la vue. À `CATCH_UP_MS` = 0, l'étape 2 n'a jamais rien à payer.

## 7. Score et classement

- Le score est un nombre de millisecondes passées en tant que Coureur connecté.
- Les scores des manches s'additionnent.
- **Secondes affichées :** partout où un score s'affiche, c'est en secondes entières, arrondies à l'inférieur comme sur un chronomètre (« 42 s » de 42 000 à 42 999 ms).
- **Classement final : ce que les joueurs voient fait foi.** `getRanking()` renvoie les joueurs non retirés avec leur score en secondes entières affichées, triés par score décroissant. Deux joueurs à « 42 s » sont à égalité, avec la même place et les mêmes points (architecture 5.6), même si leurs millisecondes diffèrent.
- **Classement en direct** (affiché pendant la partie) : trié par score exact en millisecondes, décroissant. À égalité, ordre alphabétique des pseudos (architecture 5.6). Le tri sur le score exact évite que des joueurs affichant le même nombre de secondes échangent leur place en boucle. Il ne distribue rien : seul le classement final compte pour les places et les points.
- La conversion en points cumulés suit `docs/architecture.md`, section 5.6.

## 8. Ce que chacun voit

Toutes les informations du jeu sont publiques : pas d'information cachée.

### 8.1 Contenu

La vue, telle que le client et les bots la lisent, une fois décodée par `logic/readView.ts` :

```ts
type CursorTagView = PreparationView | RoundView;

type PreparationView = {
  phase: "preparation";
  round: number;                    // la manche à venir, de 1 à roundCount
  preparationStep: "waiting" | "countdown";
  autoStartMsLeft: number | null;   // uniquement pendant l'étape attente
  countdownMsLeft: number | null;   // uniquement pendant l'étape compte à rebours
  readyPlayerIds: string[];
  players: Array<{                  // aucun curseur pendant la préparation (4.1)
    playerId: string;
    connected: boolean;
    scoreMs: number;
  }>;
  me: Me | null;                    // null pour un spectateur
};

type RoundView = {
  phase: "round";
  round: number;                    // la manche en cours
  roundTimeLeftMs: number;
  players: Array<{
    playerId: string;
    x: number;
    y: number;
    role: "chat" | "runner";
    frozenMsLeft: number;           // 0 si non gelé
    connected: boolean;
    scoreMs: number;
  }>;
  me: Me | null;                    // null pour un spectateur
};

type Me = {
  lastProcessedSeq: number;
  budget: number;                   // 0 pendant la préparation
  portalCooldownMs: { A: number; B: number }; // sa propre recharge seulement (6.4)
  backlog: { x: number; y: number }; // reste du rattrapage (6.2), { 0, 0 } quand la vue n'en porte pas
};
```

- **Pendant la préparation**, chaque joueur n'a que sa connexion et son score : il n'y a aucun curseur à dessiner, et ce score sert aux scores provisoires (4.1).
- **Le nombre de manches** n'est pas dans la vue : il ne change pas pendant la partie, et le client le lit dans les options du jeu de `room:state`, comme le rappel des réglages (4.1).
- **Après la dernière manche, il n'y a plus de vue** : la room passe aux résultats dès que `isOver()` renvoie `true` (architecture 6.3), et plus rien ne la demande.
- Les murs, portails et points d'apparition ne sont pas envoyés : le client les lit dans `shared/map.ts`.
- **Rôle et gel des autres joueurs** : le client les dessine d'après les vues qui encadrent l'instant qu'il affiche (l'instant retardé de l'interpolation, architecture 6.5), et non d'après la dernière vue reçue. Chacun voit ainsi un Coureur devenir Chat là où le serveur l'a touché. Son propre rôle et son propre gel viennent de la dernière vue.
- La mise en page (HUD, apparence du Chat, du gel et des portails) est définie par le design system.

### 8.2 Vue compacte

Ce qui voyage réellement, écrit pour être petit (architecture 7) : des clés d'une ou deux lettres, et des tableaux de valeurs pour les joueurs. `logic/buildView.ts` la construit, `logic/readView.ts` la décode.

| Phase | Vue envoyée |
|---|---|
| Préparation, attente | `{ ph: 0, r, a, p: [[id, e, s], …], m }` |
| Préparation, compte à rebours | `{ ph: 0, r, c, p: [[id, e, s], …], m }` |
| Manche | `{ ph: 1, r, t, p: [[id, x, y, e, f, s], …], m }` |

| Clé | Contenu |
|---|---|
| `r` | `round` |
| `a` / `c` | `autoStartMsLeft` / `countdownMsLeft` : la clé présente donne l'étape de la préparation |
| `t` | `roundTimeLeftMs` |
| `id`, `x`, `y`, `f`, `s` | `playerId`, position, `frozenMsLeft`, `scoreMs` |
| `e` | état du joueur : 1 s'il est connecté, plus 2 s'il est Chat pendant une manche, ou prêt pendant la préparation. Ce bit remplace la liste `readyPlayerIds`, qui répéterait les identifiants. |
| `m` | `[lastProcessedSeq, budget, recharge A, recharge B]`, suivi de `backlog.x, backlog.y` seulement quand le reste n'est pas nul. Absent pour un spectateur. |

**Arrondis :**
- Millisecondes à l'entier. Le score reste en millisecondes : le classement en direct trie sur le score exact (7).
- Positions des autres joueurs à l'entier : ils sont interpolés, et une unité vaut moins d'un pixel.
- **Position du destinataire au dixième**, dans sa propre ligne de `p`, comme son budget et son reste : c'est de là que repart sa prédiction (architecture 6.5). Près d'un coin de mur, une position arrondie à l'entier peut chevaucher le mur, et la prédiction d'un curseur qui longe le pilier central se tromperait alors de 5 à 7 unités à un coin sur dix, voire sur cinq. Au dixième, c'est bien plus rare, pour 4 octets par vue.

## 9. Événements (`game:event`)

| Événement | Payload | Moment |
|---|---|---|
| `roundStart` | `{ round, chatIds }` | Début d'une manche |
| `roundEnd` | `{ round }` | Fin d'une manche |
| `tag` | `{ chatId, taggedId }` | Un Coureur est touché |
| `portal` | `{ playerId, pair: "A" \| "B" }` | Un joueur est téléporté |
| `chatReplaced` | `{ previousChatId, newChatId }` | Un Chat déconnecté ou retiré est remplacé (11) |
| `readyChanged` | `{ playerId, ready }` | Un joueur se déclare prêt ou ne l'est plus pendant la préparation |
| `preparationCountdown` | `{ round, auto }` | Début du compte à rebours ; `auto: true` s'il est déclenché par le délai de départ automatique |

Tous les événements sont envoyés à toute la room. Ceux d'un tick partent après les vues de ce tick (architecture 6.3).

## 10. Input et actions

- **Input** (`game:input`) : `{ seq, dx, dy }`, schéma défini dans `docs/architecture.md`, section 6.5.
- **Actions** (`game:action`) : `{ type: "ready" }` ou `{ type: "notReady" }`. Schéma Zod : union discriminée sur `type`, objets stricts.

## 11. Déconnexion, reconnexion, départ

- **Remplacement d'un Chat**, une seule règle pour la déconnexion et le retrait, pendant une manche : un Chat qui part est remplacé par un Coureur connecté tiré au sort, s'il reste au moins deux Coureurs connectés. Un départ a au plus un remplaçant. Le tirage se fait avec `ctx.random`, et le remplaçant devient Chat **sans gel**, avec l'événement `chatReplaced`. Un remplacement répare un départ : il ne prend jamais le dernier Coureur connecté, et n'ajoute jamais de Chats. Ni le nombre de Chats réglé ni celui du début de la manche n'ont besoin d'être vérifiés : un toucher échange un Chat contre un Coureur et un remplacement fait redevenir Coureur le Chat qu'il remplace, si bien qu'après un départ il reste toujours moins de Chats actifs qu'au début de la manche, qui n'en comptait pas plus que le nombre réglé.
  - 4 joueurs, 3 Chats (A, B, C) et un Coureur (D) ; A se déconnecte ou part : il reste un seul Coureur connecté ; pas de remplacement, B et C continuent de chasser D.
  - 5 joueurs, 2 Chats ; un Chat se déconnecte ou part : il reste 3 Coureurs connectés ; l'un d'eux est tiré au sort pour le remplacer.
  - 6 joueurs, 3 Chats réglés, mais seulement 3 joueurs connectés au début de la manche, qui a donc commencé avec 2 Chats (section 4) ; les autres reviennent, puis un Chat part : il reste 4 Coureurs connectés ; un seul remplaçant, et la manche garde ses 2 Chats.
  - 5 joueurs, 2 Chats (A et B) ; deux Coureurs se déconnectent, puis A : il reste un seul Coureur connecté ; A n'est pas remplacé. Les deux Coureurs reviennent, puis B se déconnecte : il reste 3 Coureurs connectés ; un seul remplaçant, celui de B. A reste Chat pendant son absence : il redevient un Chat actif à son retour, ou il est remplacé à son retrait, par la même règle.
- **Un Chat se déconnecte pendant une manche :** règle de remplacement ci-dessus. S'il est remplacé, il devient Coureur, sans gel s'il était gelé : seul un Chat peut l'être (6.1). S'il ne l'est pas, il reste Chat pendant son absence, sans pouvoir toucher, et redevient un Chat actif à son retour : se déconnecter ne permet pas d'échapper au rôle.
- **Pendant la préparation, personne n'est remplacé** : entre deux manches, personne n'a de rôle, et les Chats sont tirés au début de chaque manche (4).
- **Un Coureur se déconnecte :** son curseur reste à sa position mais n'est pas dessiné par les clients (`connected: false` dans la vue). Il ne peut pas être touché, et son score est en pause jusqu'à son retour.
- **Inputs d'un joueur déconnecté :** un input qui arrive encore après sa déconnexion enregistre son `seq` comme traité, sans déplacer son curseur.
- **Reconnexion :** le joueur retrouve sa position, son rôle actuel et son score. Son `lastProcessedSeq` repart à −1, son budget et son reste à 0 (architecture 6.5 et 7). Si la partie est en préparation (étape attente), il voit le bouton « Je suis prêt ».
- **Reprise de la place sans déconnexion**, par un second onglet ou par une reconnexion arrivée avant que le serveur ait constaté la coupure (architecture 4) : pour le jeu, c'est une reconnexion, et son `lastProcessedSeq` repart à −1, son budget et son reste à 0. Mais aucune déconnexion ne l'a précédée : les autres joueurs ne voient rien, et rien de ce qui arrive à un joueur qui se déconnecte ne s'applique — le Chat n'est pas remplacé, le score du Coureur continue, le statut prêt reste. Rouvrir un onglet ne doit offrir ni pause ni échappatoire.
- **Retrait :** le joueur est supprimé de la partie et n'apparaît plus dans la vue ni dans le classement : départ par « Quitter la room », bot retiré par l'hôte, ou fin du délai de reconnexion.
  - Si le nombre de joueurs passe sous `MIN_PLAYERS`, la partie est abandonnée (architecture 5.2), et rien d'autre ne se passe dans le jeu : ni remplacement, ni fin de manche, ni compte à rebours. Sinon un `roundEnd` ou un `preparationCountdown` partirait juste avant l'abandon.
  - **Un Chat retiré pendant une manche** est remplacé selon la règle de remplacement ci-dessus.

## 12. Bot

À chaque tick d'une manche, pour un bot non gelé :
- **Chat :** direction vers le Coureur connecté le plus proche. S'il n'y en a aucun : errance.
- **Coureur :** direction opposée au Chat non gelé et connecté le plus proche. Un Chat déconnecté est ignoré : il ne peut toucher personne (6.3). S'il n'y en a aucun : errance.
- **Errance :** direction aléatoire, changée toutes les `BOT_WANDER_CHANGE_MS`. Un bot ne garde aucune mémoire d'un tick à l'autre : la direction est tirée d'un mélange de son identifiant, de la manche et de la tranche de temps en cours, `floor(temps restant de la manche / BOT_WANDER_CHANGE_MS)`. Elle reste la même pendant toute la tranche et diffère d'un bot à l'autre.
- Un angle aléatoire compris entre −`BOT_JITTER_RAD` et +`BOT_JITTER_RAD` est ajouté à la direction.
- **Murs :** le bot vérifie ensuite que la direction est libre sur `BOT_LOOK_AHEAD` unités, murs et bords de l'arène compris. Sinon, il essaie les sept autres huitièmes de tour, en tournant toujours dans le même sens, et prend la première direction libre ; s'il n'en trouve aucune, il garde la sienne. L'angle aléatoire est ajouté avant cette vérification : une direction trouvée libre, puis décalée, pourrait repartir dans le mur.
- L'input produit a pour longueur `vitesse maximale du rôle × dt / 1000`. Il suit le même déplacement qu'un joueur (6.2), murs compris.
- Un bot gelé, ou hors d'une manche, n'envoie aucun input : il serait ignoré (6.2, 6.6). Pendant la préparation, il envoie l'action `ready` dès l'étape attente (4.1).

## 13. Tests à écrire (`logic/`)

- Toucher à `TAG_DISTANCE` exactement, et absence de toucher à `TAG_DISTANCE + 1`.
- Balayage : un croisement de face qui se chevauche entre deux ticks est touché ; un croisement décalé de `TAG_DISTANCE + 1` ne l'est pas ; deux trajets qui se croisent à des moments différents du tick ne le sont pas.
- Balayage : un Chat qui rencontre deux Coureurs dans le même tick touche le premier rencontré ; aucun toucher depuis la position de la manche précédente ; un contact sur le trajet d'avant un portail ne compte pas.
- Échange des rôles, gel du nouveau Chat (budget et reste à 0), absence de gel pour l'ancien Chat.
- Deux Chats qui atteignent le même Coureur dans le même tick : un seul toucher, attribué au premier qui l'atteint ; à instant égal, ordre tiré avec la source d'aléa fournie.
- Rembobinage à 0 : exactement les touchers du tick en cours. Rembobinage à 2 ticks : le Chat touche le trajet du Coureur d'il y a deux ticks ; le rembobinage s'arrête à une téléportation, à un changement de rôle, à la fin d'un gel, au début de la manche et à une reconnexion ; le Coureur touché est gelé à sa position de fin de tick.
- Rattrapage à 0 : exactement `moveCursor`. Rattrapage non nul : le reste est remis à zéro au gel, à la téléportation, au début de manche et à la reconnexion (reprise de place comprise) ; il est payé avant la recharge, donc jamais plus d'une réserve de budget en un tick ; un reste payé dans le tick peut déclencher un portail et un toucher ; un joueur gelé ou déconnecté ne paie rien ; au changement de rôle sans gel, le reste est gardé et ramené à la nouvelle laisse.
- Un joueur ayant changé de rôle dans le tick ne touche pas et n'est pas touché.
- Absence de protection : un nouveau Chat dégelé retouche immédiatement l'ancien Chat à portée.
- Nombre de Chats au début d'une manche : borné par `chatCount` et C − 1, avec un minimum de 1.
- `normalizeOptions` pour chaque option : valeur sous le minimum, au-dessus du maximum, hors pas (70 → 75, 67 → 60 pour la durée de manche), `chatCount` recalculé quand le nombre de joueurs baisse.
- `freezeDurationS` appliqué au gel d'un joueur touché et au gel des Chats en début de manche.
- `normalizeOptions` : valeur trop haute ramenée à « joueurs − 1 », valeur inférieure à 1 ramenée à 1, et 1 avec un seul joueur.
- Gel des Chats au début d'une manche, Coureurs libres.
- Coureur déconnecté : non touchable, score en pause.
- La partie commence par la préparation de la manche 1, sans curseur.
- Préparation : inputs ignorés, actions `ready` et `notReady` enregistrées, actions hors de l'étape attente refusées.
- Joueur prêt qui se déconnecte : retiré de `readyPlayerIds`, avec `readyChanged { ready: false }`. À sa reconnexion pendant l'attente, il n'est pas prêt et bloque le démarrage jusqu'à son clic.
- Compte à rebours déclenché quand tous les connectés sont prêts, non déclenché s'il manque un joueur connecté, déclenché quand le seul joueur non prêt se déconnecte, déclenché à la fin du délai de départ automatique (`auto: true`).
- Délai de départ automatique non remis à zéro par une déconnexion ou une reconnexion.
- Manche suivante lancée à la fin du compte à rebours, avec le gel des Chats.
- Plus aucun Coureur après un retrait : fin de manche immédiate, puis préparation de la manche suivante ou fin de partie.
- Retrait qui fait passer la partie sous `MIN_PLAYERS` : ni remplacement, ni fin de manche, ni compte à rebours.
- Tirage des Chats avec moins de joueurs connectés que de Chats : complément parmi les déconnectés.
- Un Chat gelé ne touche pas. Un joueur gelé ne bouge pas.
- Score : un Coureur connecté gagne `dt`, un Chat et un Coureur déconnecté ne gagnent rien ; au dernier tick d'une manche, seulement le temps qui restait.
- Un input qui arrive après la déconnexion de son joueur enregistre son `seq` sans le déplacer.
- Portails : entrée qui déclenche, traversée rapide qui déclenche, recharge qui bloque, arrivée au centre qui ne déclenche pas.
- Vitesse différente entre Chat et Coureur.
- Remplacement d'un Chat, par la même règle à la déconnexion et au retrait : les quatre exemples du §11 ; un seul remplaçant par départ ; jamais le dernier Coureur connecté ; pas de remplacement pendant la préparation ; le remplaçant peut toucher dès le tick suivant.
- Joueur prêt retiré pendant l'attente : il quitte `readyPlayerIds` sans `readyChanged`, et le compte à rebours démarre si tous les connectés restants sont prêts.
- Chat déconnecté remplacé : il devient Coureur, sans gel s'il était gelé. Non remplacé : il reste Chat, ne touche pas pendant son absence, et touche de nouveau à son retour.
- Enchaînement des manches et fin de partie après `roundCount` manches.
- Durée de manche égale à `roundDurationS`.
- `getRanking()` : scores en secondes entières arrondies à l'inférieur, triés par score décroissant ; deux joueurs à 42 100 et 42 900 ms sont à égalité (même place, mêmes points).

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
| `BOT_LOOK_AHEAD` | `90` (unités logiques) |
| `CATCH_UP_MS` | `0` (millisecondes de trajet à la vitesse du rôle ; 0 = pas de rattrapage) |
| `TAG_REWIND_TICKS` | `0` (ticks ; 0 = pas de rembobinage) |

Vitesses, rayons et durées sont des valeurs de départ, à ajuster après le test avec le groupe en modifiant ce tableau. `RUNNER_MAX_SPEED`, `CHAT_SPEED_MULTIPLIER`, `CATCH_UP_MS` et `TAG_REWIND_TICKS` sont en outre des décisions provisoires, comparées en partie réelle à la sous-étape 4e (sections 15.2 et 15.3). Les tests sont écrits contre ces constantes, jamais contre leurs valeurs, pour qu'en changer une ne demande que ce tableau.

## 15. Décisions de l'étape 4

Trois points relevés à l'étape 3b, en éprouvant le moteur curseur dans le bac à sable, et tranchés au début de l'étape 4. Le premier est définitif. Les deux autres sont **provisoires** : ils fixent la première version jouable, et des constantes permettent de comparer les autres options en partie réelle (sous-étape 4e), puis au test avec le groupe (étape 5), sans nouveau développement.

Les chiffres de cette section sont des calculs et des simulations faits au début de l'étape 4 à partir des formules de l'architecture 6.5, pas des mesures avec des joueurs. La sonde de développement de la sous-étape 4e les remplacera par des mesures.

### 15.1 Toucher entre deux ticks — décidé : balayage

- **Le problème.** Tester la distance une fois par tick, sur les positions de fin de tick, laisse passer deux curseurs qui se croisent entre deux ticks. À 1000 u/s, un Chat et un Coureur face à face se rapprochent de 72 unités par tick, alors que la zone de toucher mesure au plus 56 unités de long.
- **L'ampleur.** Le serveur manquerait 39 % des croisements de face qui se chevauchent vraiment, 16 % à angle droit et aucun en poursuite ; 59 % et 42 % à 1500 u/s, 69 % et 57 % à 2000 ; davantage quand le réseau est irrégulier. Un Coureur qui frôle un Chat de face, à 25 unités de décalage, s'en tirerait 65 % du temps : un truc que les joueurs trouveraient.
- **La décision : le balayage (6.3).** Plus aucun chevauchement manqué, à toute vitesse. En poursuite, rien ne change. De face, l'image où le toucher prend effet peut montrer les disques déjà séparés, de 5 unités en moyenne et de 47 au plus, moins d'un tick après leur séparation. Aucun toucher à travers un mur à 1000 u/s. Le balayage touche ce que voient les autres joueurs et les spectateurs, qui regardent les curseurs glisser en ligne droite d'une vue à l'autre. Les deux joueurs concernés, eux, voient des positions décalées (15.2).
- **Écartés :** agrandir `TAG_DISTANCE` (chaque toucher en poursuite partirait avant le contact, au profit du Chat, et il faudrait la réajuster à chaque changement de vitesse) ; tester 2 à 4 fois par tick (manque encore 2 à 7 % des croisements) ; un tick à 60 Hz (doublerait le trafic, soit deux fois moins d'heures de jeu par mois sur le quota).
- **Sous-décisions**, toutes écrites en 6.3 :
  - le premier Coureur rencontré est touché, et un Coureur atteint par plusieurs Chats l'est par le premier : c'est la règle que les joueurs peuvent vérifier avec ce qu'ils ont vu ;
  - à instant égal, l'ordre est tiré au sort : un départage par `playerId` donnerait ces égalités au même ami toute la soirée ;
  - seul le trajet après un portail compte. Personne ne voit le trajet d'avant, puisque l'écran saute directement à l'arrivée. En contrepartie, un Chat posté à la sortie peut cueillir le Coureur qui arrive : à observer en partie réelle ;
  - les états (gel, connexion, rôle) sont lus une seule fois par tick, et le trajet d'un joueur est la ligne droite du début à la fin du tick : presque tous les ticks portent un seul input par joueur.

### 15.2 Retard d'affichage des autres curseurs — provisoire : le serveur seul juge

- **Le problème.** Un joueur voit les autres curseurs `INTERPOLATION_DELAY_MS` dans le passé, plus le trajet de la vue, et son propre curseur en avance sur le serveur. Le serveur décide du toucher sur ses propres positions. Aucune règle de toucher ne supprime cet écart : elle choisit seulement qui le subit.
- **Retard attendu par le Chat en poursuite droite**, Coureur à `RUNNER_MAX_SPEED`, Chat à `CHAT_SPEED_MULTIPLIER` fois plus, `INTERPOLATION_DELAY_MS` à 100 ms :

  | Aller-retour | Distance à parcourir au-delà du Coureur dessiné | Durée « sur lui sans toucher » |
  |---|---|---|
  | 20 ms | ~160 unités (~5,7 largeurs de curseur) | ~1,1 s |
  | 50 ms | ~190 unités (~6,9 largeurs) | ~1,3 s |
  | 100 ms | ~245 unités (~8,8 largeurs) | ~1,6 s |

  Calcul : `vitesse du Coureur × (INTERPOLATION_DELAY_MS + aller) + vitesse du Chat × (aller + attente de l'envoi + attente du tick)`, les deux attentes valant 17 ms en moyenne ; la durée est cette distance divisée par l'écart de vitesse (150 u/s). La distance grandit avec la vitesse ; la durée n'en dépend pas, mais dépend de `CHAT_SPEED_MULTIPLIER`.
- **En biais**, les deux à pleine vitesse, à 50 ms d'aller-retour, le passage que teste le serveur est décalé de 90 à 167 unités sur le côté de celui que voit le Chat, pour tout angle entre 5° et 150° : un toucher en plein centre à l'écran est un raté. Seuls une poursuite droite, un croisement presque de face et un Coureur ralenti ou arrêté donnent le même verdict à l'écran et au serveur. Les touchers viendront surtout des Coureurs ralentis par un mur, un coin ou un arrêt.
- **Le Coureur touché** voit un instant le Chat loin derrière lui, puis, en 0,1 s, son curseur recule jusqu'au point du gel et le Chat dessiné arrive au contact : il finit par voir le contact. Les spectateurs le voient aussi, parce que les rôles et les gels des autres joueurs sont dessinés au même instant retardé que leur position (8).
- **Décision provisoire : le serveur seul juge**, sur ses propres positions (`TAG_REWIND_TICKS` = 0). Le Coureur et les spectateurs voient des touchers cohérents et rien ne peut se tricher, mais le Chat porte presque tout l'écart : il doit viser devant le Coureur dessiné, et le traverser.
- **Déjà câblé pour la comparaison : le rembobinage fixe (6.3).** À `TAG_REWIND_TICKS` = 2 (67 ms), le même pour tous, la distance que le Chat doit parcourir à 50 ms d'aller-retour tombe de ~190 à ~106 unités (0,7 s). En échange, un Coureur lancé est touché avec le Chat dessiné à ~95 unités de lui, centre à centre, sur son écran comme sur celui des spectateurs ; un Coureur arrêté ne voit aucune différence. Aucune mesure de latence, aucun changement de protocole, aucune triche possible : le rembobinage ne dépend de rien de ce que le client envoie.
- **Si c'est encore trop dur pour le Chat**, dans l'ordre du coût : `CHAT_SPEED_MULTIPLIER`, une constante, mais le Chat va alors plus vite partout (1,3 divise la durée de poursuite par deux) ; puis un `INTERPOLATION_DELAY_MS` plus court, le seul levier qui réduit l'écart pour tout le monde, mais qui fige les autres curseurs sur un Wi-Fi irrégulier et se décide donc sur mesure.
- **Écartés pour l'étape 4 :** la compensation complète, propre à chaque joueur (un Coureur lancé serait touché avec le Chat à ~6 largeurs de lui, aux yeux de tous ; elle demande de mesurer la latence de chacun, de changer le protocole, et ouvre une triche) ; l'extrapolation des autres curseurs (chaque arrêt ou demi-tour les ferait dépasser de 42 à 167 unités, puis revenir).
- **Revue à la sous-étape 4e**, en changeant `TAG_REWIND_TICKS` et `CHAT_SPEED_MULTIPLIER` entre deux parties. La sonde compte les touchers vus mais pas comptés (tout chevauchement à l'écran du Chat qu'aucun toucher ne suit, avec son angle), mesure l'écart dessiné au moment d'un toucher sur l'écran du Chat et sur celui du Coureur, et relève les arrivées des vues, pour savoir quel délai d'interpolation les connexions tolèrent.

### 15.3 Vitesse maximale et rattrapage — provisoire : 1000 u/s, rattrapage câblé à 0

- **Le problème.** À `RUNNER_MAX_SPEED` = 1000, un geste plus rapide que le plafond arrive court. Le bon réglage dépend d'une vraie poursuite, avec un Chat, des portails et un gel ; les mesures de l'étape 3b, faites au trackpad, ne suffisent pas à fixer une règle de jeu.
- **Décision provisoire :** `RUNNER_MAX_SPEED` = 1000, valeur de départ ; rattrapage câblé avec `CATCH_UP_MS` = 0, ce qui donne exactement le moteur actuel. Câblé plutôt qu'absent : c'est ce qui permet de le comparer en partie réelle en changeant une constante, sans nouveau cycle de développement. Ses règles sont donc écrites dès maintenant : remises à zéro et changement de rôle (6.2), paiement avant les touchers et avant la recharge (6.6), reste dans la vue seulement quand il n'est pas nul (8).
- **À comparer à la sous-étape 4e**, en développement, contre des bots et avec `?lag=25` (environ 50 ms d'aller-retour), dans l'écran de jeu définitif : plusieurs valeurs de `RUNNER_MAX_SPEED` et de `CHAT_SPEED_MULTIPLIER`, avec et sans rattrapage. Deux réserves :
  - les bots voient les vraies positions, sans latence : ils donnent une première impression, biaisée ;
  - l'arène de l'écran de jeu est plus petite que celle du bac à sable, la colonne de classement prenant sa place : la même vitesse y paraît environ 17 % plus lente.
  Le test avec le groupe (étape 5) ajuste de nouveau.
- **Conséquences connues :**
  - avec une laisse de 300 ms, un demi-tour de Coureur continue de 67 à 133 unités dans le mauvais sens, selon la vitesse de la main : le rattrapage nuit à l'esquive, le geste principal du Coureur ;
  - au-delà d'environ 1750 u/s, un Chat pourrait parcourir plus que `TELEPORT_SNAP_DISTANCE` entre deux vues, et les autres le verraient sauter au lieu de glisser. Un test de garde le signalera, et cette constante de l'architecture devrait alors suivre.
