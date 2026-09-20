# Atrium — image tout-en-un : API FastAPI + modèle + interface construite.
# Pensée pour un Space Hugging Face (Docker, port 7860) ou n'importe quel hébergeur de conteneurs.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS api
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ATRIUM_STATIC_DIR=/app/static \
    PORT=7860
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN pip install --no-cache-dir uv && cd backend && uv export --no-dev --no-hashes -o requirements.txt && pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=web /web/dist ./static
RUN useradd -m atrium && chown -R atrium /app
USER atrium
EXPOSE 7860
CMD ["sh", "-c", "cd backend && PYTHONPATH=src uvicorn atrium.main:app --host 0.0.0.0 --port ${PORT}"]
