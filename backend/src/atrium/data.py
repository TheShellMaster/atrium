"""Construction du jeu de données : UCI Heart Disease, 4 hôpitaux, 920 patients.

Sources officielles (archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/) :
processed.cleveland.data (303), processed.hungarian.data (294),
processed.switzerland.data (123), processed.va.data (200).

Décodage vers l'encodage d'Atrium (celui des menus de l'interface) :
- cp   : UCI 1 typique, 2 atypique, 3 non angineuse, 4 asymptomatique → 0, 1, 2, 3
- slope: UCI 1 ascendante, 2 plate, 3 descendante → 0, 1, 2
- thal : UCI 3 normal, 6 défaut fixe, 7 défaut réversible → 1, 2, 3 ; inconnu → 0
- target : UCI num 0 = pas de maladie, 1–4 = sténose > 50 % → 0 / 1
- '?' = valeur manquante ; cholestérol ou tension à 0 = manquant (Suisse).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from atrium.config import settings
from atrium.features import FEATURE_ORDER

UCI_DIR = settings.data_dir / "uci"
DATASET_PATH = settings.data_dir / "heart_uci.csv"
UCI_COLUMNS = [*FEATURE_ORDER, "num"]
SOURCES = {
    "cleveland": "Cleveland Clinic (Ohio)",
    "hungarian": "Institut de cardiologie de Budapest",
    "switzerland": "Hôpitaux universitaires de Zurich et Bâle",
    "va": "VA Medical Center, Long Beach (Californie)",
}
CP_MAP = {1: 0, 2: 1, 3: 2, 4: 3}
SLOPE_MAP = {1: 0, 2: 1, 3: 2}
THAL_MAP = {3: 1, 6: 2, 7: 3}


def _read_source(path: Path, source: str) -> pd.DataFrame:
    frame = pd.read_csv(path, header=None, names=UCI_COLUMNS, na_values=["?", "-9"])
    frame["source"] = source
    return frame


def build_dataset() -> pd.DataFrame:
    frames = []
    for source in SOURCES:
        path = UCI_DIR / f"processed.{source}.data"
        if path.exists():
            frames.append(_read_source(path, source))
    if not frames:
        raise FileNotFoundError(f"Fichiers UCI absents dans {UCI_DIR}")
    data = pd.concat(frames, ignore_index=True)
    for col in UCI_COLUMNS:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data["cp"] = data["cp"].map(CP_MAP)
    data["slope"] = data["slope"].map(SLOPE_MAP)
    data["thal"] = data["thal"].map(THAL_MAP).fillna(0)
    data.loc[data["chol"] <= 0, "chol"] = np.nan
    data.loc[data["trestbps"] <= 0, "trestbps"] = np.nan
    data["target"] = (data["num"] > 0).astype(int)
    data = data.drop(columns=["num"])
    data = data.dropna(subset=["age", "sex", "cp", "target"])
    data = data.drop_duplicates()
    data = data.reset_index(drop=True)
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(DATASET_PATH, index=False)
    return data


def load_uci_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        return build_dataset()
    return pd.read_csv(DATASET_PATH)


def source_summary(data: pd.DataFrame) -> list[dict]:
    rows = []
    for source, label in SOURCES.items():
        part = data[data["source"] == source]
        if part.empty:
            continue
        rows.append(
            {
                "source": source,
                "label": label,
                "n": int(len(part)),
                "positive_rate": float(part["target"].mean()),
                "missing_rate": float(part[FEATURE_ORDER].isna().mean().mean()),
            }
        )
    return rows
