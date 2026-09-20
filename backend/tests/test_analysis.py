from atrium.analysis import descriptive_stats, frame_from_upload, linear_regression, template_csv


def test_descriptive_stats_shape() -> None:
    stats = descriptive_stats()
    assert stats["n"] >= 900  # UCI, 4 hôpitaux
    assert stats["target"]["atteint"] + stats["target"]["preserve"] == stats["n"]
    assert {row["feature"] for row in stats["numeric"]} == {"age", "trestbps", "chol", "thalach", "oldpeak"}
    assert {s["source"] for s in stats["sources"]} == {"cleveland", "hungarian", "switzerland", "va"}


def test_linear_regression_age_thalach() -> None:
    reg = linear_regression("age", "thalach")
    assert reg["slope"] < 0  # la fréquence max baisse avec l'âge
    assert 0 < reg["r2"] < 1
    assert len(reg["points"]) > 800


def test_template_roundtrip() -> None:
    frame = frame_from_upload(template_csv().encode(), "modele.csv")
    assert len(frame) == 2
    assert "full_name" in frame.columns
