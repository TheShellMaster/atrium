# Atrium

Application web de prédiction d'accident cardiovasculaire : régression logistique Python, registre Supabase, interface dashboard (shadcn/ui) avec cœur anatomique 3D modélisé dans Blender, réseau vasculaire animé et lexique médical interactif.

- Dépôt : https://github.com/TheShellMaster/atrium
- Maquettes Figma (captures des écrans) : https://www.figma.com/design/nIvvsJEJQgtbKMdfRmMpOe

## Lancer

```bash
cd /home/theshellpc/projects/atrium
make dev
```

- Interface : http://127.0.0.1:5173
- API : http://127.0.0.1:8000/docs

Le modèle s'entraîne tout seul au premier démarrage sur le jeu **UCI Heart Disease (Cleveland)** — 303 patients réels, 13 variables cliniques.

## Ce que fait le modèle

1. Séparation stratifiée : 227 patients pour apprendre, 76 pour tester.
2. Régression logistique : score `z = b0 + Σ bi·xi` (variables numériques standardisées, catégorielles en one-hot), puis sigmoïde `P = 1 / (1 + e^-z)`.
3. Seuil 0.5 → atteint / préservé.
4. Matrice de confusion sur le jeu de test : VP, VN, FP, FN → exactitude, précision, sensibilité, spécificité, F1, AUC ROC.

Résultats actuels : exactitude 77.6 %, AUC 0.879, 34 VP, 7 FN, 10 FP, 25 VN.

## Supabase

Projet `kqrscsougysxtaouwqnf`. Trois tables, RLS activée, politiques anon en lecture/écriture :

- `patients` — chaque dossier lu (variables + probabilité + label prédit)
- `predictions` — journal des prédictions avec contributions par variable
- `model_metrics` — métriques de chaque entraînement

Schéma versionné dans `supabase/migrations/001_init.sql`. L'API écrit via PostgREST ; si le cloud est injoignable, elle bascule sur une copie SQLite locale (`backend/data/atrium.db`) pour que la démo ne tombe jamais.

## Interface

Stack : React 19, Vite, TypeScript, Tailwind v4, shadcn/ui (style radix-nova), motion, recharts, Three.js.

- `/` tableau de bord : KPI du modèle, cœur 3D battant (rythme piloté par les termes médicaux survolés), réseau vasculaire animé (artères, veines, globules), matrice de confusion, derniers dossiers
- `/examen` feuille d'examen : 13 variables, prédiction, contributions au score
- `/modele` matrice VP / FN, courbe ROC, coefficients, formules du cours, aperçu des données
- `/patients` registre Supabase
- `/lexique` vocabulaire médical et statistique, le cœur réagit à chaque terme

Thème sombre par défaut, mode clair disponible dans l'en-tête.

## Cœur 3D (Blender)

`tools/blender/build_heart.py` construit un cœur anatomique stylisé (ventricules, oreillettes, aorte, tronc pulmonaire, veines caves, coronaires) en mode headless et l'exporte en `frontend/public/models/heart.glb`.

```bash
~/.local/bin/blender --background --python tools/blender/build_heart.py
```

Si le GLB est absent, l'interface affiche un cœur procédural de repli.

## Structure

```
backend/        FastAPI + scikit-learn (src/atrium)
frontend/       React + Vite + shadcn/ui + Three.js
supabase/       migrations SQL
tools/blender/  script de génération du cœur 3D
```
