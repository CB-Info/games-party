# Architecture — Games Party

> Tant qu'un point marqué **À DÉCIDER** subsiste, il ne doit pas être implémenté.
> L'organisation des dossiers et les règles de couches sont décrites dans `CLAUDE.md`, section « Organisation du code ».

## 1. Contexte et contraintes

- Groupe d'amis en France, en vocal Discord pendant les parties.
- **10 personnes maximum par room**, spectateurs et bots compris.
- Jeux temps réel (curseurs synchronisés 30 fois par seconde) et, plus tard, jeux au tour par tour.
- **Un seul process Node** sur Render (offre gratuite, région Frankfurt). Tout l'état est en mémoire, sans base de données.
- PC avec souris uniquement.

Conséquences acceptées :
- Un redémarrage du serveur (déploiement, mise en veille, redémarrage imposé par Render) ferme toutes les rooms en cours.
- Après 15 minutes sans trafic, le serveur se met en veille. Le premier visiteur attend environ une minute qu'il redémarre.

## 2. Vue d'ensemble

```
 Navigateur (React SPA)                    Serveur Node (un seul process)
┌─────────────────────────┐              ┌──────────────────────────────────┐
│ Pages : accueil, room   │   HTTP       │ Express : sert dist/client       │
│ UI React (lobby, scores)│◄────────────►│          + /healthz              │
│ Engine : canvas, curseur│              │                                  │
│ virtuel, interpolation  │  WebSocket   │ Socket.IO (handlers)             │
│                         │◄────────────►│   └─ RoomManager                 │
└─────────────────────────┘ (Socket.IO)  │        └─ Room (état, hôte, tick)│
                                         │             └─ GameInstance      │
                                         └──────────────────────────────────┘
```

- **En production :** le site et Socket.IO sont servis par le même process, à la même adresse. Pas de CORS.
- **En développement :** Vite (port 5173) redirige `/socket.io` vers le serveur (port 3000).
- Toute requête HTTP qui ne correspond ni à un fichier statique, ni à `/healthz`, ni à `/socket.io` renvoie `index.html`. Le routage est géré par le client.
- **Cache HTTP :**
  - `index.html` : `Cache-Control: no-store`, pour qu'un déploiement soit visible immédiatement ;
  - fichiers de `assets/` (noms contenant un hash généré par Vite) : `Cache-Control: public, max-age=STATIC_ASSETS_MAX_AGE_S, immutable`.
  - tous les autres fichiers statiques (polices de `fonts/`, favicon…), dont le nom ne change pas d'une version à l'autre : aucun cache long, revalidation par ETag à chaque visite.
- **CSP :** politique par défaut de helmet, resserrée sur deux points : `connect-src 'self'` (Socket.IO reste sur cette origine) et `style-src 'self'`, sans `'unsafe-inline'` ni `https:` — le site n'a ni feuille de style externe ni attribut `style`.
  - **`upgrade-insecure-requests` n'est gardée qu'en production**, où le site est servi en `https` par Render. En local il est servi en `http`, et Safari applique cette directive à `localhost` là où Chrome et Firefox font une exception : il réclame alors chaque fichier en `https`, le serveur ne parle pas TLS, et la page reste blanche. Le serveur la reconnaît à `NODE_ENV=production`, la variable déjà définie par Render (section 10).

### Routes du client

| Route | Contenu |
|---|---|
| `/` | Accueil : saisie du pseudo, bouton « Créer une room » |
| `/r/:code` | Room : lobby, puis jeu, puis résultats. **L'écran d'invitation s'affiche toujours** (aperçu de la room via `room:preview`, section 5.7), le champ pré-rempli avec le pseudo mémorisé s'il y en a un : entrer dans une room est toujours un geste volontaire. **Seule exception :** un joueur déjà membre de la room (rechargement, reconnexion dans le délai) revient directement au lobby, sans rien ressaisir. Tant que le client ignore s'il est membre, il n'affiche **ni l'invitation ni le lobby** : l'en-tête seul, le contenu vide, pour qu'un membre ne voie jamais l'écran d'invitation, même une fraction de seconde. Il l'apprend quand `room:preview` répond : le serveur envoie `room:state` à un membre pendant qu'il traite la connexion, donc avant toute réponse à une demande de ce même client. Si la room n'existe pas : message « Cette room n'existe pas ou a expiré » et bouton de retour à l'accueil. **En cas de refus** de `room:join` (`PSEUDO_TAKEN`, `ROOM_FULL`, `SERVER_FULL`…), l'écran d'invitation reste affiché avec l'erreur correspondante, jamais une page vide. |
| autre | Page 404 avec bouton de retour à l'accueil |

Sur un écran tactile sans souris (détecté via `matchMedia("(pointer: coarse)")` sans `(any-pointer: fine)`), toutes les routes affichent « Games Party se joue sur ordinateur, avec une souris. »

## 3. Glossaire

| Terme | Définition |
|---|---|
| **Room** | Salon identifié par un code. Contient des joueurs et enchaîne les parties. |
| **Joueur** | Personne présente dans une room et participant aux parties. |
| **Hôte** | Joueur qui choisit et lance les jeux. |
| **Spectateur** | Personne arrivée pendant une partie. Elle la regarde sans jouer et devient joueur au retour au lobby. |
| **Partie** | Une session d'un jeu, du lancement par l'hôte aux résultats. Peut contenir plusieurs manches. |
| **Manche** | Subdivision d'une partie, définie par chaque jeu. |
| **Input** | Intention envoyée par un client (ex. : déplacement de souris). |
| **Tick** | Un pas de la boucle serveur (30 par seconde). |
| **Vue** | Ce qu'un destinataire précis a le droit de voir de l'état du jeu. |
| **Session** | Identité d'un navigateur, conservée entre les rechargements de page. |

## 4. Identité et session

- À la première connexion sans `sessionToken` valide, le serveur génère :
  - un `sessionToken` **secret** (nanoid, 32 caractères), stocké par le client dans `localStorage` et renvoyé à chaque connexion dans `auth` du handshake Socket.IO ;
  - un `playerId` **public** (nanoid, 12 caractères), qui identifie le joueur auprès des autres.
- Le serveur envoie ces deux valeurs via `session:init` **à chaque connexion**, y compris à une reconnexion avec un jeton valide : le client reçoit toujours son identité, et le message est sans effet s'il la connaissait déjà. Le `sessionToken` n'est jamais envoyé à un autre client ni écrit dans les logs.
- Les sessions sont gardées en mémoire. Une session qui n'est liée à aucune room ni à aucun socket depuis 24 h est supprimée.
- **La session est la seule source de vérité sur la room en cours.** Elle mémorise le code de la room où se trouve le joueur ; le serveur ne tient aucune autre table équivalente (par socket, par exemple), pour qu'il n'y ait rien à désynchroniser.
- Le client stocke aussi dans `localStorage` son pseudo et l'identifiant de sa couleur préférée.
- **Pseudo :** obligatoire avant de créer ou rejoindre une room. De `PSEUDO_MIN_LENGTH` à `PSEUDO_MAX_LENGTH` caractères après suppression des espaces aux extrémités, sans caractères de contrôle. Unique dans la room, sans tenir compte des majuscules. En cas de doublon, `room:join` échoue avec `PSEUDO_TAKEN` et le client propose d'en saisir un autre.
- **Couleur :** palette de 10 couleurs, identifiées `c1` à `c10` dans `shared/constants.ts`. Leurs valeurs viennent de `docs/design-system.md`. Couleur unique dans la room. Si la couleur préférée est prise, la première couleur libre dans l'ordre `c1` → `c10` est attribuée. Le joueur peut en changer dans le lobby parmi les couleurs libres.
- **Deux onglets avec la même session :** la nouvelle connexion remplace l'ancienne. L'ancien socket reçoit `session:replaced` puis est déconnecté, et l'ancien onglet affiche « Games Party est ouvert dans un autre onglet. » **à la place de tout son contenu**. Il ne tente **plus jamais** de se reconnecter, et n'affiche pas la notification de connexion perdue : sa connexion n'est pas coupée, elle est terminée. Sans cette règle, les deux onglets se reprendraient la place l'un à l'autre sans fin. Le nouvel onglet **reprend la place immédiatement** : le joueur reste `connected` pour les autres, sans passer par le délai de reconnexion, et le jeu en cours n'est pas notifié.

## 5. Rooms

### 5.1 Création et accès

- Code de room : `ROOM_CODE_LENGTH` caractères générés avec `customAlphabet` de nanoid, alphabet `23456789abcdefghijkmnpqrstuvwxyz`. Lien : `/r/<code>`.
- Accès ouvert à toute personne qui a le lien.
- Le créateur devient l'hôte et rejoint automatiquement la room.
- À la création, si le joueur n'a jamais choisi de couleur, le client envoie `c1` : le serveur attribue de toute façon la première couleur libre dans l'ordre `c1` → `c10` (section 4).
- Capacité : `ROOM_CAPACITY` personnes, joueurs, spectateurs et bots compris. Au-delà, `room:join` échoue avec `ROOM_FULL`. Le client l'affiche **en écran** quand le refus arrive à l'arrivée (l'erreur remplace la colonne de gauche de l'écran d'invitation), et **en notification** si la room se remplit alors qu'on est déjà dedans.
- Une room est **vide quand elle n'a plus aucun membre humain**, une fois les retraits faits : un joueur déconnecté occupe encore sa place, donc le délai ne démarre qu'après son retrait. Une room créée et jamais rejointe est vide dès sa création. Une room vide depuis `EMPTY_ROOM_TTL_MS` est supprimée.
- **La suppression des rooms vides et des sessions inactives se fait par un balayage périodique**, toutes les `MAINTENANCE_INTERVAL_MS`. Rien ne supprime une room à l'instant précis où elle se vide : une room disparaît donc entre `EMPTY_ROOM_TTL_MS` et `EMPTY_ROOM_TTL_MS + MAINTENANCE_INTERVAL_MS` après s'être vidée, soit entre 5 et 6 minutes. Tant qu'elle existe, son lien fonctionne encore, et la rejoindre redonne son rôle d'hôte au premier revenant. Le balayage remet aussi à `null` le code de room des sessions dont la place a expiré : sans cela, ces sessions ne seraient jamais considérées comme inactives, donc jamais supprimées.
- Au maximum `MAX_ROOMS` rooms simultanées. Au-delà, `room:create` échoue avec `SERVER_FULL`.
- Un socket ne peut être que dans une seule room. Rejoindre une autre room fait quitter la précédente : c'est un **départ immédiat**, comme `room:leave`, sans délai de reconnexion et avec perte du score cumulé. La room précédente n'est quittée que **si la nouvelle accepte le joueur** : un `room:join` refusé (pseudo pris, room pleine) ne coûte jamais sa place actuelle.
- **`room:join` vers la room où le joueur se trouve déjà ne fait rien** : le serveur répond `{ code }` et rend la place telle qu'elle est. Le pseudo et la couleur envoyés sont ignorés, y compris si le pseudo est celui d'un autre joueur, et la room pleine ne se refuse pas à ses propres membres. Surtout, il n'y a **ni départ ni nouvelle arrivée** : le joueur garde son ancienneté, donc son rôle d'hôte, ainsi que sa couleur, son statut prêt et son score cumulé.

### 5.2 États d'une room

```
LOBBY ──(hôte lance)──► PLAYING ──(jeu terminé)──► RESULTS ──(hôte ou délai)──► LOBBY
                            │
                            └──(joueurs < minimum du jeu)──► LOBBY
```

| État | Ce qui se passe |
|---|---|
| `LOBBY` | Liste des joueurs. L'hôte choisit un jeu, règle ses options s'il en a, puis le lance (section 5.3). Les autres joueurs se déclarent prêts (section 5.8). Chacun peut changer de couleur. À chaque changement du nombre de joueurs, le serveur recalcule les options avec `normalizeOptions`. |
| `PLAYING` | La boucle de tick tourne. La room n'a pas de compte à rebours propre : chaque jeu gère son départ, par exemple une phase de préparation avant chaque manche (voir le `rules.md` du jeu). |
| `RESULTS` | Classement de la partie et classement cumulé de la room. L'hôte peut cliquer sur « Retour au lobby ». Sinon, retour automatique au bout de `RESULTS_AUTO_RETURN_MS`. |

**Joueurs comptés :** pour le minimum, le maximum et `normalizeOptions`, on compte les joueurs **non retirés et non spectateurs, déconnectés compris**. Seule la condition « tous prêts » (section 5.3) exclut les joueurs déconnectés.

**Départ de l'hôte pendant `RESULTS` :** le rôle est transféré selon la section 5.3 et le retour automatique au lobby continue de courir normalement.

**Partie abandonnée :** si, pendant `PLAYING`, le nombre de joueurs non retirés passe sous le minimum du jeu, la partie s'arrête immédiatement. La room revient au `LOBBY`, aucun point n'est attribué, et tous reçoivent `game:event` `{ type: "aborted" }` pour afficher « Partie arrêtée : pas assez de joueurs ».

### 5.3 Hôte

- Seul l'hôte peut choisir le jeu, régler ses options, le lancer, revenir au lobby depuis les résultats et, en développement, ajouter ou retirer des bots.
- **Aucun jeu n'est sélectionné automatiquement.** À la création de la room, `selectedGameId` vaut `null`. L'hôte choisit un jeu dans la liste ; tant qu'aucun jeu n'est choisi, les autres joueurs voient que l'hôte est en train de choisir.
- **Options des jeux :** la room conserve les options de chaque jeu déjà choisi. Au premier choix d'un jeu, ses options valent `defaultOptions`. Si l'hôte change de jeu puis revient à un jeu déjà choisi, ses dernières options sont restaurées, puis passées par `normalizeOptions` (le nombre de joueurs a pu changer). **La valeur normalisée remplace la valeur mémorisée : un réglage ramené dans ses bornes parce qu'un joueur est parti ne remonte pas tout seul si ce joueur revient.** Ces options disparaissent avec la room.
- L'hôte n'a pas de statut « prêt » : lancer la partie vaut accord de sa part.
- **Conditions de lancement (`lobby:start`), vérifiées dans cet ordre :**
  1. un jeu est sélectionné, sinon `NO_GAME_SELECTED` ;
  2. le nombre de joueurs est au moins le minimum du jeu, sinon `NOT_ENOUGH_PLAYERS`, et au plus le maximum, sinon `TOO_MANY_PLAYERS` ;
  3. sans `force` : tous les joueurs **connectés**, hôte excepté, sont prêts, sinon `NOT_ALL_READY`. Avec `force: true` (« Lancer quand même »), cette condition est ignorée. Les conditions 1 et 2 s'appliquent toujours.
- **L'hôte est toujours le joueur humain connecté présent depuis le plus longtemps** ; s'il n'y en a aucun, le joueur humain présent depuis le plus longtemps, pour que la room garde toujours un hôte. Un bot ne peut jamais être hôte. S'il ne reste que des bots, la room est considérée comme vide.
- Ce n'est pas un rôle transmis puis conservé : c'est une valeur **recalculée à chaque changement** — arrivée, déconnexion, retour et retrait. Deux conséquences assumées : quand l'hôte ferme son onglet, le rôle passe **immédiatement** au suivant, sans attendre la fin du délai de reconnexion ; et s'il revient dans ce délai, **il reprend le rôle**, puisque son ancienneté n'a pas changé. Un hôte retiré pour de bon ne le reprend pas : en revenant, il est le dernier arrivé.

### 5.4 Arrivée en cours de partie

- Quelqu'un qui rejoint pendant `PLAYING` ou `RESULTS` devient spectateur et reçoit la vue spectateur du jeu.
- Au retour au `LOBBY`, les spectateurs deviennent joueurs, non prêts.

### 5.5 Déconnexion, départ et reconnexion

- **Déconnexion :** le joueur est marqué `connected: false` et sa place est gardée `RECONNECT_GRACE_MS`. Un spectateur a droit au même délai : il occupe lui aussi une place dans la capacité. Pendant une partie, le jeu est notifié (`onPlayerDisconnect`). Chaque `rules.md` définit le comportement du jeu dans ce cas.
- **Pourquoi ce délai est long.** Les deux temps ne servent pas à la même chose. La **détection** doit être rapide : dès que Socket.IO déclare le socket mort, la partie en cours réagit sans attendre. Le **retrait**, lui, supprime la place, la couleur et le score de la soirée : il doit laisser le temps de revenir. Or une absence de plus de trente secondes ne veut pas dire qu'un joueur est parti — un onglet mis en pause en arrière-plan (Safari le fait), un Wi-Fi qui saute, un ordinateur en veille durent tous plus longtemps. Le délai est donc de cinq minutes. En contrepartie une place reste occupée jusqu'à cinq minutes après un vrai départ, ce qui est sans conséquence à dix joueurs entre amis ; et celui qui part pour de bon clique « Quitter la room », qui retire immédiatement.
- **Conséquence à connaître :** la détection prend déjà une quarantaine de secondes (réglages par défaut de Socket.IO). Le dernier joueur d'une room qui ferme son onglet la laisse donc vivre environ onze minutes : 45 s de détection, 5 min avant le retrait, puis les 5 à 6 min de la section 5.1. Son lien fonctionne encore pendant tout ce temps.
- **Reconnexion** avec le même `sessionToken` dans ce délai : le joueur retrouve sa place (pseudo, couleur, score cumulé, rôle dans la partie en cours). Le jeu est notifié (`onPlayerReconnect`).
- **Reconnexion alors que la room a disparu** (serveur redémarré, room vide supprimée, délai écoulé) : le serveur efface simplement le code de room de la session, sans envoyer de message. C'est le client qui redemande la room en arrivant sur `/r/<code>` et reçoit `ROOM_NOT_FOUND`.
- **Retrait :** à la fin du délai, ou immédiatement en cas de `room:leave`, le joueur est retiré. Le jeu est notifié (`onPlayerLeave`), le rôle d'hôte est transféré si nécessaire, et son score cumulé est supprimé. S'il revient plus tard, il repart de zéro.
- **Quitter volontairement :** un bouton « Quitter la room » est disponible dans le lobby et, pendant une partie, sur l'écran « Clique pour reprendre ». Il ouvre toujours une confirmation. Après confirmation, le client envoie `room:leave` puis revient à l'accueil (`/`). Si le joueur est l'hôte, la confirmation indique le pseudo du joueur qui deviendra hôte (le joueur humain présent depuis le plus longtemps, section 5.3).
  - Joueur : titre « Quitter la room ? », texte « Tu pourras revenir avec le lien, mais ton score de la soirée repartira de zéro. »
  - Hôte : le même texte, suivi de « [pseudo] deviendra l'hôte. »

### 5.6 Classement de partie et classement cumulé

- À la fin d'une partie, le jeu renvoie via `getRanking()` le classement des joueurs non retirés.
- La room calcule la place de chaque joueur : `place = 1 + nombre de joueurs ayant un score strictement supérieur`. Des joueurs à égalité ont la même place, et les places suivantes sont sautées (ex. : 1er, 1er, 3e, 4e).
- Points gagnés : `N − place`, où N est le nombre de joueurs classés. Le premier marque N − 1 points, avec 1 point d'écart par place, et le dernier marque 0.
- Exemple à 4 joueurs sans égalité : 3 / 2 / 1 / 0. Avec deux premiers ex æquo : 3 / 3 / 1 / 0.
- Le calcul se trouve dans `server/rooms/ranking.ts`.
- Les points sont ajoutés au classement cumulé de la room, trié par points décroissants. Il disparaît avec la room.
- **Ordre d'affichage des égalités :** dans tous les classements (partie et soirée), les joueurs à égalité sont affichés par ordre alphabétique de leur pseudo, sans tenir compte des majuscules ni des accents (`localeCompare` en `fr` avec `sensitivity: "base"`), puis par `playerId` pour que deux pseudos ne différant que par un accent gardent un ordre stable. Ils gardent la même place.
- **Contenu de `GameResults`**, calculé par la room à la fin de la partie :
  - `ranking` : pour chaque joueur classé, `playerId`, `place`, `score` et `pointsAwarded` ;
  - `cumulative` : pour chaque joueur de la room hors spectateurs, `playerId`, `points` (total après la partie), `place` (après la partie) et `previousPlace` (place au classement cumulé juste avant la partie, calculée avec la même règle d'égalité). Le client en déduit la flèche de progression : place gagnée, perdue ou identique.

### 5.7 Aperçu d'une room avant de la rejoindre

- L'écran d'invitation appelle `room:preview` avec le code de la room, sans la rejoindre.
- La réponse est une photographie de la room à cet instant, **sans mise à jour en direct** :
  - `hostPseudo` ;
  - `players` : pour chaque joueur, `pseudo`, `color`, `isHost` ;
  - `playerCount` et `capacity` ;
  - `status` : `"lobby"` si la room est en `LOBBY`, `"in_game"` si elle est en `PLAYING` ou `RESULTS` ;
  - `selectedGameId` (ou `null`).
- La réponse ne contient ni chrono, ni manche, ni rôle, ni score, ni aucun identifiant (`playerId`, `sessionToken`).
- Un `room:preview` sur un code inexistant renvoie `ROOM_NOT_FOUND` et compte comme un échec pour la limite `MAX_JOIN_FAILURES_PER_MINUTE` (section 9).

### 5.8 Statut « prêt » dans le lobby

- Chaque joueur, hôte excepté, a un statut « prêt », visible par tous dans `room:state` (`readyPlayerIds`).
- `lobby:setReady` `{ ready: boolean }` le définit. Un second clic sur le bouton « Prêt » envoie `ready: false`.
- `lobby:setReady` n'est accepté qu'en `LOBBY`, sinon `INVALID_STATE`. Envoyé par l'hôte : `INVALID_STATE`.
- **Le statut « prêt » est perdu :**
  - à chaque entrée dans l'état `LOBBY` (après les résultats, après une partie abandonnée) : tous les joueurs repartent non prêts ;
  - à la déconnexion du joueur ;
  - pour tous les joueurs, quand l'hôte sélectionne un jeu différent du jeu actuellement sélectionné. Chaque joueur qui était prêt reçoit une notification indiquant que le jeu a changé.
- **Le statut « prêt » est conservé** quand l'hôte modifie les options du jeu.
- Un joueur qui rejoint la room ou devient hôte n'est pas prêt.
- Les joueurs déconnectés ne bloquent jamais le lancement (section 5.3, condition 3).
- Les bots se déclarent prêts automatiquement dès qu'ils sont dans le lobby.

## 6. Protocole réseau

### 6.1 Principes

- Un seul namespace Socket.IO (`/`). Chaque room correspond à une room Socket.IO `room:<code>`.
- Tous les événements sont typés dans `src/shared/protocol.ts` (`ClientToServerEvents`, `ServerToClientEvents`).
- Nommage : `domaine:action`.
- Les requêtes du client qui attendent une réponse utilisent les **acknowledgements** Socket.IO et renvoient `{ ok: true, data }` ou `{ ok: false, error: ErrorCode }`.
- **Contenu des réponses :** `room:create` et `room:join` renvoient `{ code }` (le client n'a besoin que du code pour aller sur `/r/<code>` : l'état complet arrive juste après par `room:state`). `room:preview` renvoie l'aperçu de la section 5.7. Toutes les autres requêtes renvoient `{ ok: true }` sans données.
- `ErrorCode` : `INVALID_PAYLOAD`, `ROOM_NOT_FOUND`, `ROOM_FULL`, `SERVER_FULL`, `PSEUDO_TAKEN`, `COLOR_TAKEN`, `NOT_HOST`, `INVALID_STATE`, `NOT_ENOUGH_PLAYERS`, `TOO_MANY_PLAYERS`, `NO_GAME_SELECTED`, `NOT_ALL_READY`, `RATE_LIMITED`.

### 6.2 Événements

| Sens | Événement | Payload | Rôle |
|---|---|---|---|
| client → serveur | `room:create` (ack) | `{ pseudo, preferredColor }` | Créer une room et la rejoindre |
| client → serveur | `room:preview` (ack) | `{ code }` | Aperçu d'une room sans la rejoindre (section 5.7) |
| client → serveur | `room:join` (ack) | `{ code, pseudo, preferredColor }` | Rejoindre une room |
| client → serveur | `room:leave` | — | Quitter la room |
| client → serveur | `lobby:setColor` (ack) | `{ color }` | Changer de couleur |
| client → serveur | `lobby:selectGame` (ack) | `{ gameId }` | Hôte : choisir le jeu (options restaurées ou par défaut, section 5.3) |
| client → serveur | `lobby:setOptions` (ack) | `{ options }` | Hôte : modifier les options du jeu sélectionné. Refusé avec `NO_GAME_SELECTED` si aucun jeu n'est choisi. Le serveur applique `normalizeOptions` puis diffuse `room:state`. |
| client → serveur | `lobby:setReady` (ack) | `{ ready }` | Joueur : se déclarer prêt ou non (section 5.8) |
| client → serveur | `lobby:start` (ack) | `{ force }` | Hôte : lancer la partie ; `force: true` pour « Lancer quand même » (section 5.3) |
| client → serveur | `results:backToLobby` (ack) | — | Hôte : quitter l'écran de résultats |
| client → serveur | `dev:addBot` / `dev:removeBot` (ack) | — / `{ playerId }` | Hôte, développement uniquement |
| client → serveur | `game:input` | défini par le jeu | Input continu, ex. déplacement (**volatile**) |
| client → serveur | `game:action` (ack) | défini par le jeu | Action ponctuelle qui ne doit pas se perdre, ex. « Prêt » |
| serveur → client | `session:init` | `{ sessionToken, playerId }` | Identité de la session |
| serveur → client | `session:replaced` | — | Session ouverte ailleurs |
| serveur → client | `room:state` | `RoomState` | État de la room : joueurs, hôte, état, jeu et options choisis (`selectedGameId` peut valoir `null`), joueurs prêts (`readyPlayerIds`), classement cumulé, et pendant `RESULTS` les derniers résultats (`lastResults: GameResults`), pour qu'un joueur qui rejoint ou se reconnecte pendant les résultats les voie |
| serveur → client | `lobby:gameChanged` | `{ gameId }` | Envoyé aux joueurs qui ont perdu leur statut « prêt » parce que l'hôte a changé de jeu |
| serveur → client | `game:view` | `{ tick, serverTime, view }` | Vue du jeu pour ce destinataire (**volatile**) |
| serveur → client | `game:event` | défini par le jeu, plus `aborted` | Événement ponctuel (sons, animations) |
| serveur → client | `game:results` | `GameResults` (section 5.6) | Classement de la partie terminée et classement cumulé mis à jour |

- **Messages fiables** (tous sauf `game:input` et `game:view`) : ils ne doivent pas se perdre. `game:action` renvoie `INVALID_PAYLOAD` si le schéma n'est pas respecté, `INVALID_STATE` si l'action n'est pas possible à ce moment.
- **Messages volatiles** : un message en retard est abandonné au lieu de s'accumuler.
- `room:state` est envoyé à toute la room à chaque changement de l'état de la room, jamais à chaque tick.

### 6.3 Boucle de tick

- La boucle ne tourne que pendant `PLAYING`, via `setInterval` de `1000 / SERVER_TICK_RATE` ms.
- `dt` est mesuré avec `performance.now()` et plafonné à `MAX_TICK_DT_MS`.
- À chaque tick :
  1. appliquer les inputs reçus depuis le tick précédent, dans leur ordre d'arrivée ;
  2. appeler `tick(dt)` ;
  3. si `isOver()` : arrêter la boucle et passer à `RESULTS` ;
  4. sinon, envoyer à chaque joueur et spectateur connecté `game:view` avec `{ tick, serverTime: Date.now(), view: getViewFor(destinataire) }`.

- `isOver()` est consulté **après chaque tick et après chaque retrait de joueur** : une partie peut se terminer en dehors d'un tick.

### 6.4 Arène

- Coordonnées logiques : `ARENA_WIDTH` × `ARENA_HEIGHT`, origine en haut à gauche. Le serveur ne raisonne qu'en unités logiques.
- Le client affiche l'arène en gardant le ratio, la plus grande possible dans la zone de jeu, centrée. `scale = largeur affichée / ARENA_WIDTH`.

### 6.5 Curseur virtuel (jeux au curseur)

**Capture de la souris**
- Le curseur système est masqué dans l'arène (`cursor: none`).
- Au clic dans l'arène, le client appelle `requestPointerLock()` **sans** `unadjustedMovement`. L'accélération et la sensibilité du système d'exploitation de chaque joueur s'appliquent donc : le curseur virtuel se comporte comme son curseur habituel.
- La sensibilité est commune à tous : `CURSOR_SENSITIVITY`, sans réglage par joueur.
- **Pointer Lock perdu** (Échap, alt-tab) : overlay « Clique pour reprendre ». Aucun input n'est envoyé, donc le curseur reste immobile côté serveur.

**Inputs**
- Le client convertit chaque `movementX/Y` en unités logiques : `delta / scale × CURSOR_SENSITIVITY`.
- Il additionne ces deltas et envoie `game:input` `{ seq, dx, dy }` toutes les `1000 / INPUT_SEND_RATE` ms si la somme n'est pas nulle.
- `seq` est un entier qui augmente de 1 à chaque envoi. Il repart de 0 au début de chaque partie et à chaque reconnexion, et le serveur remet alors le dernier `seq` traité de ce joueur à −1. Le serveur ignore tout input dont `seq` est inférieur ou égal au dernier `seq` traité pour ce joueur.
- Schéma Zod : `seq` entier ≥ 0, `dx` et `dy` nombres finis entre −`MAX_INPUT_DELTA` et `MAX_INPUT_DELTA`.

**Déplacement : `shared/cursor/moveCursor.ts`**

Fonction pure utilisée à l'identique par le serveur et par la prédiction client.

- **Budget de déplacement.** Chaque curseur a un budget en unités logiques.
  - Une fois par tick serveur, à la fin de `tick(dt)` et donc avant les inputs du tick suivant : `budget = min(budget + maxSpeed × dt / 1000, maxSpeed × MOVE_BUDGET_CAP_MS / 1000)`.
  - Pour un input de longueur `L` : distance autorisée `A = min(L, budget)`. Le delta est réduit dans la proportion `A / L`, puis `budget -= A`.
  - `maxSpeed` est fourni par le jeu (unités logiques par seconde).
- **Collisions.** Le curseur est un disque de rayon `radius` fourni par le jeu.
  - Le delta autorisé est découpé en pas d'au plus `MOVE_SUBSTEP` unités.
  - Pour chaque pas : appliquer la composante X ; si le disque chevauche un mur ou sort de l'arène, annuler la composante X de ce pas. Faire de même pour Y. Le curseur glisse ainsi le long des murs.
  - Un mur est un rectangle `{ x, y, width, height }`. Chevauchement : distance entre le centre du disque et le point le plus proche du rectangle strictement inférieure à `radius`.
  - Bords : le centre reste entre `radius` et `ARENA_WIDTH − radius` en X, `radius` et `ARENA_HEIGHT − radius` en Y.

**Prédiction du curseur local**
- Chaque vue contient la position officielle du joueur et le dernier `seq` traité.
- À réception d'une vue, le client repart de la position officielle et rejoue avec `moveCursor` ses inputs envoyés mais pas encore traités, puis le delta en cours d'accumulation. Le budget client se recharge selon le temps réel écoulé, avec les mêmes formules.
- Si l'écart entre la position affichée et la nouvelle position prédite est inférieur ou égal à `CORRECTION_SNAP_DISTANCE`, la position affichée rejoint la position prédite en `CORRECTION_SMOOTHING_MS` (interpolation linéaire). Au-delà, elle est replacée immédiatement.
- Les effets décidés par le jeu (gel, téléportation) viennent uniquement du serveur. Le client ne les prédit pas.

**Affichage des autres curseurs**
- Le client garde les vues reçues des `INTERPOLATION_BUFFER_MS` dernières millisecondes.
- Temps d'affichage : `serverTime de la dernière vue + (maintenant − heure de réception de cette vue) − INTERPOLATION_DELAY_MS`.
- La position est interpolée linéairement entre les deux vues qui encadrent ce temps. S'il n'en existe pas de plus récente, la dernière position connue est affichée.
- Si la distance entre deux positions successives d'un joueur dépasse `TELEPORT_SNAP_DISTANCE`, aucune interpolation : la nouvelle position est affichée directement.

## 7. Interface d'un jeu

```ts
// src/games/gameServer.types.ts
interface GameDefinition<Input, Action, View, Options> {
  id: string;                        // ex. "cursor-tag"
  name: string;                      // nom affiché, en français
  minPlayers: number;
  maxPlayers: number;
  inputSchema: z.ZodType<Input>;     // validation de game:input
  actionSchema: z.ZodType<Action>;   // validation de game:action
  optionsSchema: z.ZodType<Options>; // validation des options envoyées par l'hôte
  defaultOptions(playerCount: number): Options;
  normalizeOptions(options: Options, playerCount: number): Options; // ramène les options dans les bornes valides
  create(ctx: GameContext, options: Options): GameInstance<Input, Action, View>;
  bot: BotPolicy<Input, Action, View>;
}

type GameEvent = { readonly type: string } & Readonly<Record<string, unknown>>;

interface GameContext {
  // Liste vivante, lue à chaque appel : un jeu a besoin de l'état courant, par exemple pour
  // compter les joueurs connectés au début d'une manche.
  players(): ReadonlyArray<{
    playerId: string;
    color: string;
    isBot: boolean;
    connected: boolean;
  }>;
  emitEvent(event: GameEvent, to?: string[]): void; // game:event, à toute la room si `to` est absent
  getHostId(): string | null;        // hôte actuel de la room (peut changer pendant la partie)
  random(): number;                  // nombre dans [0, 1)
}

interface GameInstance<Input, Action, View> {
  onInput(playerId: string, input: Input): void;
  onAction(playerId: string, action: Action): { ok: true } | { ok: false; error: "INVALID_STATE" | "NOT_HOST" };
  tick(dtMs: number): void;
  onPlayerDisconnect(playerId: string): void;
  onPlayerReconnect(playerId: string): void;
  onPlayerLeave(playerId: string): void;
  getViewFor(viewer: { playerId: string } | { spectator: true }): View;
  isOver(): boolean;
  getRanking(): Array<{ playerId: string; score: number }>; // trié par score décroissant
}

interface BotPolicy<Input, Action, View> {
  nextInput(view: View, botPlayerId: string, dtMs: number, random: () => number): Input | null;
  nextAction(view: View, botPlayerId: string): Action | null;
}
```

```ts
// src/games/gameClient.types.ts
interface GameClientDefinition<Input, Action, View, Options> {
  id: string;
  Screen: React.FC<{
    viewStore: ViewStore<View>;        // buffer des vues, lu par le moteur sans re-render
    sendInput(input: Input): void;
    sendAction(action: Action): Promise<{ ok: boolean }>;
    me: { playerId: string } | { spectator: true };
  }>;
  OptionsForm: React.FC<{               // affiché dans le lobby, modifiable par l'hôte uniquement
    options: Options;
    playerCount: number;
    editable: boolean;
    onChange(options: Options): void;
  }> | null;                            // null si le jeu n'a pas d'option
}
```

- `ViewStore` (`client/engine/viewStore.ts`) garde les vues reçues avec leur heure de réception et expose `latest()` et `sampleAt(time)`.
- Le serveur appelle `onInput` et `onAction` uniquement pour les joueurs de la partie, jamais pour les spectateurs.
- **Registre des jeux :** le serveur garde des jeux dont les types `Input`, `Action`, `View` et `Options` diffèrent. `games/defineGame.ts` convertit une `GameDefinition` typée en une entrée dont les frontières sont en `unknown`, chaque valeur étant validée par le schéma Zod du jeu avant de lui être transmise. C'est le seul endroit du code avec une conversion de type forcée.

## 8. Bots (développement uniquement)

- Disponibles uniquement si `NODE_ENV !== "production"`. En production, les événements `dev:*` sont ignorés.
- Ajoutés et retirés par l'hôte depuis un panneau de développement dans le lobby.
- Pseudo `Bot 1`, `Bot 2`… couleur attribuée comme pour un joueur.
- Un bot est un faux joueur côté serveur : à chaque tick, `BotRunner` appelle `nextInput` et `nextAction` avec la vue du bot, et transmet les résultats non nuls à `onInput` et `onAction`, comme pour un joueur.
- Les bots comptent dans la capacité de la room et ne peuvent pas être hôtes.

## 9. Sécurité

| Risque | Protection |
|---|---|
| Messages malformés ou malveillants | Validation Zod de chaque message entrant. Message invalide ignoré, ou ack `INVALID_PAYLOAD`. |
| Triche (fausses positions, faux scores) | Le serveur fait autorité. Les déplacements sont bornés par le budget, les murs et les bords. |
| Lecture d'informations cachées | Tout passe par `getViewFor`. L'état interne n'est jamais diffusé. |
| Usurpation d'un joueur | `sessionToken` secret, jamais diffusé ni loggé. Le `playerId` envoyé par un client n'est jamais cru. |
| Flood de messages | Au plus `RATE_LIMIT_MESSAGES_PER_SECOND` messages par seconde glissante par socket, inputs compris. Un message en surplus qui attend une réponse (ack) reçoit `RATE_LIMITED` ; les autres (`game:input`, `game:view` et tout message sans ack) sont ignorés en silence. Limite dépassée pendant `RATE_LIMIT_KICK_AFTER_MS` sans interruption : déconnexion. |
| Messages géants | `maxHttpBufferSize` Socket.IO fixé à `MAX_MESSAGE_BYTES`. |
| Recherche de rooms au hasard | Codes de `ROOM_CODE_LENGTH` caractères. Au plus `MAX_JOIN_FAILURES_PER_MINUTE` échecs `ROOM_NOT_FOUND` de `room:join` ou `room:preview` par socket par minute glissante, puis `RATE_LIMITED`. Les autres échecs (`PSEUDO_TAKEN`, `ROOM_FULL`, `COLOR_TAKEN`, `INVALID_PAYLOAD`…) viennent de joueurs légitimes et ne sont pas comptés. |
| Saturation du serveur gratuit | `MAX_ROOMS` rooms simultanées, 1 room par socket. |
| Injection dans la page (XSS) | Pas de `dangerouslySetInnerHTML`. Textes de joueurs affichés comme texte. En-têtes HTTP via `helmet`. |
| Requêtes d'autres sites | Même origine en production, pas de CORS configuré. |

## 10. Déploiement (Render)

La configuration est versionnée dans `render.yaml`, à la racine du dépôt. Le service est créé sur Render depuis ce fichier (« Blueprint »). `render.yaml` fait foi : toute modification de réglage se fait dans ce fichier, puis ce tableau est mis à jour pour rester identique.

| Réglage | Valeur |
|---|---|
| Type | Web Service, runtime Node, offre Free |
| Région | Frankfurt |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` (répond `200` avec `ok`) |
| Variables d'environnement | `NODE_ENV=production` |
| Déploiement automatique | À chaque fusion dans `main` |

- `npm ci` exige que `package-lock.json` soit versionné. `--include=dev` est obligatoire : comme `NODE_ENV=production` est aussi défini pendant le build, npm ignorerait sinon les dépendances de développement (Vite, esbuild, TypeScript) et le build échouerait.
- Version de Node : `engines.node` de `package.json` (`24.x`).
- Le serveur écoute sur `process.env.PORT`, ou `DEFAULT_SERVER_PORT` s'il n'est pas défini.
- Pendant une perte de connexion, le contenu reste tel quel et la notification « Connexion perdue, reconnexion… » **reste affichée jusqu'au retour de la connexion** : c'est un état, pas un événement. Le client laisse Socket.IO se reconnecter.
- **Au retour de la connexion**, le client oublie ce qu'il savait de la room et redemande l'aperçu : ce que le serveur avait dit avant n'est plus forcément vrai. Il repasse par l'état « inconnu » de la section 2 le temps d'une réponse, puis :
  - la room renvoie `room:state` : la place tient toujours, le lobby revient tel quel ;
  - la room répond à l'aperçu sans rien envoyer d'autre : la place a expiré pendant la coupure, l'écran d'invitation revient avec le pseudo déjà saisi ;
  - la room répond `ROOM_NOT_FOUND` : message « Cette room n'existe pas ou a expiré » et retour à l'accueil.

## 11. Tests

- Vitest sur tout le code des couches pures : `shared/`, `games/*/logic/`, `games/*/shared/`, `server/rooms/` (machine d'états, capacité, hôte, classement).
- Classement : cas sans égalité, égalité en tête, égalité au milieu, égalité de tous les joueurs (tous marquent N − 1).
- Lobby : lancement refusé sans jeu, sous le minimum, au-dessus du maximum, avec un joueur connecté non prêt ; lancement accepté avec `force` ; joueur déconnecté non prêt qui ne bloque pas ; statut « prêt » perdu à l'entrée en `LOBBY`, à la déconnexion et au changement de jeu, conservé au changement d'option.
- Aperçu : réponse sans chrono, rôle ni identifiant ; `status` correct pour chaque état de room ; code inexistant compté comme échec.
- Options : valeurs par défaut au premier choix d'un jeu, options restaurées au retour sur un jeu déjà choisi, `lobby:setOptions` refusé sans jeu, statut « prêt » conservé après `lobby:setOptions`.
- Les jeux reçoivent un `random` déterministe dans les tests.
- Pas de tests end-to-end pour l'instant.

## 12. Décisions et compromis

| Décision | Raison | Compromis accepté |
|---|---|---|
| Serveur Node + Socket.IO sur Render | Serveur temps réel classique, bien connu de l'IA, même modèle que skribbl.io ou JKLM | Mise en veille et redémarrages de l'offre gratuite |
| Vite + React, sans Next.js | Pas besoin de référencement ni de rendu serveur. Le site est servi par le serveur de jeu. | Aucun pour ce projet |
| État en mémoire, sans base de données | Rien à conserver après une room | Tout est perdu au redémarrage |
| Un seul `package.json` | Simplicité du build et du déploiement | Dépendances client et serveur mélangées |
| Deux projets TypeScript (client et serveur) | Le compilateur refuse les types du navigateur côté serveur et ceux de Node côté client, y compris dans le code commun | Deux vérifications au lieu d'une |
| TypeScript 6.0 plutôt que 7 | typescript-eslint ne supporte pas encore TypeScript 7 | Pas les gains de vitesse de TypeScript 7 pour l'instant |
| Bundle du serveur avec esbuild | Évite les problèmes d'extensions d'import de TypeScript en ESM | Un outil de build de plus |
| Couches vérifiées par ESLint | Les règles d'organisation sont contrôlées automatiquement, pas seulement écrites | Configuration ESLint un peu plus longue |
| Pointer Lock sans `unadjustedMovement`, sensibilité commune | Chaque joueur garde la sensation de son propre curseur, sans réglage dans le jeu | Écarts de sensibilité entre joueurs, limités par la vitesse maximale commune |

## 13. Valeurs de référence

Valeurs exactes à utiliser dans `src/shared/constants.ts`. Chaque constante est ajoutée au moment où le code en a besoin, jamais à l'avance, mais toujours avec la valeur de ce tableau.

| Constante | Valeur |
|---|---|
| `DEFAULT_SERVER_PORT` | `3000` |
| `STATIC_ASSETS_MAX_AGE_S` | `31536000` (1 an) |
| `ROOM_CAPACITY` | `10` |
| `ROOM_CODE_LENGTH` | `10` |
| `ROOM_CODE_ALPHABET` | `23456789abcdefghijkmnpqrstuvwxyz` |
| `SESSION_TOKEN_LENGTH` | `32` |
| `SESSION_PLAYER_ID_LENGTH` | `12` |
| `SESSION_TTL_MS` | `86400000` (24 h) |
| `MAX_ROOMS` | `50` |
| `EMPTY_ROOM_TTL_MS` | `300000` (5 min) |
| `MAINTENANCE_INTERVAL_MS` | `60000` (1 min) |
| `RECONNECT_GRACE_MS` | `300000` (5 min) |
| `RESULTS_AUTO_RETURN_MS` | `20000` |
| `PSEUDO_MIN_LENGTH` | `2` |
| `PSEUDO_MAX_LENGTH` | `16` |
| `PLAYER_COLOR_IDS` | `c1` à `c10` |
| `SERVER_TICK_RATE` | `30` |
| `INPUT_SEND_RATE` | `30` |
| `MAX_TICK_DT_MS` | `100` |
| `ARENA_WIDTH` | `1600` |
| `ARENA_HEIGHT` | `900` |
| `CURSOR_SENSITIVITY` | `1` |
| `MAX_INPUT_DELTA` | `2000` |
| `MOVE_BUDGET_CAP_MS` | `200` |
| `MOVE_SUBSTEP` | `7` |
| `INTERPOLATION_DELAY_MS` | `100` |
| `INTERPOLATION_BUFFER_MS` | `1000` |
| `CORRECTION_SNAP_DISTANCE` | `48` |
| `CORRECTION_SMOOTHING_MS` | `100` |
| `TELEPORT_SNAP_DISTANCE` | `200` |
| `RATE_LIMIT_MESSAGES_PER_SECOND` | `60` |
| `RATE_LIMIT_KICK_AFTER_MS` | `5000` |
| `MAX_MESSAGE_BYTES` | `16384` |
| `MAX_JOIN_FAILURES_PER_MINUTE` | `10` |

Les valeurs de gameplay (vitesses, rayons, durées) sont des points de départ réglables après les tests avec le groupe. Toute modification passe par ce tableau ou par le `rules.md` du jeu.

## 14. À DÉCIDER

Aucun point en attente.