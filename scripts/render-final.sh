#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p logs output
scripts/run.sh npm test > logs/simulation-tests.txt
scripts/run.sh npx multiplane lint film.html --json > logs/final-lint.jsonl
scripts/run.sh npx multiplane verify film.html --at 0,12,21,48,86,95,114,141,143,146,162,192,224,239,264,302,314,336,349 --workers 2 --json > logs/final-verify.jsonl 2> logs/final-verify.stderr
scripts/run.sh npx multiplane render film.html --out output/cellular-world-render.mp4 --overwrite --audio output/master.wav --workers 3 --json > logs/final-render.jsonl 2> logs/final-render.stderr
.venv/bin/python scripts/package.py > logs/package.log 2>&1
