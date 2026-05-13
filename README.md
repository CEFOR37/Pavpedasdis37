# Outil collaboratif — Projet Pavillon Pédagogique SDIS

Application React/TypeScript + Firebase + Gemini destinée à la conception, au pilotage et au chiffrage d’un plateau pédagogique SDIS.

## Configuration gratuite recommandée

- Frontend : Netlify Free
- Auth / base / stockage : Firebase Spark Plan
- IA : Gemini Flash via variable d’environnement `GEMINI_API_KEY`
- Aucun secret API ne doit être exposé dans le frontend

## Installation locale

```bash
npm install
npm run lint
npm run build:netlify
npm run dev
```

Créer un fichier `.env.local` :

```bash
GEMINI_API_KEY=xxxxxxxx
GEMINI_MODEL=gemini-2.5-flash
```

## Déploiement Netlify gratuit

Le fichier `netlify.toml` est fourni.

Paramètres Netlify :

```text
Build command: npm run build:netlify
Publish directory: dist
```

Variables d’environnement Netlify :

```text
GEMINI_API_KEY = votre clé Gemini
GEMINI_MODEL = gemini-2.5-flash
```

Les appels `/api/ai/*` sont redirigés vers `netlify/functions/ai.mjs`.

## Firebase

Déployer les règles :

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Fichiers fournis :

- `firestore.rules`
- `storage.rules`

Important : les nouveaux utilisateurs réels sont créés avec le rôle `OBSERVATEUR`. Le premier administrateur doit être promu manuellement dans Firestore.

## Vérifications

```bash
npm run lint
npm audit --audit-level=moderate
npm run build:netlify
```

État validé :

- TypeScript : OK
- Audit npm : 0 vulnérabilité
- Build Netlify : OK

## Points métier renforcés

- Estimations budgétaires contrôlées automatiquement
- Recalcul serveur des totaux : quantité × prix unitaire
- Fourchettes basses/hautes
- Niveau de confiance
- Alertes d’incohérence
- Références régionales internes de prix
- Upload réel GED via Firebase Storage hors mode démo

## Correctifs optimisation et permissions — mai 2026

### Optimisation du bundle
- Passage des pages principales en chargement différé (`React.lazy` + `Suspense`).
- Suppression de Recharts au profit de graphiques CSS légers.
- Suppression des dépendances inutilisées `three`, `@react-three/fiber`, `@react-three/drei`, `jspdf`, `html2canvas`.
- Suppression du SDK `@google/genai` côté navigateur : les appels IA passent désormais par `/api/ai/*`.
- Ajout d'un endpoint `/api/ai/chat` côté serveur/Netlify Function.

### Permissions UI par rôle
Un nouveau module `src/permissions.ts` centralise les droits.

Rôles pris en charge :
- `ADMIN`
- `CHEF_PROJET`
- `FORMATEUR`
- `OBSERVATEUR`
- `PRESTATAIRE`

Les restrictions sont appliquées :
- dans la navigation ;
- sur les boutons d’action ;
- dans le `dispatch` central pour bloquer les mutations non autorisées.

### Tests validés
```bash
npm run lint
npm audit --omit=dev
npm run build:netlify
npm run build
```

Résultat : TypeScript OK, audit 0 vulnérabilité, build OK.
