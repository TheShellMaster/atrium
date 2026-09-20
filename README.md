# Atrium

Application web de prédiction d'accident cardiovasculaire : régression logistique Python, registre Supabase, interface médicale.

## Lancer

```bash
cd /home/theshellpc/projects/atrium
make dev
```

- Interface : http://127.0.0.1:5173
- API : http://127.0.0.1:8000/docs

Le modèle s'entraîne tout seul sur le jeu **UCI Heart Disease (Cleveland)** — 303 patients réels.

## Supabase

Le MCP du projet est en lecture seule. Pour activer le cloud, colle `supabase/migrations/001_init.sql` dans le SQL Editor. Sans ça, Atrium écrit quand même les dossiers en SQLite local.

## Pages

- `/` cabinet, cœur 3D, termes cliquables
- `/examen` feuille patient et prédiction
- `/modele` VP / FN, ROC, formules
- `/patients` registre
- `/lexique` vocabulaire médical
