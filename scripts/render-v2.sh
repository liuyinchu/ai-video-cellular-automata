#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p logs/v2 output/v2
scripts/run.sh npx multiplane stills cover-v2.html --at 0 --scale 2 --overwrite --out output/v2/cover --json > logs/v2/cover.jsonl
cp output/v2/cover/t-0.00.png output/v2/cover.png
scripts/run.sh node scripts/test-simulation.cjs > logs/v2/simulation-tests.txt
scripts/run.sh node scripts/test-v2.cjs > logs/v2/continuity-tests.txt
scripts/run.sh npx multiplane lint film-v2.html --json > logs/v2/final-lint.jsonl
scripts/run.sh npx multiplane verify film-v2.html --scale 2 --at 30,34,66,77,94,134,171,215,227,248,284,314,334 --workers 2 --json > logs/v2/verify-final.jsonl 2> logs/v2/verify-final.stderr
scripts/run.sh npx multiplane render film-v2.html --scale 2 --fps 60 --workers "${V2_WORKERS:-2}" --out output/v2/cellular-world-v2-render.mp4 --overwrite --json > logs/v2/final-render.jsonl 2> logs/v2/final-render.stderr
.venv/bin/python scripts/package-v2.py > logs/v2/package.log 2>&1
