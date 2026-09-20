from __future__ import annotations

import io
from contextlib import asynccontextmanager
from datetime import UTC, datetime

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response

from atrium import db
from atrium.analysis import descriptive_stats, frame_from_upload, linear_regression, template_csv
from atrium.features import CHOICES, DEFAULT_PATIENT, FEATURE_META, FEATURE_ORDER
from atrium.lexicon import TERMS
from atrium.metrics import FORMULAS
from atrium.model import dataset_preview, load_metrics, predict_frame, predict_one, train
from atrium.schemas import PatientIn


@asynccontextmanager
async def lifespan(_app: FastAPI):
    report = load_metrics()
    db.save_metrics(report)
    yield


app = FastAPI(title="Atrium", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "storage": db.storage_status()}


@app.get("/api/catalog")
def catalog() -> dict:
    return {
        "features": FEATURE_ORDER,
        "meta": FEATURE_META,
        "choices": CHOICES,
        "defaults": DEFAULT_PATIENT,
        "terms": TERMS,
        "formulas": FORMULAS,
    }


@app.get("/api/model")
def model_card() -> dict:
    report = load_metrics()
    report["preview"] = dataset_preview()
    report["storage"] = db.storage_status()
    return report


@app.post("/api/model/retrain")
def retrain() -> dict:
    report = train()
    db.save_metrics(report)
    return report


@app.post("/api/predict")
def predict(patient: PatientIn) -> dict:
    features = patient.model_dump()
    persist = features.pop("persist")
    full_name = features.pop("full_name")
    notes = features.pop("notes")
    result = predict_one(features)
    saved = None
    if persist:
        saved = db.save_patient(
            {
                "full_name": full_name,
                "age": features["age"],
                "sex": features["sex"],
                "chest_pain": features["cp"],
                "resting_bp": features["trestbps"],
                "cholesterol": features["chol"],
                "fasting_bs": features["fbs"],
                "rest_ecg": features["restecg"],
                "max_hr": features["thalach"],
                "exercise_angina": features["exang"],
                "oldpeak": features["oldpeak"],
                "slope": features["slope"],
                "ca": features["ca"],
                "thal": features["thal"],
                "predicted_label": result["label"],
                "predicted_proba": result["probability"],
                "notes": notes,
            }
        )
        db.save_prediction(
            {
                "patient_id": saved.get("id"),
                "features": features,
                "probability": result["probability"],
                "label": result["label"],
                "threshold": result["threshold"],
                "contributions": result["contributions"],
            }
        )
    return {**result, "patient": saved, "features": features, "full_name": full_name}


@app.get("/api/patients")
def patients() -> dict:
    return {"items": db.list_patients(limit=500), "storage": db.storage_status()}


@app.get("/api/stats")
def stats() -> dict:
    return descriptive_stats()


@app.get("/api/regression")
def regression(x: str = Query("age"), y: str = Query("thalach")) -> dict:
    try:
        return linear_regression(x, y)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/template.csv")
def template() -> PlainTextResponse:
    return PlainTextResponse(
        template_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="atrium-modele-import.csv"'},
    )


@app.post("/api/import")
async def import_patients(file: UploadFile = File(...), persist: bool = Query(True)) -> dict:
    content = await file.read()
    try:
        frame = frame_from_upload(content, file.filename or "import.csv")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # fichier illisible
        raise HTTPException(status_code=400, detail=f"Fichier illisible : {exc}") from exc
    if frame.empty:
        raise HTTPException(status_code=400, detail="Aucune ligne exploitable dans le fichier.")
    if len(frame) > 500:
        raise HTTPException(status_code=400, detail="Limite : 500 lignes par import.")

    results = predict_frame(frame)
    saved = 0
    if persist:
        for item in results:
            f = item["features"]
            patient = db.save_patient(
                {
                    "full_name": item["full_name"],
                    "age": int(f["age"]),
                    "sex": int(f["sex"]),
                    "chest_pain": int(f["cp"]),
                    "resting_bp": int(f["trestbps"]),
                    "cholesterol": int(f["chol"]),
                    "fasting_bs": int(f["fbs"]),
                    "rest_ecg": int(f["restecg"]),
                    "max_hr": int(f["thalach"]),
                    "exercise_angina": int(f["exang"]),
                    "oldpeak": float(f["oldpeak"]),
                    "slope": int(f["slope"]),
                    "ca": int(f["ca"]),
                    "thal": int(f["thal"]),
                    "predicted_label": item["label"],
                    "predicted_proba": item["probability"],
                    "actual_label": item["actual_label"],
                    "notes": f"import {file.filename}",
                }
            )
            item["store"] = patient.get("store")
            saved += 1

    positives = sum(1 for r in results if r["label"] == 1)
    with_truth = [r for r in results if r["actual_label"] is not None]
    accuracy = (
        sum(1 for r in with_truth if r["actual_label"] == r["label"]) / len(with_truth) if with_truth else None
    )
    return {
        "filename": file.filename,
        "rows": len(results),
        "saved": saved,
        "positives": positives,
        "accuracy": accuracy,
        "items": results,
        "storage": db.storage_status(),
    }


@app.get("/api/export")
def export_patients(format: str = Query("csv", pattern="^(csv|xlsx)$")) -> Response:
    rows = db.list_patients(limit=5000)
    columns = [
        "created_at",
        "full_name",
        "age",
        "sex",
        "chest_pain",
        "resting_bp",
        "cholesterol",
        "fasting_bs",
        "rest_ecg",
        "max_hr",
        "exercise_angina",
        "oldpeak",
        "slope",
        "ca",
        "thal",
        "predicted_proba",
        "predicted_label",
        "actual_label",
        "notes",
    ]
    frame = pd.DataFrame(rows)
    for col in columns:
        if col not in frame.columns:
            frame[col] = None
    frame = frame[columns]
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M")
    if format == "xlsx":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            frame.to_excel(writer, index=False, sheet_name="patients")
            metrics = load_metrics()
            pd.DataFrame(
                [
                    {
                        "modele": metrics["model_name"],
                        "exactitude": metrics["accuracy"],
                        "precision": metrics["precision"],
                        "sensibilite": metrics["recall"],
                        "specificite": metrics["specificity"],
                        "f1": metrics["f1"],
                        "auc": metrics["auc"],
                        "VP": metrics["vp"],
                        "VN": metrics["vn"],
                        "FP": metrics["fp"],
                        "FN": metrics["fn"],
                    }
                ]
            ).to_excel(writer, index=False, sheet_name="modele")
        return Response(
            buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="atrium-patients-{stamp}.xlsx"'},
        )
    csv = frame.to_csv(index=False)
    return Response(
        csv,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="atrium-patients-{stamp}.csv"'},
    )
