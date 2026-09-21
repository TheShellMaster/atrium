from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO / ".env", ROOT / ".env"),
        extra="ignore",
    )

    supabase_url: str = "https://kqrscsougysxtaouwqnf.supabase.co"
    supabase_anon_key: str = ""
    data_dir: Path = ROOT / "data"
    models_dir: Path = ROOT / "models"
    threshold: float = 0.5
    # Origines autorisées (CORS), séparées par des virgules. Vide = localhost uniquement.
    atrium_cors_origins: str = ""
    # Dossier du frontend construit (optionnel, docker local). Vide = API seulement.
    atrium_static_dir: str = ""
    # URL publique de l'interface Vercel. Vide en local ; Render la renseigne.
    atrium_frontend_url: str = ""
    dataset_url: str = (
        "https://raw.githubusercontent.com/kb22/Heart-Disease-Prediction/master/dataset.csv"
    )


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
