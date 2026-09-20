from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from atrium import db
from atrium.features import CHOICES, DEFAULT_PATIENT, FEATURE_META, FEATURE_ORDER
from atrium.lexicon import TERMS
from atrium.metrics import FORMULAS
from atrium.model import dataset_preview, load_metrics, predict_one, train
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
    return {"items": db.list_patients(), "storage": db.storage_status()}
