---
title: Atrium
emoji: 🫀
colorFrom: green
colorTo: red
sdk: docker
app_port: 7860
pinned: false
license: cc-by-4.0
---

# Atrium

Application web de prédiction du risque cardiovasculaire : régression logistique Python entraînée sur 918 patients réels (UCI, 4 hôpitaux), registre Supabase, interface dashboard shadcn/ui avec cœur anatomique 3D translucide, réseau vasculaire animé, ECG de moniteur, sons, lexique et documentation intégrés.

- **Site en ligne : https://atrium-xscu.onrender.com** (Render, plan gratuit : première ouverture après une pause = 30 à 60 s de réveil)
- Dépôt : https://github.com/TheShellMaster/atrium
- Maquettes Figma (captures des écrans) : https://www.figma.com/design/nIvvsJEJQgtbKMdfRmMpOe
- Documentation complète : page `/documentation` de l'application

## Lancer en local

```bash
git clone https://github.com/TheShellMaster/atrium
cd atrium
make dev
```

- Interface : http://127.0.0.1:5173
- API : http://127.0.0.1:8000/docs

Le modèle s'entraîne tout seul au premier démarrage. Les clés Supabase se mettent dans `.env` (voir `.env.example`).

## Héberger gratuitement

GitHub Pages n'héberge que du statique : l'API Python (scikit-learn) ne peut pas y tourner. Le `Dockerfile` à la racine construit l'interface et la sert avec l'API sur le même domaine.

### Option A — tout-en-un sur Render (recommandé, gratuit, sans carte)

`render.yaml` décrit le service. Sur https://dashboard.render.com : **New → Blueprint**, choisir le dépôt GitHub `atrium` (autoriser l'accès au dépôt privé), Render lit `render.yaml` ; renseigner les deux secrets `SUPABASE_URL` et `SUPABASE_ANON_KEY` (valeurs de `.env`) puis **Apply**. Première construction : 5 à 8 minutes. URL du type `https://atrium.onrender.com`.

Le plan gratuit met le service en veille après 15 minutes sans visite (premier chargement ensuite : 30 à 60 s). Pour une présentation, ouvrir le site quelques minutes avant, ou programmer un ping gratuit de `/api/health` toutes les 10 minutes (par exemple https://cron-job.org).

### Option B — frontend sur Vercel, API sur Render

1. Déployer l'API avec l'option A.
2. Sur https://vercel.com/new, importer le dépôt, **Root Directory = `frontend`**, framework Vite, variable `VITE_API_URL=https://atrium.onrender.com`.
3. Côté API, variable `ATRIUM_CORS_ORIGINS=https://<projet>.vercel.app` (les `*.vercel.app` sont déjà acceptés). `frontend/vercel.json` contient la réécriture SPA.

### Hugging Face

Les Spaces Docker ne sont plus gratuits (abonnement PRO requis) ; `scripts/deploy_space.py` reste disponible pour un compte PRO : `uv run scripts/deploy_space.py`.

## Ce que fait le modèle

1. Séparation stratifiée : 688 patients pour apprendre, 230 pour tester.
2. Pipeline scikit-learn : imputation (médiane / mode), standardisation des numériques, one-hot des catégorielles, régression logistique.
3. Score `z = b0 + Σ bi·xi`, sigmoïde `P = 1 / (1 + e^-z)`, seuil 0.5.
4. Matrice de confusion sur le jeu de test : VP, VN, FP, FN → exactitude, précision, sensibilité, spécificité, F1, AUC ROC.

Résultats actuels : exactitude 82.6 %, AUC 0.894, sensibilité 86.6 %, spécificité 77.7 % (110 VP, 17 FN, 23 FP, 80 VN).

## Données

Jeu UCI Heart Disease : Cleveland Clinic (303), Institut de cardiologie de Budapest (294), hôpitaux universitaires de Zurich et Bâle (123), VA Medical Center Long Beach (200). Fichiers officiels dans `backend/data/uci`, décodage documenté dans `backend/src/atrium/data.py` (type de douleur, pente, thallium, cible « num » 0–4 → 0/1). La copie Kaggle très diffusée a la cible inversée ; Atrium repart des fichiers UCI.

## Supabase

Projet `kqrscsougysxtaouwqnf`, trois tables avec RLS (`patients`, `predictions`, `model_metrics`). Schéma dans `supabase/migrations/`. L'API écrit via PostgREST avec nouvelle tentative ; si le réseau tombe, une copie locale temporaire prend le relais et l'interface l'affiche clairement.

## Interface

React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, recharts, motion, Three.js, Web Audio.

- `/` tableau de bord · `/examen` feuille d'examen et ticket de consultation · `/modele` matrice VP/FN, sigmoïde, ROC, coefficients, régression linéaire, formules, données · `/statistiques` · `/patients` registre, import/export CSV-Excel · `/lexique` · `/documentation`
- Cœur 3D low-poly translucide en arrière-plan (dérivé CC BY 4.0, voir `frontend/public/models/CREDITS.md`), vaisseaux animés qui descendent vers les poumons au défilement, ECG PQRST, sons synthétisés, fenêtres explicatives sur chaque terme, animation d'entrée, thème sombre/clair.

## Structure

```
backend/        FastAPI + scikit-learn (src/atrium), données UCI, tests
frontend/       React + Vite + shadcn/ui + Three.js
supabase/       migrations SQL
Dockerfile      image tout-en-un (Space Hugging Face)
```

## Tests

```bash
cd backend && PYTHONPATH=src uv run pytest -q
cd frontend && npx tsc --noEmit
```
