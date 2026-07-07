# Script Teaser Vidéo — Taylr (Structure Eigenvalue — Musique + SFX — ~32s)

> Colorimétrie strictement conforme au site (`src/App.tsx`, `src/index.css`) — aucune couleur inventée.
> Structure de montage inspirée de la teaser vidéo Eigenvalue (@geteigen) — techniques de montage reprises, **pas leurs couleurs** (mint/teal), qui sont remplacées par la palette exacte de Taylr ci-dessous.

## Palette de référence (exacte, tirée du code)
- Texte / logo (INK) : `#1C1C1C`
- Texte secondaire (MUTED) : `#6E7078`
- Fond général : dégradé `#F1F1EF` → `#E6E6E3` (clair, gris/crème — thème "Apple / module light", pas de thème sombre)
- Scène produit (pantoufle, "cream-stage") : radial `#FFFFFF` → `#FBF9F4` → `#F3EFE7`
- Scène ambiance hôtel : radial `#F5F8FB` → `#EAEEF3` → `#DFE4EB`
- Verre (glassmorphism) : blanc translucide `rgba(255,255,255,0.55–0.8)`, flou 20-24px
- Couleurs de personnalisation (Pantones réels du configurateur 3D, dans cet ordre) :
  - Blanc — `#F5F0EB`
  - Rouge — 186 C — `#C8102E`
  - Bleu — Reflex Blue C — `#001489`
  - Or — 7406 C — `#F1BE48`
  - Noir — Black C — `#2D2926`

## Techniques de montage reprises de la référence Eigenvalue
1. **Texte kerning-morph** : chaque phrase apparaît d'abord condensée (lettres collées) puis s'écarte en douceur vers son espacement final — jamais un simple fade.
2. **Reveal logo flou → net** : le logo Taylr apparaît d'abord flouté sur le fond crème, puis se stabilise net en 300-400ms.
3. **Accent graphique récurrent** : un petit repère visuel discret (un point/losange fin en `#1C1C1C`, équivalent du "sparkle" Eigenvalue mais sobre, pas doré ni scintillant) marque chaque transition de bloc.
4. **Arc narratif problème → pivot → solution** au lieu d'une simple liste d'arguments.
5. **Cartes produit inclinées / parallax** : les captures du configurateur 3D et de la scène hôtel apparaissent légèrement tiltées avec un léger mouvement de profondeur, pas à plat.

Musique générale : ambiance premium et épurée (piano feutré + pads doux + légère pulsation discrète). Volume bas au début, monte doucement pendant l'animation couleur, puis redescend. Pas d'ambiance "dark/luxe sombre" : le ton musical reste raffiné mais lumineux, à l'image du fond clair du site.

---

## [0-4s — Ouverture / logo]

**Visuel** : Fond `#F1F1EF → #E6E6E3`. Logo Taylr flouté qui se stabilise net (technique #2). Texte kerming-morph (technique #1) : le mot « Taylr. » apparaît condensé puis s'écarte.

**Texte** :
> « Taylr. »

**SFX** :
- Subtil « digital hum » / whoosh électronique doux
- Léger « click »/« lock » métallique quand le logo se stabilise net

---

## [4-9s — Problème (accroche relatable)]

**Visuel** : Fond clair, petites icônes discrètes en `#6E7078` flottant autour du texte (une pantoufle générique, une boîte standard, un échantillon de tissu uni) — sobre, pas d'illustration pastel façon Eigenvalue, juste des pictos fins monochromes. Texte kerning-morph.

**Texte** :
> « Vous offrez encore
> la même pantoufle
> à tous vos clients. »

**SFX** :
- Léger tic électronique à chaque icône qui apparaît

---

## [9-10s — Pivot]

**Visuel** : Fond crème uni, texte seul et minimal au centre, accent graphique (technique #3) qui clignote une fois.

**Texte** :
> « Et si non. »

**SFX** :
- Silence bref (0.3s) puis un « whoosh » sec et court

---

## [10-16s — Solution / personnalisation couleur (moment fort)]

**Visuel** : Pantoufle neutre (fond `#FFFFFF → #FBF9F4 → #F3EFE7`) qui tourne en 3D, présentée comme une carte produit légèrement inclinée (technique #5). Les couleurs défilent **exactement dans l'ordre et les teintes du configurateur réel** :
1. Blanc `#F5F0EB`
2. Rouge `#C8102E` (186 C)
3. Bleu `#001489` (Reflex Blue C)
4. Or `#F1BE48` (7406 C)
5. Noir `#2D2926` (Black C)

Morphing fluide entre chaque teinte, broderie qui se forme, sur fond clair — pas de glow doré artificiel, juste la lumière naturelle de la scène produit du site.

**Texte synchronisé** (kerning-morph) :
> « Alors Taylr
> laisse chaque hôtel
> créer **sa** pantoufle. »

(« sa » en gras, seul mot accentué — écho du "making **decisions**" de la référence)

**Accroche texte** :
> « Du sur-mesure. Au millimètre près. »

**SFX** :
- Doux « swoosh » / morphing liquide quand la couleur change
- Léger tintement cristallin subtil pendant les transitions
- Petit « confirmation » électronique satisfaisant quand la couleur se fixe

---

## [16-24s — Preuve produit / Confort & Expérience]

**Visuel** : Enchaînement de 2-3 cartes légèrement inclinées (technique #5) : capture du configurateur 3D du site, puis slow-motion pied qui glisse dans la pantoufle sur fond `#F5F8FB → #EAEEF3 → #DFE4EB` (scène hôtel), lumière douce et naturelle.

**Texte** :
> « Confort exceptionnel.
> Matériaux premium.
> Pour que chaque invité se sente unique. »

**Accroche texte** :
> « Plus qu'une pantoufle… Une expérience. »

**SFX** :
- Doux « fabric whoosh » soyeux quand le pied glisse dans la pantoufle
- Ambiance légère de chambre d'hôtel (ventilateur doux, ambiance calme) en fond très bas

---

## [24-32s — Reveal final]

**Visuel** : Retour au fond `#F1F1EF → #E6E6E3`, logo qui se stabilise net une dernière fois (écho du reveal d'ouverture), glassmorphism blanc translucide en appui.

**Texte** :
> « Taylr.
> Pantoufles d'hôtel sur-mesure.
> L'élégance réinventée. »

**Texte final** :
> « What is Taylr ?
> Coming soon.
> taylr-site.onrender.com »

**SFX** :
- Whoosh final ample et élégant
- « Resolve » sonore (note musicale positive et propre) quand le logo se stabilise
