from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from atrium.config import settings
from atrium.features import CATEGORICAL, FEATURE_META, FEATURE_ORDER, NUMERIC
from atrium.metrics import from_predictions, pack, roc_points

DATASET = settings.data_dir / "heart.csv"
MODEL_PATH = settings.models_dir / "cardio.joblib"
METRICS_PATH = settings.models_dir / "metrics.json"


def _clean_frame(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [c.replace("\ufeff", "").strip() for c in frame.columns]
    frame = frame[FEATURE_ORDER + ["target"]]
    for col in FEATURE_ORDER + ["target"]:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    return frame.dropna()


def ensure_dataset() -> Path:
    if DATASET.exists():
        return DATASET
    import urllib.request

    DATASET.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(settings.dataset_url, DATASET)
    return DATASET


def load_dataset() -> pd.DataFrame:
    ensure_dataset()
    return _clean_frame(pd.read_csv(DATASET))


def build_pipeline() -> Pipeline:
    prepare = ColumnTransformer(
        [
            ("num", StandardScaler(), NUMERIC),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL,
            ),
        ]
    )
    clf = LogisticRegression(max_iter=400, C=1.2, solver="lbfgs")
    return Pipeline([("prep", prepare), ("clf", clf)])


def train(random_state: int = 42) -> dict:
    data = load_dataset()
    x = data[FEATURE_ORDER]
    y = data["target"].astype(int)
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=random_state, stratify=y
    )
    pipe = build_pipeline()
    pipe.fit(x_train, y_train)
    proba = pipe.predict_proba(x_test)[:, 1]
    pred = (proba >= settings.threshold).astype(int)
    confusion = from_predictions(y_test.to_numpy(), pred)
    auc = float(roc_auc_score(y_test, proba))
    report = {
        "model_name": "regression_logistique",
        **pack(confusion, auc),
        "n_train": int(len(x_train)),
        "n_test": int(len(x_test)),
        "n_total": int(len(data)),
        "threshold": settings.threshold,
        "coefficients": coefficient_table(pipe),
        "intercept": float(pipe.named_steps["clf"].intercept_[0]),
        "roc": roc_points(y_test.to_numpy(), proba),
        "dataset": "UCI Heart Disease (Cleveland), 303 patients réels",
        "notes": "Régression logistique entraînée sur un quart de test stratifié.",
    }
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def coefficient_table(pipe: Pipeline) -> list[dict]:
    prep: ColumnTransformer = pipe.named_steps["prep"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    names = prep.get_feature_names_out()
    coefs = clf.coef_[0]
    rows = []
    for name, coef in zip(names, coefs, strict=True):
        rows.append({"name": name, "coef": float(coef)})
    rows.sort(key=lambda r: abs(r["coef"]), reverse=True)
    return rows


def load_model() -> Pipeline:
    if not MODEL_PATH.exists():
        train()
    return joblib.load(MODEL_PATH)


def load_metrics() -> dict:
    if not METRICS_PATH.exists():
        return train()
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


def as_frame(payload: dict) -> pd.DataFrame:
    row = {key: payload[key] for key in FEATURE_ORDER}
    return pd.DataFrame([row], columns=FEATURE_ORDER)


def predict_one(payload: dict) -> dict:
    pipe = load_model()
    frame = as_frame(payload)
    proba = float(pipe.predict_proba(frame)[0, 1])
    label = int(proba >= settings.threshold)
    contributions = local_contributions(pipe, frame)
    return {
        "probability": proba,
        "label": label,
        "threshold": settings.threshold,
        "risk": risk_label(proba),
        "contributions": contributions,
        "logit": float(pipe.decision_function(frame)[0]),
    }


def local_contributions(pipe: Pipeline, frame: pd.DataFrame) -> list[dict]:
    """Contribution de chaque variable au logit du patient."""
    prep: ColumnTransformer = pipe.named_steps["prep"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    transformed = prep.transform(frame)[0]
    names = prep.get_feature_names_out()
    contribs = transformed * clf.coef_[0]
    grouped: dict[str, float] = {key: 0.0 for key in FEATURE_ORDER}
    for name, value in zip(names, contribs, strict=True):
        raw = name.split("__", 1)[-1]
        key = raw.split("_", 1)[0] if raw.split("_", 1)[0] in FEATURE_ORDER else raw
        if key in grouped:
            grouped[key] += float(value)
        else:
            grouped[raw] = grouped.get(raw, 0.0) + float(value)
    rows = [
        {
            "feature": key,
            "label": FEATURE_META.get(key, {}).get("label", key),
            "value": _to_python(frame.iloc[0][key]),
            "contribution": grouped[key],
        }
        for key in FEATURE_ORDER
    ]
    rows.sort(key=lambda r: abs(r["contribution"]), reverse=True)
    return rows


def risk_label(probability: float) -> str:
    if probability < 0.25:
        return "faible"
    if probability < 0.5:
        return "modéré"
    if probability < 0.75:
        return "élevé"
    return "critique"


def _to_python(value: object) -> float | int:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value)
    return int(value) if isinstance(value, int) else float(value)


def dataset_preview(limit: int = 8) -> list[dict]:
    data = load_dataset().head(limit)
    return json.loads(data.to_json(orient="records"))
