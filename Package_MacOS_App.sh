#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "====================================================================="
echo " Building Clariora for macOS"
echo "====================================================================="
python3 tools/make_macos_icon.py
python3 tools/build_macos_app.py "$@"
echo
echo "Artifacts: $(pwd)/release/"
