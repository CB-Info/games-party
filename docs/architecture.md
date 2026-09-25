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
- **La bande passante est la ressource rare, pas le processeur.** Render applique un quota mensuel de trafic sortant — **5 Go par mois** sur l'offre utilisée ici — et le dépasser sans moyen de paiement enregistré suspend le service jusqu'à la fin du mois. Une room de 10 joueurs envoie une vue par joueur 30 fois par seconde : à 900 octets la vue, c'est déjà **environ 1 Go par heure de jeu**, soit le quota entier en quelques soirées. C'est pourquoi la section 7 impose une vue compacte à tout jeu temps réel.
- **Trafic à surveiller.** Même compacte, la vue de Cursor Tag laisse environ 9 heures de jeu par mois à 10 joueurs et 30 à 5 (section 7). Après les premières soirées, relever le trafic sortant sur la page Billing de Render : c'est avec ce chiffre qu'on choisira entre optimiser la vue et enregistrer un moyen de paiement.

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
- **Deux onglets avec la même session :** la nouvelle connexion remplace l'ancienne. L'ancien socket reçoit `session:replaced` puis est déconnecté, et l'ancien onglet affiche « Games Party est ouvert dans un autre onglet. » **à la place de tout son contenu**. Il ne tente **plus jamais** de se reconnecter, et n'affiche pas la notification de connexion perdue : sa connexion n'est pas coupée, elle est terminée. Sans cette règle, les deux onglets se reprendraient la place l'un à l'autre sans fin. Le nouvel onglet **reprend la place immédiatement** : le joueur reste `connected` pour les autres, sans passer par le délai de reconnexion. **Le jeu en cours, lui, est notifié comme d'une reconnexion** (`onPlayerReconnect`, sans `onPlayerDisconnect` avant) : la nouvelle connexion numérote ses inputs à partir de 0 (section 6.5), et un jeu qui garderait l'ancien compte les ignorerait jusqu'à le rattraper — un curseur figé aussi longtemps que le joueur avait déjà joué. Mesuré à l'étape 3b.
- **Reconnexion plus rapide que le serveur :** quand la machine du joueur coupe elle-même le lien, son client se reconnecte en une fraction de seconde, bien avant que la pulsation du serveur (`SOCKET_PING_INTERVAL_MS` puis `SOCKET_PING_TIMEOUT_MS`) abandonne l'ancien socket. Cette connexion prend la place comme un second onglet, et suit la même règle : les autres ne voient rien, le jeu est notifié. L'avis `session:replaced` part vers l'ancien socket, mort, et la page du joueur ne le reçoit pas. Quand au contraire le réseau se tait sans que rien ne soit fermé, les deux côtés attendent la même pulsation, le serveur abandonne l'ancien socket le premier, et c'est une reconnexion ordinaire (section 5.5). Les deux cas sont mesurés à l'étape 3b (`server/socket/socketGameReconnect.test.ts`).

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
- **Détection d'une coupure :** Socket.IO abandonne un socket après `SOCKET_PING_INTERVAL_MS + SOCKET_PING_TIMEOUT_MS` sans réponse, soit **entre 5 et 10 secondes**. C'est court exprès : pendant une partie, le jeu réagit dès la déconnexion. Conséquence à connaître : un onglet mis en pause par le navigateur (Safari le fait en arrière-plan) apparaît « Déconnecté » chez les autres au bout d'une dizaine de secondes, alors que le joueur n'est allé nulle part. Sa place, elle, reste protégée cinq minutes : c'est le délai de retrait qui compte, pas celui de détection.
- **Combien de temps une room survit :** le dernier joueur qui ferme son onglet la laisse vivre un peu plus de dix minutes — 10 s de détection, 5 min avant le retrait, puis les 5 à 6 min de la section 5.1. Son lien fonctionne encore pendant tout ce temps.
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
- **Jamais un message volatil juste après un message fiable**, dans le même passage du code : Socket.IO le jette tant que le message fiable occupe la connexion, des deux côtés. Mesuré à l'étape 4 : 30 événements suivis de leur vue, aucune vue reçue ; côté client, 5 inputs relâchés d'un coup, un seul reçu. Le serveur envoie donc les événements d'un tick après ses vues (6.3). Côté client, les inputs partent de leur propre minuterie, jamais dans le passage d'une action, et le simulateur de latence relâche un message par tâche (8.1).
- `room:state` est envoyé à toute la room à chaque changement de l'état de la room, jamais à chaque tick.

### 6.3 Boucle de tick

- La boucle ne tourne que pendant `PLAYING`, via `setInterval` de `1000 / SERVER_TICK_RATE` ms.
- `dt` est mesuré avec `performance.now()` et plafonné à `MAX_TICK_DT_MS`.
- À chaque tick :
  1. appliquer les inputs reçus depuis le tick précédent, dans leur ordre d'arrivée ;
  2. appeler `tick(dt)` ;
  3. si `isOver()` : envoyer les événements du tick, arrêter la boucle et passer à `RESULTS` ;
  4. sinon, envoyer à chaque joueur et spectateur connecté `game:view` avec `{ tick, serverTime: Date.now(), view: getViewFor(destinataire) }`. Un spectateur reçoit `getViewFor({ spectator: true })`, jamais la vue d'un joueur ;
  5. puis envoyer les événements émis pendant le tick, par les bots, les inputs et `tick(dt)`, dans leur ordre.

- **Les événements d'un tick partent après ses vues.** Socket.IO jette une vue volatile envoyée pendant qu'un message fiable occupe encore la connexion, dans le même passage du code : envoyé avant les vues, chaque événement coûtait sa vue à toute la room. Mesuré à l'étape 4 : sur 30 événements suivis chacun de sa vue, 30 événements reçus et aucune vue ; dans l'ordre inverse, tout arrive. Un événement émis hors d'un tick (action, déconnexion, retrait, `aborted`) part aussitôt : la vue suivante part un tick plus tard, sur une connexion libre.
- `isOver()` est consulté **après chaque tick et après chaque retrait de joueur** : une partie peut se terminer en dehors d'un tick.

### 6.4 Arène

- Coordonnées logiques : `ARENA_WIDTH` × `ARENA_HEIGHT`, origine en haut à gauche. Le serveur ne raisonne qu'en unités logiques.
- Le client affiche l'arène en gardant le ratio, la plus grande possible dans la zone de jeu, centrée. `scale = largeur affichée / ARENA_WIDTH`, **en pixels CSS**.
- **Écrans haute densité :** le canvas est dimensionné en pixels physiques (`devicePixelRatio`, plafonné à 3) et son contexte mis à l'échelle une fois, de sorte que le code de dessin continue de raisonner en pixels CSS. Cette densité **n'entre jamais** dans la conversion des inputs (section 6.5) : elle ne change que la netteté, jamais la distance parcourue.
- L'écran de jeu ne défile pas : l'arène se dimensionne sur la hauteur disponible sous l'en-tête.

### 6.5 Curseur virtuel (jeux au curseur)

**Capture de la souris**
- Le curseur système est masqué dans l'arène (`cursor: none`).
- Au clic dans l'arène, le client appelle `requestPointerLock()` **sans** `unadjustedMovement`. L'accélération et la sensibilité du système d'exploitation de chaque joueur s'appliquent donc : le curseur virtuel se comporte comme son curseur habituel.
- La sensibilité est commune à tous : `CURSOR_SENSITIVITY`, sans réglage par joueur.
- **Tant que la souris n'a jamais été capturée** dans cette partie : voile d'arène avec « Clique pour capturer ta souris » (`docs/design-system.md`, sections 11.19 et 12). Sans lui, un joueur arrive devant un curseur immobile sans savoir qu'un clic le démarre.
- **Pointer Lock perdu** (Échap, alt-tab) : écran « Clique pour reprendre » (section 11.18). Aucun input n'est envoyé, donc le curseur reste immobile côté serveur, mais **la partie continue derrière le voile** et le rendu ne s'arrête pas. Le mouvement accumulé et pas encore envoyé est oublié : il ne doit pas repartir à la capture suivante, depuis un autre endroit.
- **Le mouvement compte dès la capture.** L'écouteur de `mousemove` reste posé tant que l'écran de jeu est affiché et n'enregistre que pendant la capture. Posé seulement une fois la capture vue par React, il perdait le mouvement de la première image.
- Un spectateur ne voit ni l'un ni l'autre : il n'a pas de curseur, donc aucune capture à demander ni à perdre.

**Inputs**
- Le client convertit chaque `movementX/Y` en unités logiques : `delta / scale × CURSOR_SENSITIVITY`. **`scale` est en pixels CSS**, comme `movementX/Y` : sinon la sensibilité différerait entre un écran Retina et un autre, ce que « la sensibilité est commune à tous » interdit.
- Il additionne ces deltas et envoie `game:input` `{ seq, dx, dy }` toutes les `1000 / INPUT_SEND_RATE` ms si la somme n'est pas nulle.
- `seq` est un entier qui augmente de 1 à chaque envoi. Il repart de 0 au début de chaque partie et à chaque reconnexion — y compris quand une nouvelle connexion reprend la place du joueur (section 4) —, et le serveur remet alors le dernier `seq` traité de ce joueur à −1. **Ces deux moments seulement :** perdre puis retrouver la capture de la souris n'y touche pas, car le compteur du serveur ne bouge pas non plus — repartir de 0 lui ferait rejeter tous les inputs jusqu'à rattraper l'ancien compte. Le serveur ignore tout input dont `seq` est inférieur ou égal au dernier `seq` traité pour ce joueur.
- Schéma Zod : `seq` entier ≥ 0, `dx` et `dy` nombres finis entre −`MAX_INPUT_DELTA` et `MAX_INPUT_DELTA`.

**Déplacement : `shared/cursor/moveCursor.ts`**

Fonction pure utilisée à l'identique par le serveur et par la prédiction client.

- **Budget de déplacement.** Chaque curseur a un budget en unités logiques.
  - Une fois par tick serveur, à la fin de `tick(dt)` et donc avant les inputs du tick suivant : `budget = min(budget + maxSpeed × dt / 1000, maxSpeed × MOVE_BUDGET_CAP_MS / 1000)`.
  - Pour un input de longueur `L` : distance autorisée `A = min(L, budget)`. Le delta est réduit dans la proportion `A / L`, puis `budget -= A`.
  - `maxSpeed` est fourni par le jeu (unités logiques par seconde).
  - **Pourquoi le plafond est court.** Il vaut deux envois (`2 × 1000 / INPUT_SEND_RATE`, arrondi à 66 ms) : assez pour qu'un envoi arrivé en retard ne soit pas tronqué, trop peu pour mettre un geste en réserve. Un plafond de 200 ms laissait une souris immobile accumuler 200 unités, dépensées d'un seul tick au premier coup sec — un bond de 148 px à l'écran avant de retomber au plafond. Mesuré à l'étape 3b.
- **Collisions.** Le curseur est un disque de rayon `radius` fourni par le jeu.
  - Le delta autorisé est découpé en pas d'au plus `MOVE_SUBSTEP` unités.
  - Pour chaque pas : appliquer la composante X ; si le disque chevauche un mur ou sort de l'arène, annuler la composante X de ce pas. Faire de même pour Y. Le curseur glisse ainsi le long des murs.
  - Un mur est un rectangle `{ x, y, width, height }`. Chevauchement : distance entre le centre du disque et le point le plus proche du rectangle strictement inférieure à `radius`.
  - Bords : le centre reste entre `radius` et `ARENA_WIDTH − radius` en X, `radius` et `ARENA_HEIGHT − radius` en Y.

**Rattrapage : `shared/cursor/backlog.ts` (à l'essai)**

Le moteur jette ce que le budget refuse : un geste plus rapide que le plafond arrive court. Le rattrapage le garde à la place, pour que le curseur arrive là où la main l'a envoyé, à la vitesse de la règle. C'est un essai, câblé dans deux jeux : le bac à sable, par son option `catchUpMs`, et Cursor Tag, par sa constante `CATCH_UP_MS`, qui vaut 0 tant que la partie réelle n'a pas tranché (son `rules.md`, section 15.3). À 0, les deux jeux se déplacent exactement comme avec `moveCursor`.

- `moveWithBacklog` paie ensemble le **reste** des déplacements précédents et le nouveau geste, avec le budget, par la règle de `moveCursor`. Ce que le budget refuse est gardé, dans la limite d'une **laisse** de `maxSpeed × catchUpMs / 1000` unités, puis payé par les inputs et les ticks suivants. Avec une laisse nulle, le résultat est exactement celui de `moveCursor`.
- **Le reste n'est pas du budget.** Il est payé par le même budget que tout le reste, et le tick paie le reste **avant** de recharger le budget. Un curseur ne va donc jamais plus loin en un tick qu'aujourd'hui : dans l'ordre inverse, un curseur resté immobile irait une fois et demie plus loin au premier tick de son geste. La laisse borne en outre ce qu'un client peut faire jouer après son dernier input.
- **Contre un mur ou un bord**, la part du reste arrêtée sur un axe est jetée et l'autre gardée : le reste glisse le long du mur comme le curseur, au lieu d'y pousser en brûlant le budget.
- **Le reste vient de la vue**, dans `me`, comme le budget et pour la même raison : le serveur en a autorité, et un reste tenu par le client dériverait au premier input perdu. La prédiction repart du reste officiel et le paie avec le budget qui se recharge entre deux vues : le curseur glisse entre les vues au lieu d'avancer par marches. Un jeu dont la vue est compacte (section 7) ne l'envoie que lorsqu'il n'est pas nul.
- Remis à zéro là où le budget l'est : au début de la partie et à chaque reconnexion, reprise de place comprise (section 4). Chaque jeu y ajoute ce que ses règles demandent : Cursor Tag le remet aussi à zéro au gel, à la téléportation et au début de chaque manche.
- **La laisse suit la vitesse du joueur** à chaque déplacement : un jeu où la vitesse change avec le rôle (Cursor Tag) ramène un reste devenu trop long à la nouvelle laisse au déplacement suivant.
- **Un jeu qui teste des contacts sur le trajet du tick paie le reste avant ce test**, puis vérifie ce qui dépend de la position (les portails de Cursor Tag). Sinon le trajet payé ne serait jamais testé, et la position testée ne serait pas celle que montre la vue.

**Prédiction du curseur local**
- Chaque vue contient la position officielle du joueur, le dernier `seq` traité **et son budget de déplacement**. Le budget vient de la vue, comme la position : le serveur en a autorité (règle d'or 1), et un budget tenu localement dériverait au premier input perdu.
- À réception d'une vue, le client repart de la position, du budget et du reste officiels, puis rejoue avec `moveWithBacklog` (qui est `moveCursor` tant que rien n'est gardé) ses inputs envoyés mais pas encore traités, et enfin le delta en cours d'accumulation.
- **Le rejeu suit le rythme des envois**, parce que c'est à ce rythme que les inputs arrivent au serveur. Chaque input reçoit le budget que le serveur aura rechargé depuis le précédent, c'est-à-dire l'écart entre leurs heures d'envoi ; le premier reçoit le temps écoulé depuis le tick de la vue. Le budget de la vue est celui que le serveur dépensera à son tick suivant : au tick de la vue même, il avait une recharge de moins. Sur l'horloge des envois, le tick de la vue se situe un délai d'acquittement avant l'arrivée de la vue ; ce délai est le plus court mesuré sur les derniers acquittements (`client/engine/inputLedger.ts`). Avant le premier acquittement, un tick est supposé.
  - **Pourquoi pas une seule recharge depuis la vue**, comme au départ : quand les vues cessent d'arriver — un paquet perdu, que TCP retient puis livre d'un bloc avec tout ce qui le suit —, le serveur continue d'appliquer les inputs, mais une recharge unique plafonnée à la réserve fige la prédiction, et la vue qui finit par arriver la fait bondir. Mesuré à l'étape 3b : un saut à chaque trou de 200 ms ou plus, et un curseur figé jusqu'à 380 ms pendant le trou.
- **Inputs retenus en route.** Un input qu'une vue aurait dû acquitter — envoyé plus d'un délai d'acquittement et deux ticks avant son tick — et qu'elle n'a pas acquitté est retenu sur la voie montante : tout ce qui le suit arrivera au serveur d'un bloc, payé sur le budget d'un seul tick. Le rejeu pose ces inputs ensemble et retient avec eux le delta en cours. C'est le cas inverse du précédent : le client ne voit une voie montante bouchée qu'au bout d'un aller-retour, et d'ici là il suppose ses inputs arrivés ; l'erreur est bornée par cet aller-retour et reprise en douceur, alors que supposer l'inverse ferait une erreur qui grandirait avec la durée du trou.
- **Affichage du curseur local.** La position dessinée est la position prédite **plus un décalage** qui s'efface en `CORRECTION_SMOOTHING_MS`, et non une position qui glisse vers la prédiction.
  - À l'arrivée d'une vue, la prédiction est calculée deux fois au même instant : une fois avec la vue précédente, une fois avec la nouvelle. Leur différence est ce que le serveur a corrigé, et elle seule ; le mouvement du joueur est dans les deux et s'annule.
  - Cette différence s'ajoute au décalage, qui décroît ensuite vers zéro. Le geste du joueur est donc dessiné immédiatement et en entier ; seule la correction est lissée.
  - **Pourquoi pas un glissement vers la prédiction :** il lisse aussi le geste du joueur, le curseur traîne derrière la main de tout le temps de lissage, et au-delà d'environ 580 unités par seconde ce retard dépasse le seuil de reprise immédiate : le curseur est alors téléporté sept à quinze fois par seconde. Mesuré à l'étape 3b.
  - Une correction supérieure à **deux fois la réserve de budget plus un aller-retour de déplacement** (`2 × maxSpeed × MOVE_BUDGET_CAP_MS / 1000 + maxSpeed × délai d'acquittement / 1000`) est reprise d'un coup. Une correction est la différence entre deux prédictions, chacune à une réserve près de la position que sa propre vue lui a donnée, plus ce que le rejeu a d'avance sur le serveur : au plus un aller-retour de déplacement, repris d'un coup quand une vue montre des inputs retenus en route. Au-delà, c'est le jeu qui a déplacé le curseur, et lisser sur toute l'arène serait pire qu'arriver. Le plus court saut de portail de Cursor Tag, 1511 unités, reste loin au-dessus.
- Les effets décidés par le jeu (gel, téléportation) viennent uniquement du serveur. Le client ne les prédit pas.

**Affichage des autres curseurs**
- Le client garde les vues reçues des `INTERPOLATION_BUFFER_MS` dernières millisecondes.
- Temps d'affichage : `serverTime de la dernière vue + (maintenant − heure de réception de cette vue) − INTERPOLATION_DELAY_MS`.
- La position est interpolée linéairement entre les deux vues qui encadrent ce temps. S'il n'en existe pas de plus récente, la dernière position connue est affichée.
- Si la distance entre deux positions successives d'un joueur dépasse `TELEPORT_SNAP_DISTANCE`, aucune interpolation : la nouvelle position est affichée directement.

## 7. Interface d'un jeu

```ts
// src/games/gameServer.types.ts
interface GameMeta {                 // games/<id>/shared/meta.ts, lue aussi par le client
  id: string;                        // ex. "cursor-tag"
  name: string;                      // nom affiché, en français
  description: string;               // une phrase, pour la carte de jeu (design system, 11.7)
  minPlayers: number;
  maxPlayers: number;
}

interface GameDefinition<Input, Action, View, Options> {
  meta: GameMeta;
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
interface GameClientDefinition {      // frontières en `unknown`, comme RegisteredGame côté serveur
  meta: GameMeta;                     // le même objet que la définition serveur
  Icon: React.ComponentType;          // la marque de 48 px de la carte de jeu (design system, 11.7)
  Preview: React.ComponentType;       // l'image fixe de l'arène dans le lobby (design system, 13)
  scoreHint: string;                  // la phrase du jeu dans la colonne « Le jeu »
  Screen: React.FC<{
    viewStore: ViewStore;              // buffer des vues, lu par le moteur sans re-render
    sendInput(input: unknown): void;
    sendAction(action: unknown): Promise<{ ok: boolean }>;
    me: { playerId: string } | { spectator: true }; // spectateur aussi pour un arrivant en cours de partie
    options: unknown;                  // les options du jeu, lues dans room:state
    players: ReadonlyArray<{ playerId: string; pseudo: string; color: PlayerColorId }>;
    onLeave(): void;                   // l'écran possède ce qui se pose sur l'arène (11.18, 11.19)
  }>;
  OptionsForm: React.FC<{               // affiché dans le lobby, modifiable par l'hôte uniquement
    options: unknown;
    playerCount: number;
    editable: boolean;
    onChange(options: unknown): void;
  }> | null;                            // null si le jeu n'a pas d'option
}
```

- **`meta` est déclarée une seule fois**, dans `games/<id>/shared/meta.ts` : `id`, `name`, `description`, `minPlayers`, `maxPlayers`. La définition serveur et la définition client la lisent toutes les deux. Deux copies d'un nombre de joueurs finiraient par diverger, et le lobby refuserait un jeu qu'il vient de proposer.
- **`defineGame` transmet aussi le `bot`.** Sa sortie n'est validée par aucun schéma : elle vient du code du serveur, pas du réseau, et la règle d'or 3 ne vise que les messages entrants.
- **Reconnexion d'un joueur :** dans `onPlayerReconnect`, un jeu au curseur doit remettre son `lastProcessedSeq` à −1 et son budget à 0. Le client qui revient repart de `seq` 0 (section 6.5) ; sans cette remise à zéro, le serveur ignorerait tous ses inputs jusqu'à ce qu'il rattrape l'ancien compteur. `onPlayerReconnect` est appelé à **chaque nouvelle connexion** à la place d'un joueur : après une déconnexion, mais aussi quand un autre onglet reprend la place, ou qu'une reconnexion arrive avant que le serveur ait vu mourir l'ancienne connexion (section 4). Dans ces deux derniers cas, aucun `onPlayerDisconnect` ne le précède.
- **Vue compacte, pour tout jeu temps réel.** La vue part à chaque tick, à chaque joueur : c'est de loin le premier poste de trafic sortant, et ce trafic est limité (section 1). Elle est donc écrite pour être petite, pas pour être agréable à lire :
  - clés d'une ou deux lettres plutôt que des noms complets ;
  - positions arrondies à l'entier, et plus généralement aucune décimale qui ne se verrait pas à l'écran. Seule exception : ce dont repart la prédiction du destinataire (sa position, son budget, son reste), qui garde la précision dont elle a besoin (Cursor Tag : le dixième, son `rules.md` 8.2) ;
  - listes de joueurs en tableaux de valeurs (`[x, y, role]`) plutôt qu'en objets répétant leurs clés ;
  - rien qui ne change pas d'un tick à l'autre, ni rien que le client tient déjà de `room:state` (pseudos, couleurs) ou de son `map.ts`.
  - **Budget : environ 500 octets pour 10 joueurs**, trame Socket.IO comprise. C'est la taille mesurée de la vue de Cursor Tag à l'étape 4 : environ 235, 305 et 490 octets à 3, 5 et 10 joueurs pendant une manche (540 dans le pire cas à 10), moins pendant une préparation. Sur le quota de 5 Go (section 1), cela laisse environ 67 heures de jeu par mois à 3 joueurs, 30 à 5 et 9 à 10.
  - La cible de départ, 200 octets, n'est pas atteignable en JSON : l'enveloppe de `game:view` en prend déjà 64, et un identifiant de joueur 14. La vue ne sera réduite davantage (numéros de joueur à la place des identifiants, vue binaire) que si le trafic relevé sur Render le demande (section 1).
  - **Le volume est mesuré avant de clore l'étape du jeu**, et le chiffre est reporté dans le rapport de l'étape. Une vue qui dépasse largement le budget se corrige avant la fusion, pas après.
  - Le bac à sable (`games/sandbox`) **n'y est pas soumis** : réservé au développement, il n'est jamais enregistré en production et ne consomme donc rien sur Render. Sa vue reste lisible plutôt que compacte.
- **`ViewStore`** : son contrat est déclaré dans `games/gameView.types.ts`, à côté de l'interface de jeu, et implémenté dans `client/engine/viewStore.ts` — le moteur peut atteindre les types d'un jeu, un jeu ne peut pas atteindre le moteur. Il garde les vues des `INTERPOLATION_BUFFER_MS` dernières millisecondes avec leur heure de réception, et expose :
  - `latest()` : le dernier échantillon reçu, ou `null` ;
  - `sampleAt(serverTime)` : **les deux échantillons qui encadrent cet instant et le facteur entre eux**, jamais une position. Le temps est celui du serveur (`GameViewPayload.serverTime`). Le moteur ne sait pas lire une vue : c'est le code du jeu qui en extrait ce qu'il connaît, avec les fonctions pures de `client/engine/`.
- **Les frontières du client sont en `unknown`**, comme celles de `RegisteredGame`. Contrairement au serveur il n'y a rien à valider ici — une vue vient de notre propre serveur, pas du réseau — et chaque jeu reconnaît la sienne avec une garde de type, jamais une conversion forcée.
- Le serveur appelle `onInput` et `onAction` uniquement pour les joueurs de la partie, jamais pour les spectateurs.
- **Registre des jeux :** le serveur garde des jeux dont les types `Input`, `Action`, `View` et `Options` diffèrent. `games/defineGame.ts` convertit une `GameDefinition` typée en une entrée dont les frontières sont en `unknown`, chaque valeur étant validée par le schéma Zod du jeu avant de lui être transmise. C'est le seul endroit du code avec une conversion de type forcée.

## 8. Bots (développement uniquement)

- Disponibles uniquement si `NODE_ENV !== "production"`.
- Ajoutés et retirés par l'hôte depuis un panneau de développement dans le lobby.
- Pseudo `Bot 1`, `Bot 2`… couleur attribuée comme pour un joueur.
- Un bot est un faux joueur côté serveur : à chaque tick, `BotRunner` appelle `nextInput` et `nextAction` avec la vue du bot, et transmet les résultats non nuls à `onInput` et `onAction`, comme pour un joueur.
- Les bots comptent dans la capacité de la room et ne peuvent pas être hôtes.
- **Un bot est toujours prêt**, dès sa création et après chaque retour au lobby. Il n'attend personne, et Cursor Tag le fait déjà se déclarer prêt dès le début d'une préparation (`rules.md`, section 4.1). Sans cela, l'hôte d'une room de bots devrait cliquer « Lancer quand même » sans raison.
- Un bot ne peut être ajouté que **dans le lobby** : pendant une partie, un arrivant est spectateur (section 5.4) et un bot n'aurait rien à jouer. Il peut être retiré à tout moment.
- Les événements `dev:*` sont **refusés** en production plutôt qu'ignorés en silence : un accusé de réception qui n'arrive jamais laisserait l'appelant en attente.

### 8.1 Simulateur de latence

- **Développement uniquement.** `?lag=200` sur n'importe quelle URL du site retarde de 200 ms **tout ce que le client envoie et tout ce qu'il reçoit**. Une demande avec accusé coûte donc deux fois la latence, comme sur un vrai réseau. Seule exception : l'avis de session remplacée (section 4), que le serveur fait suivre aussitôt d'une coupure de la connexion, que le simulateur ne peut pas retarder.
- Lu **une seule fois** au chargement de la page, donc conservé en passant de l'accueil à la room. Borné par `MAX_SIMULATED_LAG_MS`, pour qu'un chiffre saisi à la main ne fige pas la page.
- Ouvrir un onglet avec `?lag=` et un autre sans, sur la même room, est la façon de voir travailler la prédiction et l'interpolation : dans l'onglet ralenti, ton propre curseur reste collé à ta souris pendant que les autres accusent leur retard.
- **Trous.** `?holeIn=250` et `?holeOut=250` ouvrent, toutes les `SIMULATED_HOLE_EVERY_MS`, un trou de 250 ms dans un sens : rien ne passe, puis tout ce qui a été retenu passe d'un coup, dans l'ordre, comme après un paquet perdu. Il repart un message par tâche : relâchés dans le même passage du code, les inputs volatils auraient été jetés par Socket.IO sauf le premier (6.2), et le trou aurait simulé une perte au lieu d'une rafale. `holeIn` retient ce que le client reçoit (les vues et les réponses), `holeOut` ce qu'il envoie (les inputs et les demandes). Le trou occupe la fin de chaque période : le premier arrive quelques secondes après le chargement, le temps de rejoindre une room. Combinables avec `?lag`, bornés comme lui.
- **Pourquoi des trous et pas seulement `?lag`** : `?lag` retarde chaque message du même délai, donc les vues gardent leur espacement de 33 ms. Il ne reproduit jamais ce qu'un réseau réel fait après une perte, et que le moteur doit encaisser (section 6.5).
- Comme les bots, tout cela quitte le build de production : la branche est gardée par `import.meta.env.DEV`.

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
- Tests de bout en bout sur une vraie socket (`src/server/socket/`) : un serveur sur un port local, des clients Socket.IO et la vraie boucle de tick. Cursor Tag y joue une partie jusqu'à `game:results`, avec une manche raccourcie par ses réglages, ainsi qu'une déconnexion et une reconnexion.

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
| `MOVE_BUDGET_CAP_MS` | `66` |
| `MOVE_SUBSTEP` | `7` |
| `INTERPOLATION_DELAY_MS` | `100` |
| `INTERPOLATION_BUFFER_MS` | `1000` |
| `CORRECTION_SMOOTHING_MS` | `100` |
| `TELEPORT_SNAP_DISTANCE` | `200` |
| `ARENA_WALL_RADIUS` | `8` |
| `MAX_SIMULATED_LAG_MS` | `2000` |
| `SIMULATED_HOLE_EVERY_MS` | `3000` |
| `SOCKET_PING_INTERVAL_MS` | `5000` |
| `SOCKET_PING_TIMEOUT_MS` | `5000` |
| `RATE_LIMIT_MESSAGES_PER_SECOND` | `60` |
| `RATE_LIMIT_KICK_AFTER_MS` | `5000` |
| `MAX_MESSAGE_BYTES` | `16384` |
| `MAX_JOIN_FAILURES_PER_MINUTE` | `10` |

Les valeurs de gameplay (vitesses, rayons, durées) sont des points de départ réglables après les tests avec le groupe. Toute modification passe par ce tableau ou par le `rules.md` du jeu.

## 14. À DÉCIDER

Aucun point en attente.