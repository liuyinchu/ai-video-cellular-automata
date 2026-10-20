#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export MULTIPLANE_FFMPEG="$PWD/node_modules/ffmpeg-static/ffmpeg"
exec "$@"
