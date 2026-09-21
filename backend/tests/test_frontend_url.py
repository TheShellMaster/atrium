from atrium.main import frontend_public_url

_BASE = "https://atrium-chi-flax.vercel.app"


def test_frontend_url_root() -> None:
    assert frontend_public_url("", base=_BASE) == _BASE
    assert frontend_public_url("/", base=_BASE) == _BASE


def test_frontend_url_keeps_page() -> None:
    assert frontend_public_url("examen", base=_BASE) == f"{_BASE}/examen"
    assert frontend_public_url("/patients", base=_BASE) == f"{_BASE}/patients"
