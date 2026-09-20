# Atrium

Application web de prédiction d'accident cardiovasculaire : régression logistique Python, registre Supabase, interface médicale (cœur 3D, respiration, lexique interactif).

Dépôt : https://github.com/TheShellMaster/atrium

## Lancer

```bash
cd /home/theshellpc/projects/atrium
make dev
```

- Interface : http://127.0.0.1:5173
- API : http://127.0.0.1:8000/docs

Le modèle s'entraîne tout seul sur le jeu **UCI Heart Disease (Cleveland)** — 303 patients réels, 13 variables cliniques.

## Ce que fait le modèle

1. Séparation : 227 patients pour apprendre, 76 pour tester (stratifié).
2. Régression logistique : score z = b0 + Σ bi·xi, puis sigmoïde → probabilité.
3. Seuil 0.5 → atteint / préservé.
4. Matrice de confusion sur le jeu de test : VP, VN, FP, FN → exactitude, précision, sensibilité, spécificité, F1, AUC ROC.

Résultats actuels : exactitude 77.6 %, AUC 0.879, 34 VP, 7 FN, 10 FP, 25 VN.

## Supabase

Projet : `kqrscsougysxtaouwqnf`. Trois tables, RLS activée, politiques anon en lecture/écriture :

- `patients` — chaque dossier lu (variables + probabilité + label prédit)
- `predictions` — journal des prédictions avec contributions par variable
- `model_metrics` — métriques de chaque entraînement

Le schéma est versionné dans `supabase/migrations/001_init.sql`. L'API écrit dans Supabase via PostgREST ; si le cloud est injoignable, elle bascule sur une copie SQLite locale (`backend/data/atrium.db`) pour que la démo ne tombe jamais.

## Pages

- `/` cabinet, cœur 3D, termes cliquables qui changent le rythme du cœur
- `/examen` feuille patient, prédiction, contributions au score
- `/modele` matrice VP / FN, courbe ROC, formules du cours, coefficients
- `/patients` registre Supabase
- `/lexique` vocabulaire médical et statistique

## Structure

```
backend/   FastAPI + scikit-learn (src/atrium)
frontend/  React + Vite + Three.js
supabase/  migrations SQL
```
