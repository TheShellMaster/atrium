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
    dataset_url: str = (
        "https://raw.githubusercontent.com/kb22/Heart-Disease-Prediction/master/dataset.csv"
    )


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
