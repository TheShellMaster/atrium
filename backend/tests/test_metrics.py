from atrium.metrics import Confusion


def test_confusion_formulas() -> None:
    matrix = Confusion(vp=40, vn=30, fp=10, fn=5)
    assert matrix.n == 85
    assert round(matrix.accuracy(), 4) == round(70 / 85, 4)
    assert matrix.precision() == 40 / 50
    assert matrix.recall() == 40 / 45
    assert matrix.specificity() == 30 / 40
