# Games Party — instructions pour Claude Code

## Le projet

Site de mini-jeux multijoueurs en temps réel pour un groupe d'amis qui joue ensemble en vocal sur Discord. Un joueur crée une room, colle le lien dans Discord, tout le monde rejoint, puis l'hôte lance les jeux les uns après les autres.

Premier jeu : **Cursor Tag**, un jeu du chat où chaque joueur contrôle un curseur.

Priorités, dans cet ordre :
1. Fiabilité et fluidité pendant les parties
2. Sécurité
3. Code clair, lisible et bien rangé
4. Qualité du design et de l'expérience
5. Vitesse de développement

C'est un projet entre amis : pas de comptes utilisateurs, pas de base de données, pas d'infrastructure complexe.

## Travailler avec moi

- Je connais les bases de React mais je ne suis pas à l'aise avec les choix techniques. **Explique chaque choix technique non trivial en 2-3 phrases simples.**
- Quand plusieurs approches sont valables, présente 2 ou 3 options avec leurs avantages et inconvénients, donne ta recommandation, puis **attends ma décision**.
- Si une information manque, ou si un document contient un point marqué **À DÉCIDER** : pose la question. N'invente jamais une règle de jeu ni un comportement du produit.
- **Aucune nouvelle dépendance sans mon accord** (voir la liste autorisée plus bas).
- Code simple et lisible plutôt qu'astucieux. Pas d'abstraction « au cas où ».
- Avance par petites tâches. Toute tâche qui touche plus de 2 ou 3 fichiers commence par un plan que je valide. Ce plan liste les fichiers à créer ou modifier et la couche de chacun (voir « Organisation du code »).
- Si une décision documentée doit changer, propose la mise à jour du document concerné au lieu de t'en écarter en silence.
- Échanges avec moi : en français.

## Stack

- **TypeScript 6.0** en mode strict, partout. Ne pas passer à TypeScript 7 tant que typescript-eslint ne le supporte pas officiellement.
- **Client** : React + Vite, react-router, Tailwind CSS
- **Serveur** : Node.js 24 (LTS, fixé par `engines.node` à `24.x` dans `package.json`, identique en local et sur Render ; en local, `nvm use` dans le dossier du projet) + Express + Socket.IO
- **Validation** : Zod
- **Tests** : Vitest
- **Qualité** : ESLint (typescript-eslint, règles des hooks React, restrictions d'import par couche) + Prettier
- **Hébergement** : Render (Web Service gratuit, région Frankfurt), déploiement automatique depuis `main`

Dépendances autorisées :
- Production : `react`, `react-dom`, `react-router`, `socket.io`, `socket.io-client`, `express`, `helmet`, `zod`, `nanoid`
- Développement : `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss` et son plugin Vite officiel, `vitest`, `esbuild`, `tsx`, `concurrently`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `prettier`, `eslint-config-prettier`, et les paquets `@types/*` correspondants

Toute autre dépendance : demander.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance le client Vite (port 5173) et le serveur (port 3000) en parallèle. Vite redirige `/socket.io` vers le serveur. |
| `npm run build` | Build du client (Vite → `dist/client`) et bundle du serveur (esbuild → `dist/server.js`) |
| `npm start` | Lance `dist/server.js`, qui sert le site et Socket.IO sur `process.env.PORT` |
| `npm test` | Tests Vitest |
| `npm run typecheck` | Vérification TypeScript des deux projets : `tsconfig.client.json` (types du DOM) puis `tsconfig.server.json` (types de Node) |
| `npm run lint` | ESLint, y compris le respect des couches |
| `npm run format` | Prettier sur le code et les fichiers de configuration. Les fichiers Markdown (`*.md`) sont exclus pour que la documentation reste telle qu'écrite. |

## Organisation du code

### Arborescence

```
CLAUDE.md
.nvmrc                          version de Node du projet (24), lue par `nvm use`
render.yaml                     configuration Render versionnée (Blueprint)
tsconfig.json                   configuration racine pour l'éditeur
tsconfig.client.json            client + code commun, types du DOM, sans types Node
tsconfig.server.json            serveur + code commun, types de Node, sans types du DOM
eslint.config.js
docs/
  architecture.md               rooms, identité, réseau, interface des jeux, sécurité, constantes
  design-system.md              tokens, composants, règles visuelles (source de vérité du design)
  maquettes/                    maquettes HTML de Claude Design (référence visuelle uniquement)
  games/_template.md            modèle de fiche de jeu
src/
  shared/                       code commun client + serveur (aucun effet de bord)
    protocol.ts                 types de tous les événements Socket.IO
    schemas.ts                  schémas Zod des messages communs
    constants.ts                constantes réseau, room, arène
    types.ts                    types métier communs (Player, RoomState…)
    snapToStep.ts               options des jeux : bornes, pas, égalité au pas inférieur
    shuffle.ts                  mélange tiré de l'aléa fourni, jamais de Math.random
    cursor/
      collision.ts              disque contre mur, disque contre bords
      moveCursor.ts             déplacement d'un curseur (budget, murs, bords)
      backlog.ts                rattrapage : le reste d'un geste coupé, payé ensuite (bac à sable)
      clearHeading.ts           direction d'un bot libre de murs et de bords
      cursorInput.ts            type et schéma de `game:input`
  server/
    index.ts                    démarrage uniquement : assemble http + socket
    http/
      createHttpApp.ts          Express : helmet, fichiers statiques, /healthz
    socket/
      createSocketServer.ts     configuration Socket.IO
      startMaintenance.ts       balayage des rooms vides et des sessions inactives
      middleware/               session.ts, rateLimit.ts
      handlers/                 roomHandlers.ts, lobbyHandlers.ts, gameHandlers.ts
    rooms/                      logique des rooms, sans Socket.IO
      RoomManager.ts
      Room.ts
      roomStateMachine.ts
      ranking.ts
    sessions/
      SessionStore.ts
    bots/
      BotRunner.ts              joue les bots d'une room, un tour par tick
  client/
    main.tsx                    point d'entrée
    app/
      App.tsx
      router.tsx
    pages/                      une page par route, assemblage uniquement
      HomePage.tsx
      RoomPage.tsx
      NotFoundPage.tsx
    features/                   fonctionnalités de l'application
      appShell/                 en-tête, messages qui remplacent tout le contenu
        components/             AppShell.tsx, AppHeader.tsx, ReplacedMessage.tsx…
      connection/
        components/             ConnectionStatus.tsx…
        hooks/                  useConnectionStatus.ts…
      devTools/                 développement uniquement : panneau de bots du lobby
        components/             DevTools.tsx, BotPanel.tsx
        hooks/                  useBots.ts
      game/                     écran de jeu, voiles, capture de la souris
        components/             GameHost.tsx, CaptureVeils.tsx, PauseOverlay.tsx, CaptureInvite.tsx…
        hooks/                  useGameView.ts, usePointerLock.ts, useCursorInputs.ts, usePredictionProbe.ts…
      demo/
        components/             DemoArena.tsx (illustration fixe de l'arène)
      home/
        components/             HomeScreen.tsx, HeroCard.tsx, PseudoForm.tsx
      notifications/
        notificationsContext.ts contexte partagé par la coquille et les écrans
        components/             NotificationHost.tsx
        hooks/                  useNotifications.ts, useNotifier.ts…
      room/
        errorMessages.ts        ce que chaque refus du serveur affiche
        components/             LobbyScreen.tsx, PlayerList.tsx, ColorPalette.tsx…
        hooks/                  useRoom.ts, useRoomActions.ts…
      session/
        hooks/                  useSession.ts, useStoredPseudo.ts
      sound/
        hooks/                  useSoundPreference.ts
      uiGallery/                développement uniquement : sections de /dev/ui
        components/             ButtonsSection.tsx, LobbySection.tsx…
    components/
      ui/                       composants du design system, sans logique métier
    hooks/                      hooks génériques (useModalDialog.ts, usePointerCapability.ts…)
    services/                   effets de bord hors React
      socketClient.ts           connexion typée, jeton du handshake, abonnements
      roomRequests.ts           une fonction par message envoyé au serveur
      gameRequests.ts           inputs, actions et les deux événements de développement
      delayedTransport.ts       la latence et les trous simulés, appliqués dans les deux sens
      simulatedLatency.ts       lit `?lag`, `?holeIn`, `?holeOut` une fois au démarrage (développement)
      sessionIdentity.ts        dernière identité reçue, relue par un abonné tardif
      sessionStorage.ts         jeton de session
      preferences.ts            pseudo, couleur préférée, son
      clipboard.ts
      pointerCapability.ts      détection d'un appareil sans souris
      audio.ts
    engine/                     moteur temps réel, sans React
      pointerLock.ts            capture de la souris
      arenaScale.ts             taille de l'arène et du canvas
      arenaTheme.ts             couleurs et tailles lues dans les variables CSS
      canvasSurface.ts          dimensionnement en pixels physiques
      renderLoop.ts             boucle `requestAnimationFrame`
      inputAccumulator.ts       mouvements de souris en unités logiques
      inputSender.ts            envoi à `INPUT_SEND_RATE`, numérotation, acquittement
      inputLedger.ts            inputs en attente, heures d'envoi, délai d'acquittement
      viewStore.ts              tampon des vues reçues
      interpolation.ts          position des autres curseurs
      prediction.ts             rejeu des inputs non traités
      correction.ts             rapprochement du curseur affiché
      ownCursor.ts              le curseur local : acquittement, prédiction, correction, image
      portalLoop.ts             boucle portail : phase, courbe, animations réduites
      drawArenaGround.ts        sol et murs de l'arène, découpés à son rayon
      drawCursor.ts             disque, anneau de ton curseur, étiquette de pseudo
      drawPortal.ts             anneau et lettre d'un portail, pulsation, recharge
      predictionStats.ts        relevé de développement (F9) : fenêtre de 3 s et maxima de partie
      gestureMeter.ts           pointe du geste et rattrapage, cadre par cadre (développement)
    utils/                      fonctions pures génériques, nommées par sujet
                                (lobbyPlayers.ts, readyCounter.ts, roomUrl.ts, gameViewer.ts, captureVeil.ts…)
  games/
    gameServer.types.ts         interfaces GameDefinition, GameInstance…
    gameClient.types.ts         interface GameClientDefinition
    gameMeta.ts                 nom, description et bornes, lus des deux côtés
    gameView.types.ts           contrat du tampon de vues, implémenté par le moteur
    defineGame.ts               efface les types d'un jeu pour le registre
    registry.server.ts
    registry.client.ts
    fakeGame.fixture.ts         jeu minimal, utilisé par les tests uniquement
    sandbox/                    développement uniquement : bac à sable du moteur curseur
      rules.md
      shared/                   meta.ts, constants.ts, types.ts, schemas.ts
      logic/                    sandboxState.ts, sandboxView.ts + tests
      server/                   SandboxGame.ts, bot.ts, sandboxDefinition.ts
      client/                   SandboxScreen.tsx, hooks/, render/
    cursor-tag/
      rules.md                  règles du jeu (source de vérité du gameplay)
      shared/                   meta.ts, constants.ts, types.ts, schemas.ts, map.ts
      logic/                    fonctions pures du jeu + leurs tests
      server/                   CursorTagGame.ts (orchestration), bot.ts, cursorTagDefinition.ts
      client/
        cursorTagClient.ts      définition client du jeu (icône, aperçu, écran, formulaire)
        CursorTagScreen.tsx     composant racine du jeu
        pauseWarning.ts         l'avertissement de « Clique pour reprendre », selon le rôle
        components/             CursorTagOptionsForm.tsx, CursorTagPreview.tsx, ArenaScene.tsx…
        hooks/                  useCursorTagRenderer.ts, useTagRoundState.ts, useArenaScene.ts…
        render/                 drawTagArena.ts, drawTagCursors.ts, drawRoleMarks.ts, tagFrame.ts,
                                tagDrawables.ts
```

### Rôle de chaque couche

| Couche | Contient | N'a pas le droit de |
|---|---|---|
| `client/pages` | Assemblage des features pour une route | Contenir de la logique, appeler un service |
| `client/features/*/components`, `client/components/ui`, `games/*/client/components` | Affichage et réception des actions utilisateur | Appeler Socket.IO, `localStorage` ou un service directement ; contenir des règles métier |
| `client/components/ui` | Composants génériques du design system | Importer une feature ou un jeu |
| `*/hooks` | État React et effets qui relient services et composants | Contenir du JSX ; contenir des règles de jeu |
| `client/services` | Effets de bord hors React : socket, stockage, audio. Seule couche autorisée à utiliser `localStorage` et `sessionStorage`. | Importer React |
| `client/engine`, `games/*/client/render` | Boucle temps réel, Pointer Lock, interpolation, dessin canvas | Importer React |
| `client/utils`, `shared/`, `games/*/logic`, `games/*/shared` | Fonctions pures et types | Faire des effets de bord (réseau, DOM, stockage, timers, `Math.random`) |
| `server/socket/handlers` | Transport : valider (Zod), appeler la room, répondre | Contenir des règles de room ou de jeu |
| `server/sessions` | Identité d'un navigateur : jetons, liaison au socket, péremption | Importer Socket.IO ou Express |
| `server/rooms`, `games/*/server` | Logique de room et orchestration des jeux | Importer Socket.IO ou Express |

### Sens des imports

- `pages` → `features` → `components/ui`, `hooks`
- `hooks` → `services`, `engine`, `utils`, `shared`
- `server/socket/handlers` → `server/rooms` → `games/*/server` → `games/*/logic` → `shared`
- Le client n'importe jamais `src/server/` ni `games/*/server/`. Le serveur n'importe jamais `src/client/` ni `games/*/client/`.
- Le code commun (`src/shared/`, `games/*/shared/`, `games/*/logic/`) est inclus dans **les deux** projets TypeScript. Il doit donc compiler sans types du DOM et sans types de Node : un `document` ou un `process` dans ce code fait échouer le typecheck.
- Rien n'importe `pages`. `components/ui` n'importe aucune feature ni aucun jeu.

Ces restrictions sont vérifiées par `npm run lint` (`no-restricted-imports` par dossier). Ne jamais les désactiver avec un commentaire `eslint-disable`.

### Conventions de nommage et de fichiers

- Composants : `PascalCase.tsx`, un composant exporté par fichier.
- Hooks : `useCamelCase.ts`, un hook exporté par fichier.
- Classes : `PascalCase.ts`. Autres fichiers : `camelCase.ts`.
- Tests à côté du fichier testé : `nomDuFichier.test.ts`. Les données et outils partagés par plusieurs tests : `nomDuFichier.fixture.ts`, jamais importés par le code de production.
- Exports nommés uniquement, pas d'`export default`.
- Imports sans extension de fichier. Seule exception : `vite.config.ts`, qui importe avec l'extension `.ts` (exigence de Vite).
- **Interdit :** les fichiers fourre-tout nommés `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts` ou `index.ts` de réexport. Un fichier est nommé d'après ce qu'il contient (`formatDuration.ts`, `geometry.ts`).
- Un fichier qui dépasse 200 lignes doit être découpé. Propose le découpage avant de l'écrire.
- Pas de code mort ni de code commenté.

## Règles d'or

1. **Le serveur fait autorité.** Le client envoie des intentions (inputs), jamais de positions finales, de scores ou de résultats. Le serveur n'accepte jamais un identifiant de joueur envoyé par le client : il utilise la session liée au socket.
2. **Chaque joueur ne reçoit que ce qu'il a le droit de voir.** Tout état de jeu envoyé passe par `getViewFor`. Ne jamais diffuser l'état interne brut d'un jeu.
3. **Chaque message entrant est validé par un schéma Zod.** Un message invalide est ignoré (et loggé en développement). Il ne fait jamais planter le serveur.
4. **Les données haute fréquence ne passent jamais par React.** Positions, curseurs et tout ce qui change plusieurs fois par seconde : pas de `useState`, pas de contexte. On utilise des refs et un canvas redessiné dans `requestAnimationFrame`. React sert uniquement à l'UI (lobby, menus, scores, overlays).
5. **Pas de `dangerouslySetInnerHTML`.** Les pseudos et tout texte venant d'un joueur sont affichés comme du texte.
6. **Pas de valeurs magiques.** Toutes les valeurs chiffrées viennent de `src/shared/constants.ts` ou de `games/<jeu>/shared/constants.ts`, avec les valeurs exactes données dans la documentation.
7. **L'aléatoire des jeux passe par `GameContext.random`**, jamais par `Math.random`, pour que les tests soient reproductibles.
8. **Langues.** Textes de l'interface en français. Code, noms, commentaires et commits en anglais.
9. **Design.** Utiliser uniquement les tokens et les composants de `docs/design-system.md` : aucune couleur, taille, espacement, rayon, ombre ou durée en dur. Les maquettes de `docs/maquettes/` servent de référence visuelle ; **en cas de différence entre une maquette et `docs/design-system.md`, c'est `docs/design-system.md` qui gagne**. Ne jamais recopier une valeur relevée dans une maquette sans la vérifier dans ce document.
10. **Cible : PC avec souris**, navigateurs de bureau récents. Sur mobile, afficher un message indiquant que le site se joue sur ordinateur.

## Ajouter un jeu

1. `games/<id>/rules.md` doit exister, suivre `docs/games/_template.md` et ne contenir aucun point **À DÉCIDER**. Sinon : poser les questions.
2. Créer le dossier du jeu en respectant l'arborescence de `cursor-tag`.
3. Écrire les règles dans `logic/` sous forme de fonctions pures, avec leurs tests, **avant** l'orchestration serveur et le client.
4. Enregistrer le jeu dans `registry.server.ts` et `registry.client.ts`.

## Définition de « terminé »

- `npm run typecheck`, `npm run lint` et `npm test` passent.
- La logique de jeu est couverte par des tests : déplacements, collisions, score, fin de manche.
- Testé manuellement avec 3 onglets ou des bots, **y compris la déconnexion et la reconnexion d'un joueur**.
- Tout nouveau composant d'interface est ajouté à la page `/dev/ui`, dans tous ses états.
- Relecture faite au regard des règles d'or 1 à 5 et de la section « Organisation du code ».
- Documentation mise à jour si une décision a changé.

## Git

- Une branche par étape : `step/01-skeleton`, `step/02-rooms`, etc.
- Commits en anglais, au format conventionnel : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Ne commit qu'après ma validation. Jamais de push direct ni de force-push sur `main`. La fusion dans `main` déclenche le déploiement sur Render.

## Documentation de référence

- `docs/architecture.md` : à lire avant toute tâche serveur, réseau, room ou moteur curseur.
- `docs/design-system.md` : à lire avant toute tâche d'interface.
- `docs/maquettes/` : ouvrir l'écran concerné (dans un navigateur, avec `support.js` dans le même dossier) avant toute tâche d'interface, pour la disposition et la hiérarchie visuelle.
- `src/games/<jeu>/rules.md` : à lire avant toute tâche sur un jeu.

## Feuille de route

- [x] **Étape 0 : documentation**
- [x] **Étape 1 : squelette.** Client + serveur + Socket.IO, ESLint et Prettier configurés, page affichant « connecté », déployée sur Render.
- [x] **Design system**, réalisé avec Claude Design, puis `docs/design-system.md`.
- [x] **Étape 2a : design system dans le code.** Tokens (`@theme`), polices hébergées, icônes, logo, composants de base de `client/components/ui/`, page de démonstration `/dev/ui` (développement uniquement).
- [x] **Étape 2b : rooms côté serveur.** Sessions, création, aperçu, rejoindre, lobby, statut prêt, options des jeux, hôte, spectateurs, reconnexion, départ, classement cumulé, avec leurs tests.
- [x] **Étape 2c : écrans de l'accueil et du lobby.** Accueil, invitation, erreurs, lobby (joueurs, palette, jeu, réglages, prêt, lancement), confirmation « Quitter la room », notifications, message « ordinateur uniquement » (règle d'or 10). Resserrer la CSP (`style-src` sans `'unsafe-inline'`) une fois ces écrans construits.
- [x] **Étape 3 : moteur curseur.** Pointer Lock, curseur virtuel, arène, synchronisation, prédiction, interpolation, bots.
- [ ] **Étape 4 : Cursor Tag complet.** Écran de jeu, préparation, écran de résultats.
- [ ] **Étape 5 : finitions.** Sons, animations, transitions, démo animée de chaque jeu (accueil et lobby, jouée par le moteur du jeu à partir d'une séquence écrite à l'avance, avec des joueurs fictifs fixes, au moins 4, sans lien avec les joueurs de la room), puis test avec le groupe.