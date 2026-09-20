from pydantic import BaseModel, Field


class PatientIn(BaseModel):
    full_name: str | None = None
    age: int = Field(ge=1, le=120)
    sex: int = Field(ge=0, le=1)
    cp: int = Field(ge=0, le=3)
    trestbps: int = Field(ge=60, le=260)
    chol: int = Field(ge=80, le=700)
    fbs: int = Field(ge=0, le=1)
    restecg: int = Field(ge=0, le=2)
    thalach: int = Field(ge=50, le=230)
    exang: int = Field(ge=0, le=1)
    oldpeak: float = Field(ge=0, le=10)
    slope: int = Field(ge=0, le=2)
    ca: int = Field(ge=0, le=4)
    thal: int = Field(ge=0, le=3)
    notes: str | None = None
    persist: bool = True
    # Diagnostic réel si connu (0 préservé, 1 atteint) : le dossier rejoint alors l'apprentissage.
    actual_label: int | None = Field(default=None, ge=0, le=1)
