# Design system — Games Party

> **Ce document est la source de vérité du design.** Les maquettes de `docs/maquettes/` sont une référence visuelle (disposition, hiérarchie, ambiance). En cas de différence entre une maquette et ce document, **ce document gagne**.
> Toutes les valeurs ci-dessous sont définitives. Aucune autre couleur, taille, espacement, rayon, ombre ou durée ne doit apparaître dans le code.

## 1. Principes

- **Ambiance : épurée, moderne, fluide.** L'interface est neutre et sobre ; la couleur vient des jeux, des joueurs et des animations.
- **Thème clair uniquement** pour cette version. Les tokens sont nommés par rôle : le futur thème sombre ne demandera que de changer leurs valeurs (section 16).
- **Un seul bouton principal par écran.**
- **Accessibilité :**
  - tout texte respecte un contraste de 4,5:1 minimum avec son fond ;
  - seule exception : le libellé d'un bouton désactivé, à condition qu'un texte lisible explique pourquoi il est désactivé ;
  - le focus clavier est toujours visible (section 8) ;
  - `prefers-reduced-motion` coupe ou simplifie les animations (section 9).
- **Textes :** français, tutoiement, ton décontracté (section 14).

## 2. Mise en œuvre technique

- Tous les tokens sont déclarés **une seule fois**, en variables CSS dans le bloc `@theme` de Tailwind. `src/client/styles.css` n'est qu'un manifeste d'imports : les déclarations vivent dans `src/client/styles/theme.css` et `src/client/styles/typography.css`. Les noms de variables sont ceux des tableaux ci-dessous.
- Les palettes par défaut de Tailwind (couleurs, rayons, ombres) sont désactivées dans `@theme`, pour que seules les valeurs de ce document soient utilisables.
- **Espacements :** l'échelle par défaut de Tailwind (pas de 4 px) est conservée, mais seuls les multiples listés en section 6 sont autorisés.
- **Point de rupture « wide » :** fenêtre d'au moins **1440 px de large et 850 px de haut** (variante Tailwind `wide:`). Partout dans ce document, « en 1440 » ou « 1440 × 900 » désigne les valeurs appliquées en wide, et « en 1366 » ou « 1366 × 768 » les valeurs par défaut, appliquées sous ce seuil. La hauteur compte, car les écrans sont limités verticalement (arène 16:9, dix lignes de classement, podium).
- **Typographie :** chaque style de la section 5 est une classe utilitaire composite `t-…`, déclarée une seule fois dans `src/client/styles.css` : elle applique la famille, la taille, l'interligne, l'interlettrage et la graisse en reprenant les variables du `@theme`, sans aucune valeur en dur. **Seules les classes `t-…` servent à la typographie.** Les valeurs sont déclarées dans `@theme` avec le préfixe neutre `--type-<style>-size`, `--type-<style>-line-height`, `--type-<style>-letter-spacing` et `--type-<style>-font-weight` (jamais `--text-*`), pour que Tailwind ne génère aucune classe `text-<style>` en parallèle. Les classes `t-display`, `t-countdown` et `t-logo` intègrent elles-mêmes leur changement de taille au point de rupture wide.
- **Canvas (arène) :** le moteur de rendu lit dans les variables CSS, **au démarrage et une seule fois**, les couleurs de l'arène et des joueurs, ainsi que les quelques tailles dont il a besoin — rayon de l'arène, rayon et taille de texte des étiquettes, famille de police (fonction dédiée dans `client/engine/`). Aucune couleur ni aucune taille du design system n'est réécrite dans le code de rendu.
- **Typographie dans le canvas :** un canvas ne peut pas porter une classe `t-…`. La police y est composée en chaîne `ctx.font` à partir des mêmes variables que ces classes, ce qui reste la seule déclaration. Aucune attente n'est nécessaire : l'arène est redessinée à chaque image, donc les étiquettes prennent la bonne police dès qu'elle est chargée.
- **Polices :** fichiers `.woff2` hébergés par le site dans `public/fonts/` (licence OFL), jamais chargés depuis Google Fonts (la CSP l'interdit). `font-display: swap`.
- Vérifier la syntaxe exacte de `@theme` dans la documentation de la version de Tailwind installée avant d'écrire la configuration.

## 3. Couleurs de l'interface

| Rôle | Variable CSS | Valeur | Usage |
|---|---|---|---|
| Fond | `--color-page` | `#F4F5F2` | Fond d'application |
| Surface | `--color-surface` | `#FFFFFF` | Cartes, champs, lignes |
| Surface 2 | `--color-surface-2` | `#ECEEE8` | Fonds secondaires, survol du bouton discret, marches du podium |
| Texte | `--color-ink` | `#16191A` | Titres et texte courant |
| Texte secondaire | `--color-ink-secondary` | `#5A6066` | Aides, légendes (5,9:1 sur blanc) |
| Texte désactivé | `--color-ink-disabled` | `#9BA29A` | Libellés inactifs, point « déconnecté ». Jamais porteur d'information seul |
| Bordure | `--color-line` | `#DFE2DB` | Contours au repos, bordures de notification |
| Bordure forte | `--color-line-strong` | `#C7CCC0` | Survol, séparateur marqué, anneau de la pastille cliquable au survol |
| Accent | `--color-accent` | `#0E7C66` | Bouton principal, élément actif, succès (5,1:1 sur blanc) |
| Accent survol | `--color-accent-hover` | `#0A6653` | Survol et pression du bouton principal, liens, encre sur Accent doux (5,8:1) |
| Accent doux | `--color-accent-soft` | `#E3F0EA` | Fond du bouton doux, des badges Hôte et Prêt, de la ligne du joueur, anneau de focus |
| Accent doux survol | `--color-accent-soft-hover` | `#D3E8DF` | Survol du bouton doux |
| Succès | `--color-success` | `#0E7C66` | Même valeur que l'Accent (flèche de progression ↑) |
| Avertissement | `--color-warning` | `#7A5400` | Reconnexion, attente, chrono sous 10 s (5,9:1 sur fond et sur Avertissement doux) |
| Avertissement doux | `--color-warning-soft` | `#F7EEDC` | Fond des messages d'avertissement |
| Erreur | `--color-danger` | `#B3261E` | Erreurs, bouton destructif (6,3:1) |
| Erreur survol | `--color-danger-hover` | `#8E1E18` | Survol du bouton destructif |
| Erreur doux | `--color-danger-soft` | `#FBEAE8` | Fond d'erreur, anneau de focus du bouton destructif |
| Jeu · Cursor Tag | `--color-cursor-tag` | `#E2542B` | Icône et identité du jeu. Jamais dans l'arène |
| Jeu doux · Cursor Tag | `--color-cursor-tag-soft` | `#FBE9E3` | Fond du badge Chat et de la pastille de rôle Chat / Gelé |
| Liseré pastille | `--color-swatch-edge` | `rgba(22,25,26,.14)` | Liseré intérieur de 1 px d'une pastille de couleur de joueur posée sur une surface claire |
| Texte sur accent | `--color-on-accent` | `#FFFFFF` | Libellés des boutons principal et destructif, trait des couleurs prises dans la palette, pastilles du logo. Reste blanc dans le futur thème sombre |
| Voile de fenêtre | `--color-window-veil` | `rgba(22,25,26,.55)` | Derrière une boîte de confirmation, sur tout l'écran. Jamais sur l'arène |

**Liens :** couleur Accent survol, soulignés au survol, sans autre changement de couleur.

## 4. Couleurs de l'arène et des joueurs

### 4.1 Arène

| Rôle | Variable CSS | Valeur | Usage |
|---|---|---|---|
| Arène fond | `--color-arena` | `#1E2422` | Fond de l'arène, sombre en permanence quel que soit le thème |
| Arène mur | `--color-arena-wall` | `#333B37` | Murs |
| Arène voile | `--color-arena-veil` | `rgba(22,25,26,.72)` | Voile plein cadre quand un contenu se pose sur l'arène (section 11.19) |
| Arène étiquette | `--color-arena-label` | `rgba(0,0,0,.45)` | Fond des étiquettes de pseudo |
| Arène texte | `--color-arena-ink` | `#F2F5F1` | Pseudos, textes sur le voile, anneau de ton propre curseur (12,4:1) |
| Arène texte secondaire | `--color-arena-ink-secondary` | `#9BA6A0` | Mention « chat » après le pseudo (5,1:1) |
| Portail | `--color-portal` | `#C9D2CC` | Anneaux et lettres des portails. Jamais une couleur de joueur |
| Gel remplissage | `--color-freeze-fill` | `rgba(142,197,232,.9)` | Disque du curseur gelé, par-dessus la couleur du joueur |
| Gel anneau | `--color-freeze-ring` | `rgba(142,197,232,.4)` | Anneau autour du curseur gelé |
| Gel halo | `--color-freeze-halo` | `rgba(142,197,232,.18)` | Halo extérieur du curseur gelé |
| Gel encre | `--color-freeze-ink` | `#08324A` | Décompte du gel, point de la pastille de rôle « Gelé » (8,1:1 sur le remplissage) |

### 4.2 Couleurs des joueurs

Identifiants `c1` à `c10` (voir `docs/architecture.md`, section 4). Ordre fixe, jamais réorganisé.

| Id | Nom | Variable CSS | Valeur |
|---|---|---|---|
| `c1` | rouge | `--color-player-1` | `#FF4D4D` |
| `c2` | rose | `--color-player-2` | `#FF5FB0` |
| `c3` | violet | `--color-player-3` | `#C77DFF` |
| `c4` | indigo | `--color-player-4` | `#7C8CFF` |
| `c5` | bleu | `--color-player-5` | `#2BA8FF` |
| `c6` | cyan | `--color-player-6` | `#22D3EE` |
| `c7` | menthe | `--color-player-7` | `#3DDC97` |
| `c8` | lime | `--color-player-8` | `#A3E635` |
| `c9` | jaune | `--color-player-9` | `#F5D131` |
| `c10` | orange | `--color-player-10` | `#FF9330` |

- Contraste de 4,8:1 à 10,6:1 sur l'arène.
- Une couleur de joueur ne sert **jamais** de couleur de texte : elle reste dans une pastille ou un curseur.
- Sur une surface claire, la pastille porte le Liseré pastille.

## 5. Typographie

**Familles :**
- **Nunito** (titres, chiffres) : graisses 700 et 800. Pile de secours : `ui-rounded, system-ui, sans-serif`.
- **Work Sans** (texte, interface) : graisses 400, 500 et 600. Pile de secours : `system-ui, sans-serif`.

| Style | Préfixe des variables | Famille · graisse | Taille / hauteur de ligne | Interlettrage | Usage |
|---|---|---|---|---|---|
| affiche | `--type-display-*` | Nunito 800 | 56 / 57 | −3 % | Accroche de l'accueil en 1440 |
| titre-1 | `--type-title-1-*` | Nunito 800 | 40 / 42 | −3 % | Titres de page (« La room de Mika », titres de résultats), accroche de l'accueil en 1366 |
| titre-2 | `--type-title-2-*` | Nunito 800 | 28 / 32 | −2 % | Sections, titre des boîtes de confirmation, annonces sur l'arène |
| titre-3 | `--type-title-3-*` | Nunito 700 | 20 / 24 | −1 % | En-têtes de carte, nom de jeu, valeurs des réglages, message d'attente |
| corps-l | `--type-body-lg-*` | Work Sans 400 | 17 / 27 | 0 | Textes d'introduction |
| corps | `--type-body-*` | Work Sans 400 | 15 / 23 | 0 | Texte courant |
| corps-fort | `--type-body-strong-*` | Work Sans 600 | 15 / 21 | 0 | Pseudos, libellés, pastille de rôle |
| contrôle | `--type-control-*` | Work Sans 600 (boutons) ou 500 (champs) | 16 / 24 | 0 | Libellés des boutons 54 px, texte saisi dans les champs |
| petit | `--type-small-*` | Work Sans 500 | 13 / 19 | 0 | Aides, légendes, compteur de joueurs prêts, bouton discret |
| micro | `--type-micro-*` | Work Sans 600 | 12 / 16 | +6 %, capitales | Étiquettes de section (« MANCHE 2 / 3 »), badges (sans capitales), étiquettes de l'arène (sans capitales) |
| chrono | `--type-timer-*` | Nunito 800 | 40 / 44 | 0 | Chrono de manche, score personnel. Chiffres tabulaires |
| compte à rebours | `--type-countdown-*` | Nunito 800 | 160 / 160 en 1440 × 900, 120 / 120 en 1366 × 768 | 0 | Uniquement le chiffre du compte à rebours |

**Classes utilitaires** (section 2) :

| Classe | Style |
|---|---|
| `t-display` | affiche en wide, titre-1 sous le seuil (accroche de l'accueil) |
| `t-title-1` | titre-1 |
| `t-title-2` | titre-2 |
| `t-title-3` | titre-3 |
| `t-body-lg` | corps-l |
| `t-body` | corps |
| `t-body-strong` | corps-fort |
| `t-control` | contrôle, graisse 600 (libellés de boutons) |
| `t-input` | contrôle, graisse 500 (texte saisi dans les champs) |
| `t-small` | petit |
| `t-micro` | micro, avec capitales et interlettrage +6 % (étiquettes de section) |
| `t-label` | micro, sans capitales ni interlettrage (badges, étiquettes de l'arène) |
| `t-timer` | chrono |
| `t-countdown` | compte à rebours (160 px en wide, 120 px sous le seuil) |
| `t-logo` | nom du logo (26 px en wide, 23 px sous le seuil) |

**Logo :** nom « Games Party » en Nunito 800, interlettrage −3 %, 26 px en 1440 et 23 px en 1366, hauteur de ligne égale à la taille. Exception de marque, jamais utilisée pour un autre texte.

**Règles :**
- Tous les chiffres qui changent en direct (chrono, scores, décomptes, points) utilisent les chiffres tabulaires (`font-variant-numeric: tabular-nums`).
- **Pseudos trop longs :** coupés sur une ligne avec « … » (`text-overflow: ellipsis`). Au survol, quand la souris est libre, le pseudo complet s'affiche en infobulle native (`title`).
- Les badges et les étiquettes de l'arène utilisent la classe `t-label` (taille et graisse du style micro, sans capitales ni interlettrage).

## 6. Espacements

Échelle de 4 px. **Seules ces valeurs sont autorisées** (marges, marges intérieures, espaces entre éléments) :

| Token | Valeur | Classe Tailwind (multiple) |
|---|---|---|
| esp-0 | 0 | `0` |
| esp-1 | 4 px | `1` |
| esp-2 | 8 px | `2` |
| esp-3 | 12 px | `3` |
| esp-4 | 16 px | `4` |
| esp-5 | 24 px | `6` |
| esp-6 | 32 px | `8` |
| esp-7 | 40 px | `10` |
| esp-8 | 56 px | `14` |
| esp-9 | 72 px | `18` |

- **Valeurs des maquettes hors échelle** (5, 6, 10, 13, 14, 20, 22 px…) : utiliser la valeur de l'échelle la plus proche ; à égalité, la plus grande (10 → 12, 14 → 16, 20 → 24).
- **Mise en page :** marge d'écran horizontale 56 px en 1440 × 900 et 48 px en 1366 × 768. Espace entre colonnes : 24 px.

## 7. Rayons

| Token | Variable CSS | Valeur | Usage |
|---|---|---|---|
| xs | `--radius-xs` | 8 px | Étiquettes de l'arène, murs (en coordonnées d'arène) |
| sm | `--radius-sm` | 12 px | Pastilles de palette |
| md | `--radius-md` | 16 px | Lignes de joueur et de classement, icône de jeu, encarts de réglage, haut des marches du podium |
| lg | `--radius-lg` | 20 px | Cartes de jeu |
| xl | `--radius-xl` | 24 px | Cartes, panneaux, arène, boîtes de confirmation |
| pilule | `--radius-pill` | 999 px | Boutons, champs, badges, pastilles de rôle, bande d'informations |

Pastilles de couleur et curseurs : cercles (50 %).

## 8. Ombres et focus

| Token | Variable CSS | Valeur | Usage |
|---|---|---|---|
| ombre-1 | `--shadow-1` | `0 1px 2px rgba(22,25,26,.05)` | Cartes au repos |
| ombre-2 | `--shadow-2` | `0 1px 3px rgba(22,25,26,.06), 0 8px 20px -12px rgba(22,25,26,.18)` | Survol de carte, palette ouverte |
| ombre-3 | `--shadow-3` | `0 2px 6px rgba(22,25,26,.06), 0 24px 48px -24px rgba(22,25,26,.22)` | Notifications, boîtes de confirmation |
| anneau de focus | `--shadow-focus` | `0 0 0 4px #E3F0EA, 0 0 0 5px #0E7C66` | Focus clavier de tous les éléments interactifs |
| anneau de focus destructif | `--shadow-focus-danger` | `0 0 0 4px #FBEAE8, 0 0 0 5px #B3261E` | Focus clavier du bouton destructif |

- L'anneau de focus est une ombre extérieure : il ne change jamais la taille de l'élément et ne décale aucun voisin.
- Focus visible uniquement à la navigation clavier (`:focus-visible`).
- Les valeurs des anneaux reprennent les tokens de couleur ; dans `@theme`, les écrire avec les variables de couleur correspondantes.

## 9. Animations

| Nom | Durée | Courbe | Usage | Si animations réduites |
|---|---|---|---|---|
| rapide | 120 ms | `cubic-bezier(.4,0,1,1)` | Survol, pression, bascule | Sans transition |
| standard | 180 ms | `cubic-bezier(.2,.8,.3,1)` | Apparition de carte ou de badge, glissement des lignes du classement | Sans transition |
| ample | 280 ms | `cubic-bezier(.16,1,.3,1)` | Voile, boîte de confirmation, notification, palette | Sans transition |
| célébration | 600 ms | `cubic-bezier(.34,1.3,.5,1)` | Apparition du podium, confettis | Podium affiché directement, confettis supprimés |
| boucle portail | 1,6 s, en boucle | `cubic-bezier(.16,1,.3,1)` | Pulsation des portails et du halo du Chat (canvas) | Pas de pulsation |
| clignotement d'attente | 1,4 s, en boucle | `ease-in-out` | Point du message « … choisit un jeu » | Point fixe |
| illumination | 1,2 s, une fois | `cubic-bezier(.16,1,.3,1)` | Valeur de réglage modifiée par l'hôte (fond Accent doux qui s'estompe) | Fond Accent doux affiché 1,2 s puis retiré, sans transition |
| confettis | 600 ms, une fois | `cubic-bezier(.34,1.3,.5,1)` | 30 éclats aux couleurs des joueurs, à l'arrivée sur les résultats | Supprimés |

**Règles :**
- Les transitions d'interface ne dépassent pas 300 ms. Seules la célébration, les boucles et l'illumination dépassent cette durée.
- En CSS, on n'anime que `transform` et `opacity` (plus `background-color` pour les survols).
- Les curseurs, portails, halos et gels de l'arène sont animés par le moteur de jeu (canvas), jamais en CSS.
- Aucune autre durée ni courbe n'est autorisée.

## 10. Icônes

- Dessin au trait, **épaisseur 2 px**, extrémités et angles arrondis, jamais de remplissage. Couleur : `currentColor`.
- SVG intégrés au code (composants React), sans bibliothèque d'icônes.
- Tailles : **18 px** dans les boutons et les pastilles, **22 px** pour l'icône du son.

| Icône | Usage |
|---|---|
| son actif / son coupé | Bouton rond de 48 px, en-tête de tous les écrans |
| lien | Bouton « Copier le lien » |
| coche | « Lien copié », « Tu es prêt », confirmations |
| sortie | Bouton « Quitter la room » |
| moins / plus | Boutons du stepper de réglage |
| flèche haut / flèche bas | Progression dans le classement de la soirée (tiret quand la place ne change pas) |

Les icônes moins, plus, flèche haut et flèche bas n'existent pas dans les maquettes (caractères −, +, ↑, ↓) : elles sont dessinées dans le même style que les autres.

**Logo et icône de jeu**, redessinés en SVG dans `src/client/assets/` (dans les maquettes, ce sont des blocs HTML, pas des SVG), à partir des coordonnées de la piste de logo **2c « La bande de potes »** :
- **Logo :** tuile carrée de 44 px (38 px sous le seuil wide), rayon md, fond Accent ; trois pastilles de rayon 5 dans un repère de 44 × 44, couleur Texte sur accent : centre (14, 14) à 100 % d'opacité, centre (31, 19) à 62 %, centre (21, 31) à 82 %. Ces opacités sont propres au logo et ne servent nulle part ailleurs.
- **Icône de Cursor Tag :** tuile de fond Jeu · Cursor Tag, rayon md ; tête ronde de rayon 9 et deux oreilles carrées de 7 × 7 (angles arrondis de 2) tournées à 45°, couleur Texte sur accent, positionnées comme dans la maquette.

## 11. Composants

### 11.1 Règles communes aux boutons

- Hauteur **54 px** pour les styles principal, secondaire, doux et destructif, sur toutes les tailles d'écran. Forme pilule, style de texte « contrôle » (16 / 600), marge intérieure horizontale 32 px, icône éventuelle à 8 px du libellé.
- **Aucun état ne change les dimensions d'un bouton** (survol, focus, désactivé, libellé qui change). Un bouton dont le libellé change au clic a une largeur fixe, celle de son libellé le plus long.
- Survol : changement de couleur et décalage de −1 px vers le haut (animation rapide). Pas de décalage à l'état désactivé.
- Désactivé : fond Surface 2, libellé Texte désactivé, curseur `not-allowed`.
- **Un seul bouton principal par écran.**

### 11.2 Les cinq styles de boutons

| Style | Fond | Libellé | Survol | Usage |
|---|---|---|---|---|
| Principal | Accent | Texte sur accent | fond Accent survol | L'action principale de l'écran (« Créer une room », « Lancer la partie », « Je suis prêt », « Retour au lobby », « Copier le lien » quand il manque des joueurs) |
| Secondaire | Surface, bordure 1 px Bordure (dessinée à l'intérieur) | Texte | bordure Bordure forte | Actions alternatives (« Rester », « Changer », « Réessayer », « Quitter la room » sur l'écran « Clique pour reprendre ») |
| Doux | Accent doux | Accent survol | fond Accent doux survol | Actions importantes mais secondaires (« Copier le lien ») |
| Destructif | Erreur | Texte sur accent | fond Erreur survol | Confirmation d'une action irréversible (« Quitter »). Jamais l'action par défaut ; focus avec l'anneau destructif |
| Discret | transparent | Texte secondaire, style petit | fond Surface 2, libellé Texte | Actions de second plan (« Quitter la room » dans le lobby et les résultats). Hauteur 32 px, marge intérieure 8 × 12 |

**« Copier le lien » :** style doux avec l'icône lien. Après un clic, le libellé devient « Lien copié » avec l'icône coche pendant 2 s, sans changer de largeur, puis revient. Quand il manque des joueurs pour lancer le jeu, il passe en style principal.

**Bouton du son :** bouton rond de 48 px, fond Surface, bordure Bordure, icône 22 px. Deux états : son actif, son coupé.

### 11.3 Bouton bascule « Je suis prêt »

- Non prêt : bouton principal « Je suis prêt ».
- Prêt : fond Accent doux, bordure 1 px Accent, libellé « Tu es prêt » en Accent survol avec l'icône coche. Même largeur que l'état non prêt.
- Dans le lobby, **uniquement à l'état prêt**, une aide en style petit Texte secondaire sous le bouton : « Clique à nouveau pour annuler ». Aucune aide à l'état non prêt.

### 11.4 Champ texte

- Hauteur 54 px, forme pilule, fond Surface, bordure Bordure, marge intérieure horizontale 24 px, style contrôle (16 / 500).
- Compteur de caractères (« 4 / 16 ») à droite, dans le champ, en style petit Texte secondaire.
- États : survol (bordure Bordure forte), focus (anneau de focus), erreur (bordure Erreur et message en style petit Erreur sous le champ, précédé d'un point Erreur de 8 px), désactivé (fond Surface 2, texte Texte désactivé).

### 11.5 Stepper de réglage

- Une ligne par réglage : libellé en corps-fort à gauche, stepper aligné à droite. Encart de fond Fond (`--color-page`), rayon md, marge intérieure 8 × 12, espace de 12 px entre le libellé et le stepper.
- Stepper (vue hôte) : conteneur en pilule de fond Surface, bordure 1 px Bordure, marge intérieure 4 px, espace de 8 px entre ses trois éléments. À l'intérieur : bouton rond « moins » de 32 px, valeur centrée dans une zone de **largeur fixe 52 px** (style titre-3, chiffres tabulaires, unité dans la valeur : « 60 s »), bouton rond « plus » de 32 px. Les boutons ont un fond Surface 2 (Bordure au survol) et une icône de 18 px.
- Borne atteinte : le bouton concerné est désactivé.
- Vue joueur : la valeur seule, sans boutons, alignée à droite, avec l'animation illumination quand l'hôte la change.

### 11.6 Carte

- Fond Surface, bordure 1 px Bordure, rayon xl, ombre-1, marge intérieure 24 px.
- En-tête en titre-3 ; compteur éventuel (« 6 / 10 ») aligné à droite en style petit Texte secondaire.
- Dans le lobby, les cartes d'une même rangée ont la même hauteur, alignée sur la plus haute. Les cartes ne s'étirent jamais jusqu'en bas de l'écran.

### 11.7 Carte de jeu et grille « Choisis un jeu »

- Carte de jeu : fond Surface, bordure Bordure, rayon lg, marge intérieure 24 px ; icône du jeu 48 px (rayon md), nom en titre-3, description en corps Texte secondaire, badge « 3 à 10 joueurs ».
- Survol : ombre-2 et bordure Bordure forte.
- Grille : colonnes en remplissage automatique, largeur minimale 266 px, espace 24 px. Une carte par jeu existant, **jamais de carte « Bientôt »**.
- **Aucun jeu disponible :** la grille affiche « Aucun jeu n'est disponible pour l'instant. » en corps Texte secondaire, à la place des cartes.
- Jeu choisi (en-tête de la colonne centrale du lobby) : icône, nom, description, et bouton secondaire « Changer » pour l'hôte uniquement. Aucun badge « Choisi ».

### 11.8 Badges

- Style micro (12 / 600, sans capitales), marge intérieure **4 × 8**, forme pilule.

| Badge | Fond | Texte | Où |
|---|---|---|---|
| Hôte | Accent doux | Accent survol | Lignes de joueur |
| Toi | Surface 2 | Texte | Lignes de joueur |
| Prêt | Accent doux | Accent survol, précédé d'un point Accent de 6 px | Lignes de joueur, classement de la préparation |
| Chat | Jeu doux | Texte | Lignes de classement |
| Déconnecté · à point | Surface, bordure Bordure | Texte secondaire, précédé d'un point Texte désactivé de 6 px | Lignes de joueur (posées sur Surface 2) |
| Déconnecté · plat | Surface 2 | Texte secondaire | Lignes de classement (posées sur Surface) |
| Nombre de joueurs (« 3 à 10 joueurs ») | Surface 2 | Texte | Cartes de jeu |
| C'est ce pseudo | Erreur doux | Erreur | Ligne de l'aperçu qui porte un pseudo refusé (écran d'invitation, section 11.10) |

- Aucun badge « Coureur » : seuls un Chat et un joueur déconnecté portent un badge dans un classement.

### 11.9 Pastille de rôle

- Style corps-fort (15 / 600), marge intérieure **8 × 16**, forme pilule, point de 8 px à 8 px du libellé.
- **Une seule pastille visible à la fois**, dans la bande d'informations.

| État | Fond | Texte | Point |
|---|---|---|---|
| Coureur | Accent doux | Accent survol | Accent |
| Chat | Jeu doux | Texte | Jeu · Cursor Tag |
| Gelé (« Gelé 2 s ») | Jeu doux | Texte | Gel encre |
| Spectateur | Surface 2 | Texte | aucun point |

### 11.10 Ligne de joueur (lobby, invitation)

- Hauteur **38 px**, rayon md, fond Surface, bordure Bordure, marge intérieure horizontale 16 px, espace de 12 px entre les éléments d'une ligne, espace de 8 px entre les lignes.
- Contenu : pastille de couleur de 22 px, pseudo en corps-fort (coupé en « … »), badges alignés à droite.
- **Ordre des badges.** Les badges **permanents** — « Hôte » puis « Toi », dans cet ordre — restent collés au bord droit et n'en bougent jamais. Les badges qui **apparaissent et disparaissent** — « Prêt », « C'est ce pseudo », « Déconnecté », dans cet ordre — s'insèrent à leur gauche, du côté du pseudo. Un badge qui apparaît ne doit jamais déplacer un badge déjà affiché : c'est le pseudo, coupé en « … », qui cède la place.
- Ta ligne : fond Fond (`--color-page`), pour que le badge « Toi » (Surface 2) reste visible.
- **Ordre de la liste :** l'hôte en premier, puis les autres joueurs dans leur ordre d'arrivée.
- Joueur déconnecté : bordure pointillée, pastille et pseudo en Texte désactivé, badge « Déconnecté » à point. C'est bien la variante **à point** du §11.8 qui s'applique, et non la variante plate, malgré la mention « posées sur Surface 2 » de ce tableau.
- **Pastille cliquable** (ta ligne uniquement) : anneau de 3 px Surface 2, Bordure forte au survol. Le clic ouvre la palette.
- **Ligne d'attente** « Il manque un joueur » : bordure pointillée, pastille vide pointillée, texte en corps Texte secondaire. Jamais présentée comme une erreur.
- **Pseudo refusé** (écran d'invitation) : quand `room:join` échoue avec `PSEUDO_TAKEN`, l'aperçu de la room est rafraîchi, puis la ligne du joueur qui porte ce pseudo — comparaison sans tenir compte des majuscules — prend une **bordure Erreur** et le badge **« C'est ce pseudo »** (section 11.8). Le message sous le champ reste affiché : il dit quoi faire, la ligne dit qui. La mise en évidence disparaît au refus suivant ou quand la room est rejointe.
- Toutes les lignes sont affichées, sans défilement (10 au maximum).

### 11.11 Palette de couleurs

- S'ouvre juste sous ta ligne (ombre-2, animation ample) ; se ferme au clic sur une couleur, en dehors ou avec Échap.
- Grille **5 × 2**, pastilles de 38 px, rayon sm, espace 8 px, ordre **c1 → c10 fixe**.
- Ta couleur : anneau de focus. Couleur prise : teinte réelle, barrée d'un trait Texte sur accent, curseur `not-allowed`, infobulle « Prise par [pseudo] ». Couleur libre : infobulle « Libre ».

### 11.12 Message d'attente et compteur de prêts

- Message d'attente (« Mika choisit un jeu… ») : titre-3 Texte secondaire, précédé d'un point Avertissement de 8 px en clignotement d'attente. Affiché une seule fois.
- Compteur de prêts (« 3 joueurs sur 4 prêts ») : style petit, Texte secondaire ; Accent survol quand tout le monde est prêt. L'hôte et les joueurs déconnectés ne sont pas comptés.

### 11.13 Notifications

- En haut de l'écran, centrées. Fond Surface, bordure Bordure, rayon md, ombre-3, marge intérieure 16 px, style corps, point de 8 px à gauche (Accent, Avertissement ou Erreur selon le message).
- Apparition animation ample, disparition après 4 s.
- Textes : « Mika a changé de jeu, reclique sur Prêt. », « Connexion perdue, reconnexion… », « La room est pleine : 10 joueurs, c'est le max. ».
- **Action refusée par le serveur**, point Erreur : « Cette couleur vient d'être prise. » (`COLOR_TAKEN`), « Tu vas trop vite, réessaie dans un instant. » (`RATE_LIMITED`), « Action impossible, réessaie. » (tous les autres refus).
- **Exception à la disparition :** « Connexion perdue, reconnexion… » décrit un état et reste affichée tant que la connexion n'est pas revenue (`docs/architecture.md`, section 10).
- La copie du lien n'a **pas** de notification : le libellé du bouton suffit (section 11.2).

### 11.14 Bande d'informations (écran de jeu)

- Pilule pleine largeur, hauteur **54 px**, fond Surface, bordure Bordure, marge intérieure horizontale 32 px.
- **Variante partie :** « MANCHE 2 / 3 » (micro, Texte secondaire), chrono (style chrono, Avertissement sous 10 s), message court éventuel (corps-fort Accent survol : « Tu n'es plus le Chat, ton score repart »), puis à droite la pastille de rôle et « TON SCORE » (micro) suivi du score (style chrono).
- **Variante préparation :** « MANCHE 1 / 3 » et « Départ automatique dans 12 s » (corps-fort Texte secondaire), puis « C'est parti ! » pendant le compte à rebours. Le score personnel n'apparaît qu'à partir de la manche 2.
- **Variante spectateur :** manche et chrono, puis à droite la pastille de rôle Spectateur et « Tu joueras à la prochaine partie » (corps Texte secondaire). Ni rôle ni score personnel.

### 11.15 Lignes de classement

Communes : hauteur **38 px en 1440** et **30 px en 1366**, rayon md, fond Surface, bordure Bordure, espace de 8 px entre les lignes. Ta ligne : fond Accent doux. Joueur déconnecté : contenu en Texte désactivé et badge « Déconnecté » plat. Pseudos coupés en « … ». 10 lignes sans défilement.

| Variante | Contenu (de gauche à droite) |
|---|---|
| Classement en direct | pastille 14 px, pseudo, score (« 42 s »), badge Chat ou Prêt éventuel |
| Résultats de la partie | place, pastille, pseudo, score, points gagnés (« +5 », Accent survol) |
| La soirée | place, flèche de progression (↑ Succès, ↓ Texte secondaire, tiret Texte secondaire), pastille, pseudo, total de points (titre-3) |

- Ordre : score (ou points) décroissant ; à égalité, même place et ordre alphabétique des pseudos (`docs/architecture.md`, section 5.6).
- Classement en direct : quand l'ordre change, les lignes glissent à leur nouvelle place (animation standard).

### 11.16 Podium

- Trois marches, fond Surface 2, rayon md en haut uniquement, numéro de place en titre-2 Texte secondaire.
- 1440 × 900 : 1re place au centre, 152 px de large et 132 px de haut ; 2e à gauche et 3e à droite, 138 px de large, 104 et 84 px de haut. Espace de 16 px entre les marches.
- 1366 × 768 : mêmes largeurs, hauteurs réduites à 56, 44 et 36 px.
- Au-dessus de chaque marche : pastille 28 px, pseudo (corps-fort, coupé en « … »), score (titre-3), badge de points gagnés.
- **Égalité :** les joueurs à égalité se tiennent côte à côte sur la même marche, avec la même place et les mêmes points ; la place suivante saute (personne n'est 2e si deux joueurs sont 1ers).
- Apparition avec l'animation célébration.

### 11.17 Boîte de confirmation

- Largeur 520 px, fond Surface, rayon xl, ombre-3, marge intérieure 40 px, centrée sur un Voile de fenêtre couvrant tout l'écran. Apparition animation ample.
- Titre en titre-2, texte en corps Texte secondaire, deux boutons de même largeur séparés de 16 px : secondaire « Rester » (focus par défaut) et destructif « Quitter ».
- Échap ou clic sur le voile : même effet que « Rester ».
- Textes : voir `docs/architecture.md`, section 5.5 (variantes joueur et hôte).

### 11.18 Écran « Clique pour reprendre »

- Motif voile d'arène (11.19). Contenu centré : « Clique pour reprendre » (titre-1, Arène texte), message d'avertissement (pilule Avertissement doux, texte corps-fort Avertissement, point de 8 px), puis les boutons principal « Reprendre » et secondaire « Quitter la room » (icône sortie), séparés de 16 px.
- **Le texte de l'avertissement vient du jeu**, qui seul sait ce que perdre la souris coûte : « Ton curseur ne bouge plus. » pour le bac à sable, « Ton curseur ne bouge plus : tu peux te faire attraper » pour Cursor Tag.
- **Cet écran est réservé à la perte de capture.** Tant que la souris n'a **jamais** été capturée dans la partie, c'est l'invitation de la section 12 qui s'affiche — « Clique pour capturer ta souris » — parce qu'un joueur qui arrive n'a rien perdu et ne sait pas encore qu'il doit cliquer. L'une invite, l'autre avertit.
- Le voile ne couvre que l'arène (11.19) : **le bouton du son de l'en-tête reste cliquable**, et « Quitter la room » ouvre sa boîte de confirmation habituelle, qui, elle, couvre toute la fenêtre (11.17).
- **Un spectateur ne voit ni cet écran ni l'invitation :** il n'a pas de curseur, donc aucune capture à demander ni à perdre.

### 11.19 Motif « voile d'arène »

- **Le seul moyen de poser un contenu sur l'arène.** Le voile Arène voile couvre toute l'arène et rien d'autre ; le contenu est centré au-dessus, sans être assombri.
- Jamais de panneau ou de fond posé derrière un texte sur l'arène.
- Utilisé pour : « Tu es le Chat ! », la phase de préparation, le compte à rebours, « Clique pour reprendre ».
- Apparition et disparition : animation ample, **en fondu seul**. Le §9 n'autorise que `transform` et `opacity`, et un voile qui glisserait se battrait avec l'arène qu'il recouvre.
- **La partie continue derrière.** Le voile est une couche posée sur le canvas, pas une pause : le rendu tourne toujours, et c'est ce qui donne son sens à l'avertissement de 11.18 — on voit son propre curseur rester immobile.

## 12. Éléments de jeu (arène)

- Coordonnées logiques 1600 × 900 (`docs/architecture.md`, section 6.4) ; tout ce qui est défini en unités d'arène suit la taille d'affichage. **Les tailles qui n'y obéissent pas sont marquées une à une** ci-dessous : tout ce qui n'est pas marqué est en unités d'arène.
- **Écrans haute densité :** le canvas est dimensionné en pixels physiques et son contexte mis à l'échelle une fois, de sorte que le code de dessin raisonne en pixels CSS. Cela ne change que la netteté (`docs/architecture.md`, section 6.4).
- **Arène :** fond Arène fond, rayon xl à l'écran, format 16:9, affichée la plus grande possible. Le dessin est **découpé à ce rayon** : un curseur poussé dans un angle y est rogné plutôt que de déborder du cadre. Rentrer le terrain de jeu aurait changé la géométrie que le serveur applique.
- **Murs :** Arène mur, rayon 8 en unités d'arène.
- **Curseur :** disque de rayon 14 (unités d'arène), couleur du joueur.
- **Ton curseur :** anneau de 3 px Arène texte autour du disque (épaisseur à l'écran).
- **Chat :** disque avec deux oreilles de la couleur du joueur, et halo de la couleur du joueur en deux couronnes (4 px à 28 % d'opacité, puis 9 px à 12 %), en boucle portail.
- **Gelé :** disque recouvert de Gel remplissage, anneau de 3 px Gel anneau, halo de 7 px Gel halo, décompte en secondes au centre (micro, Gel encre).
- **Portails :** anneau de rayon 36 (unités d'arène), trait 2 px à l'écran, couleur Portail, lettre A ou B au centre (micro, **à l'écran** comme l'étiquette de pseudo). Paire A : anneau plein. Paire B : anneau pointillé. Pulsation en boucle portail — la pulsation dit « utilisable », donc un portail sans effet, comme ceux du bac à sable, est dessiné sans elle.
- **Étiquettes de pseudo :** à droite du curseur, fond Arène étiquette, rayon xs, marge intérieure 4 × 8, texte micro Arène texte. **L'étiquette entière est en pixels d'écran** — texte, boîte, rayon et marges —, quelle que soit la taille de l'arène : un texte de 12 px dans une boîte en unités d'arène se disloquerait quand l'arène rétrécit. Pour un Chat, le pseudo est suivi de « · chat » en Arène texte secondaire.
- Joueur déconnecté : curseur non dessiné.
- **Annonce « Tu es le Chat ! »** : motif voile d'arène, titre en titre-1 Arène texte, phrase « Attrape un Coureur pour lui passer le rôle » en corps-l Arène texte. Visible uniquement par le joueur concerné, pendant son gel.
- **Avant la première capture de la souris :** motif voile d'arène, avec le bouton principal « Clique pour capturer ta souris ». Il s'affiche tant que la souris n'a **jamais** été capturée dans cette partie ; la perdre ensuite affiche l'écran « Clique pour reprendre » (11.18), qui avertit au lieu d'inviter. Un spectateur ne voit ni l'un ni l'autre.
- **Phase de préparation :** motif voile d'arène, ligne de rappel (réglages avant la manche 1, « Manche 1 terminée · Tu es 2e avec 58 s » ensuite) en corps-l Arène texte, bouton bascule « Je suis prêt », aide « Clique pour capturer ta souris » puis « Souris capturée, on attend les autres » en petit Arène texte secondaire. Le spectateur voit la ligne de rappel sans bouton ni aide.
- **Compte à rebours :** motif voile d'arène, chiffre seul en style compte à rebours, Arène texte.

## 13. Mise en page des écrans

Les maquettes de `docs/maquettes/` montrent chaque écran en 1440 × 900 et, pour les écrans critiques, en 1366 × 768. Les dimensions exactes des éléments viennent des sections précédentes.

**Commun à tous les écrans :**
- En-tête : logo (icône 44 px, nom 26 px) à gauche, bouton du son à droite. Marges 32 px en haut et 56 px sur les côtés en 1440 ; 24 px et 48 px en 1366 (icône 38 px, nom 23 px).
- Le contenu commence directement sous l'en-tête, sans espace vide ajouté ; il n'est jamais centré verticalement dans la fenêtre.
- **Un seul texte, quelle que soit la taille d'écran.** Les maquettes raccourcissent certaines phrases en 1366 : c'est le texte de 1440 qui s'applique partout. Seules les tailles changent au point de rupture.
- Sur un appareil sans souris : message « Games Party se joue sur ordinateur, avec une souris. » à la place du contenu.

**Accueil et invitation :** une carte principale en deux colonnes. À gauche, accroche (micro en pilule Accent doux), titre, texte d'introduction et formulaire ; à droite, aperçu de l'arène avec la carte du jeu (accueil) ou la liste des joueurs de la room (invitation). Les erreurs « room pleine » et « serveur complet » remplacent le contenu de la colonne de gauche ; « pseudo déjà pris » s'affiche sous le champ.

**Lobby :**
- Sous l'en-tête : titre « La room de Mika » et sous-titre à gauche, bouton « Copier le lien » à droite.
- Jeu choisi : trois colonnes de même hauteur. **Joueurs** (largeur fixe, doit afficher un pseudo de 16 caractères avec les badges « Toi » et « Prêt ») ; **Le jeu** (colonne flexible : jeu choisi, arène de démonstration en 16:9, phrase « Ton score, c'est le temps passé sans être Chat. ») ; **Réglages** (largeur fixe : lignes de réglage, puis en bas le compteur de prêts et le bouton d'action : principal « Lancer la partie » quand tous les joueurs connectés sont prêts, secondaire « Lancer quand même » sinon — un seul bouton à la fois). En 1366, la colonne Réglages est élargie aux dépens de la colonne Le jeu.
- Aucun jeu choisi : les colonnes Le jeu et Réglages fusionnent (grille de jeux pour l'hôte, message d'attente pour les joueurs).
- Bouton discret « Quitter la room » en bas de la carte Joueurs.
- **Démo du lobby et de l'accueil :** tant que la démo animée n'existe pas (étape 5), arène fixe avec des joueurs fictifs (Pixel en Chat, Nova, Biscuit, Zippy), jamais les joueurs de la room.

**Écran de jeu :** bande d'informations sur toute la largeur, puis l'arène (colonne flexible, 16:9, la plus grande possible) et à droite la carte Classement (largeur fixe de 300 px en 1366). Rien d'autre n'est posé sur l'arène que le motif voile d'arène.

**Résultats :** titre (titre-1) puis deux cartes de même hauteur : « Cette partie » (large : podium puis lignes de résultats) et « La soirée » (étroite). Sous les cartes : bouton principal « Retour au lobby » (hôte uniquement) et « Retour automatique au lobby dans 14 s » (petit, Texte secondaire) à gauche, bouton discret « Quitter la room » à droite. Confettis à l'arrivée.

## 14. Textes et ton

- Tutoiement, ton décontracté, phrases courtes.
- **Aucune mention de Discord** : le site se partage par lien, avec ou sans Discord.
- Les textes exacts de chaque écran sont ceux des maquettes, sauf ceux corrigés dans ce document ou dans `docs/architecture.md` et les `rules.md` des jeux, qui priment.
- Formats : chrono « 0:47 », scores en secondes entières « 42 s » (calculs internes au millième), points « +5 », tous les compteurs avec une espace de chaque côté de la barre oblique (« 6 / 10 », « 4 / 16 », « Manche 2 / 3 »).

## 15. Sons

- **Style : doux et minimaliste** (petits « pop », clics feutrés, carillons discrets), cohérent avec l'ambiance du site. Pas de musique.
- Sons libres de droits, intégrés à l'étape 5 : toucher, gel, portail, compte à rebours, clic « Prêt », fin de manche, résultats.
- Bouton du son dans l'en-tête de tous les écrans ; le son est **actif par défaut** et le choix est mémorisé dans le navigateur (couche services).

## 16. Évolutions prévues

- **Thème sombre :** ajouté après la validation complète du thème clair. Tous les tokens des sections 3 à 8 recevront une valeur sombre ; l'arène ne change pas. Une icône de bascule de thème sera alors ajoutée dans l'en-tête, à côté du bouton du son. Elle n'est pas affichée avant.
- **Démo animée** de chaque jeu sur l'accueil et le lobby (étape 5), avec des joueurs fictifs.
- **CSP :** retirer `'unsafe-inline'` de `style-src` une fois l'interface construite (voir `CLAUDE.md`).

## 17. Écarts des maquettes

### 17.1 Décisions prises sur les incohérences

| Écart constaté dans les maquettes | Décision |
|---|---|
| Badge « Spectateur » au gabarit des petits badges (4 × 8) | Pastille de rôle, variante Spectateur (8 × 16) |
| Libellés de boutons en 16 px, hors échelle | Nouveau style « contrôle » (16 / 24) |
| Marge intérieure des boutons à 30 px | 32 px |
| Transitions de boutons à 160 ms | Animation rapide (120 ms) pour le survol |
| « Cursor Tag » en 18 px sur l'accueil | titre-3 (20 px) |
| Signes − et + en texte 18 px dans le stepper | Icônes moins et plus, 18 px |
| Épaisseurs de trait des icônes de 1,8 à 2,1 px | 2 px pour toutes les icônes |
| Étiquettes de l'arène au rayon 6 et marge 3 × 8 | Rayon xs (8), marge 4 × 8 |
| Halo du Chat à 30 % / 14 % dans la planche | 28 % / 12 %, comme dans les écrans |
| Survol des liens en `#084F40`, survol destructif en `#8E1E18` | Liens : Accent survol souligné, sans nouvelle couleur. Destructif : nouveau token Erreur survol |
| Espacements hors échelle (5, 6, 9, 10, 13, 14, 20, 22 px…) | Valeur de l'échelle la plus proche, la plus grande à égalité (section 6) |
| Animations de plus de 300 ms alors que la règle les interdit | Règle précisée : la célébration, les boucles et l'illumination sont les seules exceptions |

### 17.2 Éléments des maquettes à ne pas implémenter

- Les pistes de logo 2a et 2b : seule la piste 2c est retenue.
- Le composant « Champ numérique · Nombre de Chats » : remplacé par le stepper de réglage.
- La carte de jeu « sélectionnée » avec le badge « Choisi ».
- Les badges « Coureur », « Manche 2/3 » et « En attente » de la rangée de badges.
- Les légendes, titres de maquettes et annotations (textes au-dessus des écrans et sous les exemples de la planche).
- Les textes d'exemple de la planche qui mentionnent Discord.
- Le fond gris `#E7E9E3` du canevas de présentation.
- Le fichier « Directions visuelles » (pistes non retenues).