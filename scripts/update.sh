#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

REPO_ROOT=$(pwd)
ENV_FILE="$REPO_ROOT/.env"

COMPOSE_ARGS=""
if [ -f "$ENV_FILE" ]; then
  COMPOSE_ARGS="--env-file $ENV_FILE"
fi

# ─── 1. Pull latest code ─────────────────────────────────────────
echo "⬇️  Pulling latest changes from git..."
git pull

# ─── 2. Tear down containers + remove built images ─────────────
echo "🛑  Stopping containers and removing locally built images..."
docker compose $COMPOSE_ARGS down --rmi local --remove-orphans

# ─── 3. Rebuild & restart ──────────────────────────────────────
echo "🔨  Rebuilding images and starting containers..."
docker compose $COMPOSE_ARGS up --build -d

# ─── 4. Quick health check ─────────────────────────────────────
echo ""
echo "⏳  Waiting for services to start..."
sleep 3

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"
API_PORT="${API_PORT:-3000}"

if [ -f "$ENV_FILE" ]; then
  HOST=$(grep '^HOST=' "$ENV_FILE" | cut -d= -f2 || echo "$HOST")
  PORT=$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2 || echo "$PORT")
  API_PORT=$(grep '^API_PORT=' "$ENV_FILE" | cut -d= -f2 || echo "$API_PORT")
fi

if curl -sf "http://$HOST:$PORT" > /dev/null 2>&1; then
  echo "   ✅ Frontend responding at http://$HOST:$PORT"
else
  echo "   ⚠️  Frontend not responding yet (may need a few more seconds)"
fi

if curl -sf "http://$HOST:$API_PORT/api/health" > /dev/null 2>&1; then
  echo "   ✅ API responding at http://$HOST:$API_PORT/api/health"
else
  echo "   ⚠️  API not responding yet (may need a few more seconds)"
fi

echo ""
echo "🚀  Update complete!"
