#!/bin/bash

# ================================================
# Spesa App - Script di Compilazione
# ================================================

# Vai nella cartella del progetto
cd "$(dirname "$0")"

echo ""
echo "🚀 Avvio compilazione Spesa App (PWA)..."
echo ""

# Esegui la compilazione
npm run build

echo ""
echo "✅ Compilazione completata!"
echo ""
echo "================================================"
echo "  ISTRUZIONI UPLOAD SU FILEZILLA"
echo "================================================"
echo ""
echo "  1. Apri FileZilla"
echo "  2. Vai nella cartella del tuo server (es. /spesa/)"
echo "  3. Carica (sovrascrivendo) l'intero contenuto"
echo "     della cartella 'dist/' sul server"
echo ""
echo "  I file da caricare sono in:"
echo "  $(pwd)/dist/"
echo ""
echo "================================================"
echo ""

open "$(pwd)/dist"
