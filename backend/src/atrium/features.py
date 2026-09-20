FEATURE_ORDER = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]

NUMERIC = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORICAL = ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal"]

FEATURE_META = {
    "age": {"label": "Âge", "unit": "ans", "hint": "Le risque cardiovasculaire augmente avec l'âge."},
    "sex": {"label": "Sexe", "unit": "", "hint": "1 = homme, 0 = femme (codage du jeu UCI)."},
    "cp": {"label": "Douleur thoracique", "unit": "", "hint": "Type d'angor ressenti à l'effort ou au repos."},
    "trestbps": {"label": "Pression au repos", "unit": "mmHg", "hint": "Tension artérielle systolique mesurée au repos."},
    "chol": {"label": "Cholestérol", "unit": "mg/dL", "hint": "Cholestérol sérique total."},
    "fbs": {"label": "Glycémie à jeun", "unit": "", "hint": "1 si la glycémie à jeun dépasse 120 mg/dL."},
    "restecg": {"label": "ECG au repos", "unit": "", "hint": "Lecture de l'électrocardiogramme au repos."},
    "thalach": {"label": "Fréquence max", "unit": "bpm", "hint": "Fréquence cardiaque maximale atteinte à l'effort."},
    "exang": {"label": "Angine d'effort", "unit": "", "hint": "1 si une douleur apparaît pendant l'exercice."},
    "oldpeak": {"label": "Dépression ST", "unit": "mm", "hint": "Abaissement du segment ST à l'effort (oldpeak)."},
    "slope": {"label": "Pente ST", "unit": "", "hint": "Pente du segment ST au pic de l'effort."},
    "ca": {"label": "Vaisseaux colorés", "unit": "", "hint": "Nombre de vaisseaux majeurs vus à la fluoroscopie."},
    "thal": {"label": "Thalium", "unit": "", "hint": "Résultat du test de stress au thallium."},
}

CHOICES = {
    "sex": [(0, "Femme"), (1, "Homme")],
    "cp": [
        (0, "Angine typique"),
        (1, "Angine atypique"),
        (2, "Douleur non angineuse"),
        (3, "Asymptomatique"),
    ],
    "fbs": [(0, "≤ 120 mg/dL"), (1, "> 120 mg/dL")],
    "restecg": [
        (0, "Normal"),
        (1, "Anomalie ST-T"),
        (2, "Hypertrophie ventriculaire"),
    ],
    "exang": [(0, "Non"), (1, "Oui")],
    "slope": [(0, "Ascendante"), (1, "Plate"), (2, "Descendante")],
    "ca": [(0, "0"), (1, "1"), (2, "2"), (3, "3"), (4, "4")],
    "thal": [
        (0, "Inconnu"),
        (1, "Normal"),
        (2, "Défaut fixe"),
        (3, "Défaut réversible"),
    ],
}

DEFAULT_PATIENT = {
    "age": 54,
    "sex": 1,
    "cp": 0,
    "trestbps": 132,
    "chol": 246,
    "fbs": 0,
    "restecg": 1,
    "thalach": 150,
    "exang": 0,
    "oldpeak": 1.0,
    "slope": 1,
    "ca": 0,
    "thal": 2,
}
