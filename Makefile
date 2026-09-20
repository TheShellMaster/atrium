.PHONY: dev api web train

dev:
	$(MAKE) -j2 api web

api:
	cd backend && uv sync && uv run uvicorn atrium.main:app --reload --app-dir src --host 127.0.0.1 --port 8000

web:
	cd frontend && npm install && npm run dev

train:
	cd backend && uv sync && PYTHONPATH=src uv run python -c "from atrium.model import train; print(train()['accuracy'])"
