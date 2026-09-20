from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from atrium.config import settings
from atrium.data import load_uci_dataset, registry_frame, source_summary
from atrium.features import CATEGORICAL, FEATURE_META, FEATURE_ORDER, NUMERIC
from atrium.metrics import from_predictions, pack, roc_points

DATASET = settings.data_dir / "heart.csv"
MODEL_PATH = settings.models_dir / "cardio.joblib"
METRICS_PATH = settings.models_dir / "metrics.json"
DATASET_LABEL = "UCI Heart Disease — 4 hôpitaux (Cleveland, Budapest, Zurich/Bâle, Long Beach VA)"


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


def load_dataset(include_registry: bool = True) -> pd.DataFrame:
    """Jeu d'apprentissage : UCI (4 hôpitaux) + dossiers Atrium au diagnostic confirmé.

    Chaque patient confirmé dans le registre affine le modèle et fait grandir les comptes.
    """
    data = load_uci_dataset()
    if not include_registry:
        return data
    try:
        from atrium import db

        extra = registry_frame(db.list_confirmed_patients())
    except Exception:  # registre injoignable : on apprend sur la référence seule
        extra = pd.DataFrame()
    if extra.empty:
        return data
    return pd.concat([data, extra], ignore_index=True)


def load_cleveland() -> pd.DataFrame:
    ensure_dataset()
    return _clean_frame(pd.read_csv(DATASET))


def build_pipeline() -> Pipeline:
    prepare = ColumnTransformer(
        [
            (
                "num",
                Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]),
                NUMERIC,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                CATEGORICAL,
            ),
        ]
    )
    clf = LogisticRegression(max_iter=600, C=1.0, solver="lbfgs")
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
    logits = pipe.decision_function(x_test)
    pred = (proba >= settings.threshold).astype(int)
    confusion = from_predictions(y_test.to_numpy(), pred)
    auc = float(roc_auc_score(y_test, proba))
    # Validation croisée stratifiée 5 plis : chaque patient sert une fois de test → métriques stables.
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    cv = cross_validate(build_pipeline(), x, y, cv=folds, scoring=["accuracy", "roc_auc", "recall", "precision"])
    report = {
        "model_name": "regression_logistique",
        **pack(confusion, auc),
        "cv": {
            "folds": 5,
            "accuracy_mean": float(cv["test_accuracy"].mean()),
            "accuracy_std": float(cv["test_accuracy"].std()),
            "auc_mean": float(cv["test_roc_auc"].mean()),
            "auc_std": float(cv["test_roc_auc"].std()),
            "recall_mean": float(cv["test_recall"].mean()),
            "precision_mean": float(cv["test_precision"].mean()),
        },
        "n_train": int(len(x_train)),
        "n_test": int(len(x_test)),
        "n_total": int(len(data)),
        "threshold": settings.threshold,
        "coefficients": coefficient_table(pipe),
        "intercept": float(pipe.named_steps["clf"].intercept_[0]),
        "roc": roc_points(y_test.to_numpy(), proba),
        "sigmoid": {
            "curve": [
                {"z": float(z), "p": float(1 / (1 + np.exp(-z)))} for z in np.linspace(-6, 6, 121)
            ],
            "patients": [
                {"z": float(z), "p": float(p), "y": int(y)}
                for z, p, y in zip(logits, proba, y_test.to_numpy(), strict=True)
            ],
        },
        "dataset": f"{DATASET_LABEL}, {len(data)} patients réels",
        "n_reference": int((data["source"] != "atrium").sum()),
        "n_registry": int((data["source"] == "atrium").sum()),
        "trained_at": __import__("datetime").datetime.now(__import__("datetime").UTC).isoformat(),
        "sources": source_summary(data),
        "missing": {
            col: float(data[col].isna().mean()) for col in FEATURE_ORDER if data[col].isna().any()
        },
        "notes": (
            "Régression logistique (scikit-learn) : imputation médiane / mode, standardisation, "
            "one-hot, jeu de test stratifié de 25 %."
        ),
    }
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    # Écriture atomique : les requêtes en cours lisent toujours un modèle complet.
    tmp_model = MODEL_PATH.with_suffix(".joblib.tmp")
    joblib.dump(pipe, tmp_model)
    tmp_model.replace(MODEL_PATH)
    tmp_metrics = METRICS_PATH.with_suffix(".json.tmp")
    tmp_metrics.write_text(json.dumps(report, indent=2), encoding="utf-8")
    tmp_metrics.replace(METRICS_PATH)
    _model_cache.clear()
    return report


_model_cache: dict[str, object] = {}


def refresh_from_registry() -> dict:
    """Ré-entraîne avec les dossiers confirmés du registre et journalise les métriques."""
    from atrium import db

    report = train()
    db.save_metrics(report)
    return report


def coefficient_table(pipe: Pipeline) -> list[dict]:
    prep: ColumnTransformer = pipe.named_steps["prep"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    names = [_short_name(n) for n in prep.get_feature_names_out()]
    coefs = clf.coef_[0]
    rows = []
    for name, coef in zip(names, coefs, strict=True):
        rows.append({"name": name, "coef": float(coef)})
    rows.sort(key=lambda r: abs(r["coef"]), reverse=True)
    return rows


def _short_name(name: str) -> str:
    """'num__age' et 'cat__cp_3.0' → 'num__age' / 'cat__cp_3'."""
    if name.startswith("cat__"):
        head, _, code = name.rpartition("_")
        try:
            return f"{head}_{int(float(code))}"
        except ValueError:
            return name
    return name


def load_model() -> Pipeline:
    if not MODEL_PATH.exists():
        train()
    stamp = MODEL_PATH.stat().st_mtime
    cached = _model_cache.get("pipe")
    if cached is not None and _model_cache.get("stamp") == stamp:
        return cached  # type: ignore[return-value]
    pipe = joblib.load(MODEL_PATH)
    _model_cache.update(pipe=pipe, stamp=stamp)
    return pipe


def load_metrics() -> dict:
    if not METRICS_PATH.exists():
        return train()
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


def as_frame(payload: dict) -> pd.DataFrame:
    """Une ligne de features, tolérante aux valeurs manquantes (imputées par le pipeline)."""
    row = {key: payload.get(key) for key in FEATURE_ORDER}
    return pd.DataFrame([row], columns=FEATURE_ORDER).astype(float)


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
    names = [_short_name(n) for n in prep.get_feature_names_out()]
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


def predict_frame(frame: pd.DataFrame) -> list[dict]:
    """Prédit toutes les lignes d'un tableau importé (CSV / Excel)."""
    pipe = load_model()
    features = frame[FEATURE_ORDER].astype(float)
    probas = pipe.predict_proba(features)[:, 1]
    results = []
    for (_, row), proba in zip(frame.iterrows(), probas, strict=True):
        proba = float(proba)
        results.append(
            {
                "full_name": (str(row["full_name"]) if "full_name" in frame.columns and pd.notna(row.get("full_name")) else None),
                "features": {key: _to_python(row[key]) for key in FEATURE_ORDER},
                "probability": proba,
                "label": int(proba >= settings.threshold),
                "risk": risk_label(proba),
                "actual_label": (
                    int(row["actual_label"])
                    if "actual_label" in frame.columns and pd.notna(row.get("actual_label"))
                    else None
                ),
            }
        )
    return results
