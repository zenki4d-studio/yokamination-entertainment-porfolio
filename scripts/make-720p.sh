#!/usr/bin/env bash
# Build 720p web copies of every film in assets/films for smooth in-page playback.
# Usage: FFMPEG=/path/to/ffmpeg bash scripts/make-720p.sh
set -euo pipefail
FFMPEG="${FFMPEG:-ffmpeg}"
cd "$(dirname "$0")/.."
mkdir -p assets/films/720
for src in assets/films/*.mp4; do
  out="assets/films/720/$(basename "$src")"
  [ -s "$out" ] && continue
  echo "→ $out"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$src" \
    -vf "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)':flags=lanczos" \
    -c:v libx264 -preset medium -crf 24 -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart "$out"
done
