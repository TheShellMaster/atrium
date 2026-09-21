# Atrium — API FastAPI uniquement (l'interface est sur Vercel).
# Bind 0.0.0.0:$PORT pour Render.

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    ATRIUM_FRONTEND_URL=https://atrium-chi-flax.vercel.app
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN pip install --no-cache-dir uv && cd backend && uv export --no-dev --no-hashes -o requirements.txt && pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
RUN useradd -m atrium && chown -R atrium /app
USER atrium
EXPOSE 7860
CMD ["sh", "-c", "cd backend && PYTHONPATH=src uvicorn atrium.main:app --host 0.0.0.0 --port ${PORT}"]
