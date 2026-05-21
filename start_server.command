#!/bin/bash
cd "$(dirname "$0")"

echo "Avvio del server Spesa App in corso..."
echo "Il server sarà visibile sia su questo Mac (localhost) che dal cellulare (sulla stessa rete Wi-Fi)."
echo "--------------------------------------------------------------------------------------------------"

npm run dev -- --host
