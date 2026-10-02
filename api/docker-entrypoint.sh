#!/bin/sh
set -e

echo "[SGMT] Verifying and deploying database schema migrations..."
npx prisma migrate deploy || npx prisma db push --skip-generate

echo "[SGMT] Starting NestJS backend server..."
exec "$@"
