#!/usr/bin/env zsh

set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"
pnpm -r --if-present build
