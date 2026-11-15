#!/usr/bin/env bash
# Film a scene and burn its English subtitles: one final file per video.
# Usage: video/render.sh <scene.js> <seconds> <name> [area]   e.g. video/render.sh video/studio/v7.js 10 V7_hoy r8
set -euo pipefail
cd "$(dirname "$0")/.."
scene=$1; secs=$2; name=$3; area=${4:-r8}
mkdir -p video/out
URL="http://localhost:8765/?lang=es&area=$area" python3 video/studio/film.py "$scene" "$secs" "video/out/${name}_clean.mp4"
ffmpeg -loglevel error -y -i "video/out/${name}_clean.mp4" \
  -vf "subtitles=video/subs/${name%%_*}.srt:force_style='FontName=Inter,FontSize=15,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=14'" \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p "video/out/${name}.part.mp4"
mv "video/out/${name}.part.mp4" "video/out/${name}.mp4"; rm "video/out/${name}_clean.mp4"
echo "video/out/${name}.mp4"
