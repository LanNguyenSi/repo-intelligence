#!/usr/bin/env bash
# Asserts the built ci-insights runtime image keeps its contract:
#   1. the bundled prisma CLI version equals the version pinned in package-lock.json
#   2. no package from package.json devDependencies is present under
#      /app/node_modules, except dotenv (prisma.config.ts imports it)
# Usage: check-runtime-image.sh <image-tag>
# Requires docker and node on PATH. Reads package.json and package-lock.json
# next to this script's package directory.
set -euo pipefail

image="${1:?usage: check-runtime-image.sh <image-tag>}"
pkg_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

expected="$(node -e '
const lock = require(process.argv[1]);
const entry = lock.packages && lock.packages["node_modules/prisma"];
if (!entry || !entry.version) { console.error("prisma missing from lockfile"); process.exit(1); }
process.stdout.write(entry.version);
' "$pkg_dir/package-lock.json")"

actual="$(docker run --rm --entrypoint node "$image" node_modules/prisma/build/index.js -v \
  | sed -n 's/^prisma[[:space:]]*:[[:space:]]*//p' | head -n 1)"

echo "prisma lockfile version: $expected"
echo "prisma image version:    $actual"
if [ "$actual" != "$expected" ]; then
  echo "FAIL: prisma version in image does not match the lockfile" >&2
  exit 1
fi

# Derived from package.json, not from directory names: an empty scope
# directory such as node_modules/@types must not count as a hit.
dev_deps=()
while IFS= read -r name; do
  dev_deps+=("$name")
done < <(node -e '
const pkg = require(process.argv[1]);
for (const name of Object.keys(pkg.devDependencies || {})) {
  if (name !== "dotenv") console.log(name);
}
' "$pkg_dir/package.json")

if [ "${#dev_deps[@]}" -eq 0 ]; then
  echo "FAIL: no devDependencies found in package.json (guard would be vacuous)" >&2
  exit 1
fi

present="$(docker run --rm --entrypoint sh "$image" -c '
for name in "$@"; do
  if [ -e "node_modules/$name/package.json" ]; then echo "$name"; fi
done
' sh "${dev_deps[@]}")"

echo "devDependencies checked: ${#dev_deps[@]}"
if [ -n "$present" ]; then
  echo "FAIL: devDependencies shipped in the runtime image:" >&2
  echo "$present" >&2
  exit 1
fi
echo "OK: runtime image matches the lockfile prisma version and ships no devDependencies"
