FROM python:3.12-slim

# Copia uv dall'immagine ufficiale
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Installa dipendenze prima del codice sorgente (migliore layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8080
CMD ["sh", "-c", "uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
