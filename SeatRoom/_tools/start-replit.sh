#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/frontend"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm check
  pnpm build
else
  npm install
  npm run check
  npm run build
fi

rm -rf "$ROOT/backend/static"
mkdir -p "$ROOT/backend/static"
cp -a "$ROOT/frontend/dist/public/." "$ROOT/backend/static/"

cd "$ROOT/backend"
python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
