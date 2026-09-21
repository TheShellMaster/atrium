# /// script
# requires-python = ">=3.11"
# dependencies = ["huggingface_hub>=0.34", "python-dotenv>=1.0"]
# ///
"""Déploie Atrium sur un Space Hugging Face (Docker).

Prérequis : connexion au compte (une seule fois) :
    uvx --from huggingface_hub hf auth login
Puis :
    uv run scripts/deploy_space.py            # Space public « atrium »
    uv run scripts/deploy_space.py --private  # Space privé

Le script crée le Space s'il n'existe pas, y copie les secrets Supabase depuis .env,
envoie le code (sans node_modules, .venv, bases locales) et affiche l'URL.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import dotenv_values
from huggingface_hub import HfApi
from huggingface_hub.utils import RepositoryNotFoundError

ROOT = Path(__file__).resolve().parents[1]
IGNORE = [
    ".git/*",
    "**/node_modules/**",
    "**/.venv/**",
    "frontend/dist/**",
    "backend/data/atrium.db",
    "backend/models/*",
    ".env",
    ".env.*",
    "**/__pycache__/**",
    "**/.pytest_cache/**",
    "**/.ruff_cache/**",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Déploiement Atrium → Space Hugging Face")
    parser.add_argument("--name", default="atrium", help="nom du Space (défaut : atrium)")
    parser.add_argument("--private", action="store_true", help="Space privé")
    args = parser.parse_args()

    api = HfApi()
    try:
        who = api.whoami()
    except Exception as exc:  # jeton absent ou invalide
        print("Connexion Hugging Face manquante :", exc)
        print("Lance d'abord :  uvx --from huggingface_hub hf auth login")
        return 1
    user = who["name"]
    repo_id = f"{user}/{args.name}"

    try:
        api.repo_info(repo_id, repo_type="space")
        print(f"Space existant : {repo_id}")
    except RepositoryNotFoundError:
        api.create_repo(repo_id, repo_type="space", space_sdk="docker", private=args.private)
        print(f"Space créé : {repo_id}")

    env = {**dotenv_values(ROOT / ".env"), **os.environ}
    for key in ("SUPABASE_URL", "SUPABASE_ANON_KEY"):
        value = env.get(key)
        if value:
            api.add_space_secret(repo_id, key, value)
            print(f"Secret défini : {key}")
        else:
            print(f"Attention : {key} absent de .env, l'API basculera en copie locale.")
    api.add_space_variable(repo_id, "ATRIUM_FRONTEND_URL", "https://atrium-chi-flax.vercel.app")

    print("Envoi du code…")
    api.upload_folder(
        repo_id=repo_id,
        repo_type="space",
        folder_path=str(ROOT),
        ignore_patterns=IGNORE,
        commit_message="Déploiement Atrium",
    )
    space_url = f"https://huggingface.co/spaces/{repo_id}"
    app_url = f"https://{user.lower()}-{args.name.lower()}.hf.space"
    print("\nDéployé. Le Space construit l'image (3 à 5 minutes) :")
    print("  Suivi de la construction :", space_url)
    print("  Application :", app_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
