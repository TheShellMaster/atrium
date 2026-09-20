"""Statistiques descriptives, régression linéaire et sigmoïde : le cours, en chiffres."""

from __future__ import annotations

import numpy as np
import pandas as pd

from atrium.data import source_summary
from atrium.features import CATEGORICAL, CHOICES, FEATURE_META, FEATURE_ORDER, NUMERIC
from atrium.model import load_dataset


def descriptive_stats() -> dict:
    data = load_dataset()
    numeric = []
    for col in NUMERIC:
        series = data[col].dropna()
        counts, edges = np.histogram(series, bins=12)
        numeric.append(
            {
                "feature": col,
                "label": FEATURE_META[col]["label"],
                "unit": FEATURE_META[col]["unit"],
                "count": int(series.count()),
                "mean": float(series.mean()),
                "std": float(series.std()),
                "min": float(series.min()),
                "q25": float(series.quantile(0.25)),
                "median": float(series.median()),
                "q75": float(series.quantile(0.75)),
                "max": float(series.max()),
                "histogram": [
                    {"bin": f"{edges[i]:.0f}–{edges[i + 1]:.0f}", "start": float(edges[i]), "count": int(counts[i])}
                    for i in range(len(counts))
                ],
                "missing": int(data[col].isna().sum()),
                "by_target": {
                    "atteint": float(data.loc[data["target"] == 1, col].mean()),
                    "preserve": float(data.loc[data["target"] == 0, col].mean()),
                },
            }
        )

    categorical = []
    for col in CATEGORICAL:
        labels = dict(CHOICES.get(col, []))
        rows = []
        for code, group in data.dropna(subset=[col]).groupby(col):
            rows.append(
                {
                    "code": int(code),
                    "label": labels.get(int(code), str(code)),
                    "count": int(len(group)),
                    "positive_rate": float(group["target"].mean()),
                }
            )
        categorical.append({"feature": col, "label": FEATURE_META[col]["label"], "levels": rows})

    target_counts = data["target"].value_counts().to_dict()
    correlations = []
    for col in FEATURE_ORDER:
        pair = data[[col, "target"]].dropna()
        corr = float(pair[col].astype(float).corr(pair["target"].astype(float)))
        correlations.append({"feature": col, "label": FEATURE_META[col]["label"], "r": corr})
    correlations.sort(key=lambda r: abs(r["r"]), reverse=True)

    matrix_cols = NUMERIC + ["target"]
    corr_matrix = data[matrix_cols].astype(float).corr()
    matrix = [
        {"x": a, "y": b, "r": float(corr_matrix.loc[a, b])}
        for a in matrix_cols
        for b in matrix_cols
    ]

    return {
        "n": int(len(data)),
        "sources": source_summary(data),
        "target": {
            "atteint": int(target_counts.get(1, 0)),
            "preserve": int(target_counts.get(0, 0)),
            "rate": float(data["target"].mean()),
        },
        "numeric": numeric,
        "categorical": categorical,
        "correlations": correlations,
        "matrix": {"columns": matrix_cols, "cells": matrix},
    }


def linear_regression(x: str, y: str) -> dict:
    if x not in NUMERIC or y not in NUMERIC or x == y:
        raise ValueError("Choisis deux variables numériques différentes.")
    data = load_dataset().dropna(subset=[x, y])
    xs = data[x].astype(float).to_numpy()
    ys = data[y].astype(float).to_numpy()
    slope, intercept = np.polyfit(xs, ys, 1)
    pred = slope * xs + intercept
    ss_res = float(np.sum((ys - pred) ** 2))
    ss_tot = float(np.sum((ys - ys.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    r = float(np.corrcoef(xs, ys)[0, 1])
    x0, x1 = float(xs.min()), float(xs.max())
    return {
        "x": x,
        "y": y,
        "x_label": FEATURE_META[x]["label"],
        "y_label": FEATURE_META[y]["label"],
        "x_unit": FEATURE_META[x]["unit"],
        "y_unit": FEATURE_META[y]["unit"],
        "slope": float(slope),
        "intercept": float(intercept),
        "r": r,
        "r2": float(r2),
        "rmse": float(np.sqrt(ss_res / len(xs))),
        "n": int(len(xs)),
        "points": [
            {"x": float(a), "y": float(b), "target": int(t)}
            for a, b, t in zip(xs, ys, data["target"].to_numpy(), strict=True)
        ],
        "line": [
            {"x": x0, "y": float(slope * x0 + intercept)},
            {"x": x1, "y": float(slope * x1 + intercept)},
        ],
        "equation": f"{FEATURE_META[y]['label']} = {slope:.3f} × {FEATURE_META[x]['label']} + {intercept:.2f}",
    }


def sigmoid_curve(z_min: float = -6.0, z_max: float = 6.0, steps: int = 121) -> list[dict]:
    zs = np.linspace(z_min, z_max, steps)
    return [{"z": float(z), "p": float(1 / (1 + np.exp(-z)))} for z in zs]


def frame_from_upload(content: bytes, filename: str) -> pd.DataFrame:
    """Lit un CSV ou un Excel de patients et harmonise les colonnes."""
    import io

    name = filename.lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        frame = pd.read_excel(io.BytesIO(content))
    else:
        text = content.decode("utf-8-sig", errors="replace")
        sep = ";" if text.count(";") > text.count(",") else ","
        frame = pd.read_csv(io.StringIO(text), sep=sep)
    frame.columns = [str(c).strip().lower().replace("\ufeff", "") for c in frame.columns]

    aliases = {
        "chest_pain": "cp",
        "resting_bp": "trestbps",
        "cholesterol": "chol",
        "fasting_bs": "fbs",
        "rest_ecg": "restecg",
        "max_hr": "thalach",
        "exercise_angina": "exang",
        "nom": "full_name",
        "name": "full_name",
        "patient": "full_name",
    }
    frame = frame.rename(columns={k: v for k, v in aliases.items() if k in frame.columns})
    missing = [c for c in FEATURE_ORDER if c not in frame.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes : {', '.join(missing)}")
    for col in FEATURE_ORDER:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    frame = frame.dropna(subset=FEATURE_ORDER)
    return frame


def template_csv() -> str:
    header = ["full_name", *FEATURE_ORDER, "actual_label"]
    rows = [
        ["Patient exemple 1", 63, 1, 3, 145, 233, 1, 0, 150, 0, 2.3, 0, 0, 1, 1],
        ["Patient exemple 2", 67, 1, 0, 160, 286, 0, 0, 108, 1, 1.5, 1, 3, 2, 0],
    ]
    lines = [",".join(header)] + [",".join(str(v) for v in row) for row in rows]
    return "\n".join(lines) + "\n"
