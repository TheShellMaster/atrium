from atrium.data import CP_MAP, SLOPE_MAP, THAL_MAP, load_uci_dataset


def test_uci_dataset_is_decoded() -> None:
    data = load_uci_dataset()
    assert len(data) >= 900
    assert set(data["source"].unique()) == {"cleveland", "hungarian", "switzerland", "va"}
    assert set(data["target"].unique()) == {0, 1}
    assert data["cp"].dropna().between(0, 3).all()
    assert data["slope"].dropna().between(0, 2).all()
    assert data["thal"].between(0, 3).all()
    assert set(CP_MAP.values()) == {0, 1, 2, 3}
    assert set(SLOPE_MAP.values()) == {0, 1, 2}
    assert set(THAL_MAP.values()) == {1, 2, 3}


def test_cleveland_target_matches_uci_semantics() -> None:
    """Ligne 1 de Cleveland (num = 0) doit être « préservé », ligne 2 (num = 2) « atteint »."""
    data = load_uci_dataset()
    cleveland = data[data["source"] == "cleveland"].reset_index(drop=True)
    assert cleveland.loc[0, "age"] == 63 and cleveland.loc[0, "target"] == 0
    assert cleveland.loc[1, "age"] == 67 and cleveland.loc[1, "target"] == 1
