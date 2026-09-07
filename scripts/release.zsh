#!/usr/bin/env zsh
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/release.zsh <version>

Synchronize all package manifests, verify the project, commit a release, and
push the commit and matching v<version> tag to origin.

Example:
  scripts/release.zsh 0.1.12
EOF
}

if (( $# == 1 )) && [[ "$1" == "--help" || "$1" == "-h" ]]; then
  usage
  exit 0
fi

if (( $# != 1 )); then
  usage
  exit 1
fi

version="$1"
if [[ ! "$version" =~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$' ]]; then
  print -u2 "Invalid semantic version: $version"
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ -n "$(git status --porcelain)" ]]; then
  print -u2 'Working tree must be clean before releasing.'
  exit 1
fi

if [[ "$(git branch --show-current)" != 'main' ]]; then
  print -u2 'Releases must be created from main.'
  exit 1
fi

git fetch origin main
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse FETCH_HEAD)" ]]; then
  print -u2 'Local main must match origin/main before releasing.'
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  print -u2 "Tag v$version already exists locally."
  exit 1
fi

remote_tag="$(git ls-remote --tags origin "refs/tags/v$version")" || {
  print -u2 'Could not verify remote tags.'
  exit 1
}
if [[ -n "$remote_tag" ]]; then
  print -u2 "Tag v$version already exists on origin."
  exit 1
fi

release_succeeded=false
cleanup() {
  if [[ "$release_succeeded" != true ]]; then
    git restore -- package.json packages/*/package.json
  fi
}
trap cleanup EXIT

node --input-type=module - "$version" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
const manifests = [
  'package.json',
  'packages/frontend/package.json',
  'packages/backend/package.json',
  'packages/client/package.json',
  'packages/protocol/package.json',
];

for (const manifest of manifests) {
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  pkg.version = version;
  writeFileSync(manifest, `${JSON.stringify(pkg, null, 2)}\n`);
}
NODE

pnpm test
pnpm test:packages
pnpm build

git add package.json packages/*/package.json
if ! git diff --cached --quiet; then
  git commit -m "release: v$version"
fi
git tag "v$version"
git push --atomic origin main "v$version"
release_succeeded=true
