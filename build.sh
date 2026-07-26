#!/usr/bin/env bash
# build.sh — production build for the Birthday site.
# Emits a flat static bundle in ./dist/ ready for any static host.
set -euo pipefail

mkdir -p dist
cp start.html emulator.html dist/
cp -r static dist/
cp -r apps dist/
echo "build.sh: dist/ contents:"
ls -la dist/
echo "build.sh: dist/apps contents:"
ls -la dist/apps/
