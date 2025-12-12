#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/goodpick-go"
cd "$APP_DIR"

echo "[1/6] Load env (.env.production)"
set -a
source ./.env.production
set +a

echo "[2/6] Drizzle schema check"
npx drizzle-kit check

echo "[3/6] Build"
npm run build

echo "[4/6] Ensure DB schema is applied (safe no-op if already ok)"
npm run db:push

echo "[5/6] Reload pm2 with updated env"
pm2 startOrReload ecosystem.config.cjs --update-env

echo "[6/6] Health check"
curl -fsS https://goodpickgo.com/api/health
echo "✅ Deploy finished"
