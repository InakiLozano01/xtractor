#!/bin/sh
set -e

echo "=== xtractor — starting ==="

echo "── migrate ──────────────────────────────────"
node scripts/migrate.mjs

echo "── seed admin ───────────────────────────────"
node scripts/seed-admin.mjs

echo "── server ───────────────────────────────────"
exec node server.js
