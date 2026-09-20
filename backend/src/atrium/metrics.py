from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve


@dataclass
class Confusion:
    vp: int
    vn: int
    fp: int
    fn: int

    @property
    def n(self) -> int:
        return self.vp + self.vn + self.fp + self.fn

    def accuracy(self) -> float:
        return (self.vp + self.vn) / self.n if self.n else 0.0

    def precision(self) -> float:
        den = self.vp + self.fp
        return self.vp / den if den else 0.0

    def recall(self) -> float:
        den = self.vp + self.fn
        return self.vp / den if den else 0.0

    def specificity(self) -> float:
        den = self.vn + self.fp
        return self.vn / den if den else 0.0

    def f1(self) -> float:
        p, r = self.precision(), self.recall()
        return 2 * p * r / (p + r) if (p + r) else 0.0


FORMULAS = [
    {
        "id": "sigmoid",
        "title": "Sigmoïde",
        "latex": "P(Y=1 | x) = 1 / (1 + e^{-z})",
        "plain": "La régression logistique ne donne pas un oui/non brut. Elle calcule d'abord un score z, puis le passe dans une courbe en S (la sigmoïde) pour obtenir une probabilité entre 0 et 1.",
    },
    {
        "id": "logit",
        "title": "Score linéaire",
        "latex": "z = b0 + b1·x1 + b2·x2 + … + bn·xn",
        "plain": "Chaque variable médicale (âge, cholestérol, tension…) est multipliée par un coefficient appris sur les vrais patients. b0 est le point de départ (l'ordonnée à l'origine).",
    },
    {
        "id": "threshold",
        "title": "Seuil de décision",
        "latex": "si P ≥ 0.5 → malade, sinon → sain",
        "plain": "0.5 est le seuil le plus simple. On peut le baisser pour rater moins de malades (plus de faux positifs) ou le monter pour éviter les fausses alertes.",
    },
    {
        "id": "vp",
        "title": "Vrai positif (VP)",
        "latex": "prédit malade ET vraiment malade",
        "plain": "Le modèle a raison de s'inquiéter. C'est le cas qu'on veut maximiser en médecine : ne pas rater un infarctus qui vient.",
    },
    {
        "id": "fn",
        "title": "Faux négatif (FN)",
        "latex": "prédit sain MAIS vraiment malade",
        "plain": "Le plus dangereux. Le patient rentre chez lui alors qu'il a un risque réel. La sensibilité (rappel) mesure justement  VP / (VP + FN).",
    },
    {
        "id": "fp",
        "title": "Faux positif (FP)",
        "latex": "prédit malade MAIS vraiment sain",
        "plain": "Fausse alerte. Stressant, parfois coûteux, rarement mortel. La précision mesure  VP / (VP + FP).",
    },
    {
        "id": "vn",
        "title": "Vrai négatif (VN)",
        "latex": "prédit sain ET vraiment sain",
        "plain": "Le modèle a raison de rassurer. La spécificité mesure  VN / (VN + FP).",
    },
    {
        "id": "accuracy",
        "title": "Exactitude",
        "latex": "(VP + VN) / (VP + VN + FP + FN)",
        "plain": "Part de prédictions justes. Utile, mais trompeuse si les classes sont déséquilibrées.",
    },
    {
        "id": "recall",
        "title": "Sensibilité / rappel",
        "latex": "VP / (VP + FN)",
        "plain": "Parmi les vrais malades, combien le modèle en trouve-t-il ?",
    },
    {
        "id": "precision",
        "title": "Précision",
        "latex": "VP / (VP + FP)",
        "plain": "Parmi ceux que le modèle dit malades, combien le sont vraiment ?",
    },
    {
        "id": "f1",
        "title": "Score F1",
        "latex": "2 · (précision · rappel) / (précision + rappel)",
        "plain": "Moyenne harmonique : elle baisse dès que l'une des deux est faible.",
    },
    {
        "id": "auc",
        "title": "AUC ROC",
        "latex": "aire sous la courbe sensibilité = f(1 − spécificité)",
        "plain": "1.0 = modèle parfait, 0.5 = pile ou face. Elle résume la qualité à tous les seuils, pas seulement 0.5.",
    },
]


def from_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Confusion:
    vp = int(np.sum((y_pred == 1) & (y_true == 1)))
    vn = int(np.sum((y_pred == 0) & (y_true == 0)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    return Confusion(vp=vp, vn=vn, fp=fp, fn=fn)


def roc_points(y_true: np.ndarray, y_score: np.ndarray) -> dict:
    fpr, tpr, thresholds = roc_curve(y_true, y_score)
    auc = float(roc_auc_score(y_true, y_score))
    return {
        "fpr": fpr.tolist(),
        "tpr": tpr.tolist(),
        "thresholds": thresholds.tolist(),
        "auc": auc,
    }


def pack(confusion: Confusion, auc: float) -> dict:
    return {
        **asdict(confusion),
        "accuracy": confusion.accuracy(),
        "precision": confusion.precision(),
        "recall": confusion.recall(),
        "specificity": confusion.specificity(),
        "f1": confusion.f1(),
        "auc": auc,
    }
