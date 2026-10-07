#!/usr/bin/env bash
set -e
echo "▶ Instalando AnonChan..."
npm install
cp -n .env.example .env || true
mkdir -p data/uploads
node scripts/seed.js
echo "✅ Pronto! Rode: npm start"
