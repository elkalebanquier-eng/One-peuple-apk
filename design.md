# KIKO👑 — Design Mobile

## Aperçu
KIKO est une application de réseau social premium avec un système de flux vidéo (Buzz), des stories animées, et une section d'opportunités (emplois, formations, financement, partenariats, services).

**Palette de couleurs:**
- **Fond principal:** #121317 (noir très foncé)
- **Surface:** #1B1D24 (gris-noir)
- **Accent principal:** #FF7A30 (orange doré)
- **Accent secondaire:** #FF9D5C (orange clair)
- **Texte principal:** #FFFFFF (blanc)
- **Texte secondaire:** rgba(255,255,255,0.64) (blanc semi-transparent)
- **Succès:** #34D399 (vert)
- **Erreur:** #FF5C72 (rouge)

**Typographie:**
- **Display:** Syne (poids: 700, 800)
- **Corps:** Inter (poids: 400, 500, 600, 700)

---

## Écrans principaux

### 1. **Home Screen** (Accueil)
Affiche le flux social principal avec scroll vertical.

**Contenu:**
- **Hero Banner:** Image avec gradient et titre (16:9)
- **Stories Row:** Bulles animées horizontales (68px) avec dégradé orange
- **Video Cards:** Cartes vidéo avec actions (like, comment, share)
- **Photo/Text Cards:** Cartes mixtes (photos + texte)
- **Buzz Preview Row:** Aperçu horizontal des vidéos tendance

**Interactions:**
- Tap sur story → ouvre viewer plein écran
- Tap sur video card → lecture vidéo
- Tap sur boutons d'action → like/comment/share
- Pull-to-refresh → recharge le feed

---

### 2. **Buzz Screen** (Vidéos Tendance)
Affichage plein écran des vidéos avec scroll vertical snap.

**Contenu:**
- **Vidéo plein écran** (9:16, snap scroll)
- **Barre supérieure:** Titre "Buzz" + bouton retour
- **Actions latérales:** Like, comment, share, profil
- **Indicateur de temps:** Barre de progression
- **Contrôles vidéo:** Play/pause, mute, volume

**Interactions:**
- Swipe vertical → passe à la vidéo suivante
- Tap sur like → ajoute un like avec haptic
- Tap sur profil → ouvre profil utilisateur
- Pull-to-refresh → recharge le flux

---

### 3. **Opportunities Screen** (Emplois/Formations)
Affiche les opportunités filtrables par type et domaine.

**Contenu:**
- **Filtres horizontaux:** Tous, Emploi, Formation, Financement, Partenariat, Service
- **Domaines:** Technologie, Agriculture, Éducation, Santé
- **Cards d'opportunité:** Avatar + titre + description + localisation
- **Badge type:** Couleur + emoji selon type
- **Badge premium:** Pour les posts sponsorisés

**Interactions:**
- Tap sur filtre → change le type d'opportunité
- Tap sur domaine → filtre par domaine
- Tap sur card → ouvre détail
- Tap sur "Publier" → ouvre formulaire de publication

---

### 4. **Profile Screen** (Profil)
Affiche le profil utilisateur avec ses posts et stats.

**Contenu:**
- **En-tête:** Avatar + nom + bio + statistiques (followers, posts)
- **Boutons d'action:** Modifier profil, Partager, Paramètres
- **Onglets:** Posts, Likes, Sauvegardés
- **Grille de posts:** Vignettes des posts utilisateur

**Interactions:**
- Tap sur "Modifier profil" → édite les infos
- Tap sur post → ouvre détail
- Swipe pour changer d'onglet

---

### 5. **Settings Screen** (Paramètres)
Gestion des préférences et compte.

**Contenu:**
- **Compte:** Déconnexion, Supprimer compte
- **Notifications:** Activer/désactiver
- **Apparence:** Mode clair/sombre
- **Langue:** Français/Anglais
- **À propos:** Version, Conditions, Confidentialité

**Interactions:**
- Toggle pour activer/désactiver options
- Tap sur option → ouvre détail ou action

---

## Flux utilisateur principal

1. **Lancement:** Splash screen → Home Screen
2. **Exploration:** Scroll feed → Tap story/video → Viewer
3. **Opportunités:** Tab bar → Opportunities Screen → Filtre → Détail
4. **Profil:** Tab bar → Profile Screen → Modifier/Voir posts
5. **Paramètres:** Tab bar → Settings Screen → Gérer préférences

---

## Composants réutilisables

- **Card:** Surface avec ombre, border, radius
- **Button:** Primaire (orange), secondaire (transparent)
- **Avatar:** Cercle avec gradient border (68px ou 56px)
- **Badge:** Petit label avec couleur de type
- **Action Row:** Icônes avec compteurs (like, comment, share)
- **Story Ring:** Anneau dégradé animé avec avatar
- **Video Player:** Lecteur vidéo avec contrôles

---

## Animations

- **Story Ring:** Dégradé animé (3s loop)
- **Press Feedback:** Scale 0.96 + opacity 0.85
- **Transition:** Ease cubic-bezier(.22,.88,.32,1)
- **Pull-to-refresh:** Spinner rotatif

---

## Considérations de performance

- **Lazy loading:** Images et vidéos chargées à la demande
- **Virtual scrolling:** Pour les longs feeds
- **Caching:** Stories et avatars en cache local
- **Optimisation vidéo:** Compression et adaptive bitrate

---

## Accessibilité

- **Contraste:** Texte blanc sur fond sombre (WCAG AA)
- **Haptics:** Retour tactile pour les actions principales
- **Tailles:** Texte minimum 14px, touches minimum 44x44px
- **Labels:** Tous les boutons ont des labels accessibles
