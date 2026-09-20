from __future__ import annotations

import sqlite3
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx

from atrium.config import settings

SQLITE_PATH = settings.data_dir / "atrium.db"


def _connect() -> sqlite3.Connection:
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        create table if not exists patients (
          id text primary key,
          created_at text not null,
          full_name text,
          age integer, sex integer, chest_pain integer, resting_bp integer,
          cholesterol integer, fasting_bs integer, rest_ecg integer,
          max_hr integer, exercise_angina integer, oldpeak real,
          slope integer, ca integer, thal integer,
          predicted_label integer, predicted_proba real,
          actual_label integer, notes text
        )
        """
    )
    conn.execute(
        """
        create table if not exists model_metrics (
          id text primary key,
          created_at text not null,
          model_name text,
          accuracy real, precision_score real, recall real, specificity real,
          f1 real, auc real, vp integer, vn integer, fp integer, fn integer,
          n_train integer, n_test integer, coefficients text,
          intercept real, threshold real, notes text
        )
        """
    )
    conn.execute(
        """
        create table if not exists predictions (
          id text primary key,
          created_at text not null,
          patient_id text,
          features text,
          probability real,
          label integer,
          threshold real,
          contributions text
        )
        """
    )
    conn.commit()
    return conn


def _headers() -> dict[str, str] | None:
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    return {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {settings.supabase_anon_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _supabase_insert(table: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    headers = _headers()
    if not headers:
        return None
    url = f"{settings.supabase_url}/rest/v1/{table}"
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=12)
        if response.status_code >= 400:
            return None
        data = response.json()
        return data[0] if isinstance(data, list) and data else data
    except httpx.HTTPError:
        return None


def _supabase_select(table: str, query: str) -> list[dict[str, Any]] | None:
    headers = _headers()
    if not headers:
        return None
    url = f"{settings.supabase_url}/rest/v1/{table}?{query}"
    try:
        response = httpx.get(url, headers=headers, timeout=12)
        if response.status_code >= 400:
            return None
        data = response.json()
        return data if isinstance(data, list) else None
    except httpx.HTTPError:
        return None


def save_patient(row: dict[str, Any]) -> dict[str, Any]:
    payload = {
        **row,
        "id": row.get("id") or str(uuid.uuid4()),
        "created_at": row.get("created_at") or datetime.now(UTC).isoformat(),
    }
    remote = _supabase_insert("patients", payload)
    if remote:
        payload["store"] = "supabase"
        return remote | {"store": "supabase"}
    conn = _connect()
    cols = [
        "id",
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
        "predicted_label",
        "predicted_proba",
        "actual_label",
        "notes",
    ]
    conn.execute(
        f"insert into patients ({', '.join(cols)}) values ({', '.join('?' for _ in cols)})",
        [payload.get(col) for col in cols],
    )
    conn.commit()
    conn.close()
    return {**payload, "store": "sqlite"}


def list_patients(limit: int = 40) -> list[dict[str, Any]]:
    remote = _supabase_select("patients", f"select=*&order=created_at.desc&limit={limit}")
    if remote is not None:
        return remote
    conn = _connect()
    rows = conn.execute(
        "select * from patients order by created_at desc limit ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def save_metrics(report: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(UTC).isoformat(),
        "model_name": report.get("model_name"),
        "accuracy": report.get("accuracy"),
        "precision_score": report.get("precision"),
        "recall": report.get("recall"),
        "specificity": report.get("specificity"),
        "f1": report.get("f1"),
        "auc": report.get("auc"),
        "vp": report.get("vp"),
        "vn": report.get("vn"),
        "fp": report.get("fp"),
        "fn": report.get("fn"),
        "n_train": report.get("n_train"),
        "n_test": report.get("n_test"),
        "coefficients": report.get("coefficients"),
        "intercept": report.get("intercept"),
        "threshold": report.get("threshold"),
        "notes": report.get("notes"),
    }
    remote = _supabase_insert("model_metrics", payload)
    if remote:
        return remote | {"store": "supabase"}
    conn = _connect()
    conn.execute(
        """
        insert into model_metrics (
          id, created_at, model_name, accuracy, precision_score, recall, specificity,
          f1, auc, vp, vn, fp, fn, n_train, n_test, coefficients, intercept, threshold, notes
        ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        [
            payload["id"],
            payload["created_at"],
            payload["model_name"],
            payload["accuracy"],
            payload["precision_score"],
            payload["recall"],
            payload["specificity"],
            payload["f1"],
            payload["auc"],
            payload["vp"],
            payload["vn"],
            payload["fp"],
            payload["fn"],
            payload["n_train"],
            payload["n_test"],
            str(payload["coefficients"]),
            payload["intercept"],
            payload["threshold"],
            payload["notes"],
        ],
    )
    conn.commit()
    conn.close()
    return {**payload, "store": "sqlite"}


def save_prediction(row: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(UTC).isoformat(),
        **row,
    }
    remote = _supabase_insert("predictions", payload)
    if remote:
        return remote | {"store": "supabase"}
    conn = _connect()
    conn.execute(
        """
        insert into predictions (id, created_at, patient_id, features, probability, label, threshold, contributions)
        values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload["id"],
            payload["created_at"],
            payload.get("patient_id"),
            str(payload.get("features")),
            payload.get("probability"),
            payload.get("label"),
            payload.get("threshold"),
            str(payload.get("contributions")),
        ],
    )
    conn.commit()
    conn.close()
    return {**payload, "store": "sqlite"}


def storage_status() -> dict[str, Any]:
    remote = _supabase_select("patients", "select=id&limit=1")
    return {
        "supabase": remote is not None,
        "sqlite": str(SQLITE_PATH),
    }
