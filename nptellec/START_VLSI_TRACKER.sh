#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
URL='http://127.0.0.1:8765/VLSI_RTL_to_GDS_Study_Tracker.html'
command -v xdg-open >/dev/null 2>&1 && (sleep 1; xdg-open "$URL" >/dev/null 2>&1) &
echo "Opening $URL — keep this terminal running (Ctrl+C to stop)."
exec python3 -m http.server 8765 --bind 127.0.0.1
