#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PY_PKG_DIR="$REPO_ROOT/packages/python"

BUMP=""
REPOSITORY="pypi"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bump|-b)
            BUMP="$2"
            shift 2
            ;;
        --repository|-r)
            REPOSITORY="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: $0 [--bump patch|minor|major] [--repository pypi|testpypi]" >&2
            exit 1
            ;;
    esac
done

echo "Building and publishing eepy-page-i18n (Python package)"

if [ -n "${PYTHON:-}" ] && command -v "$PYTHON" >/dev/null 2>&1; then
    PY_BIN="$PYTHON"
elif [ -n "${VIRTUAL_ENV:-}" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
    PY_BIN="$VIRTUAL_ENV/bin/python"
elif [ -x "$REPO_ROOT/../eepy.page-backend/venv/bin/python" ]; then
    PY_BIN="$REPO_ROOT/../eepy.page-backend/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PY_BIN="python3"
else
    echo "Error: Could not find Python interpreter." >&2
    exit 1
fi

echo "Using Python: $PY_BIN ($($PY_BIN --version))"

if ! "$PY_BIN" -m build --version >/dev/null 2>&1; then
    echo "Installing 'build' package..."
    "$PY_BIN" -m pip install build
fi

if ! "$PY_BIN" -m twine --version >/dev/null 2>&1; then
    echo "Installing 'twine' package..."
    "$PY_BIN" -m pip install twine
fi

echo "Running catalog validation and conformance tests..."
cd "$REPO_ROOT"
npm run check

echo "Temporarily bundling canonical JSON catalogs for packaging..."
rm -rf "$PY_PKG_DIR/src/eepy_page_i18n/locales"
cp -R "$REPO_ROOT/locales" "$PY_PKG_DIR/src/eepy_page_i18n/locales"

trap 'rm -rf "$PY_PKG_DIR/src/eepy_page_i18n/locales"' EXIT

cd "$PY_PKG_DIR"

if [ -n "$BUMP" ]; then
    echo "Bumping version ($BUMP)..."
    "$PY_BIN" -c "
import re, sys

bump = '$BUMP'
path = 'pyproject.toml'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'version\s*=\s*\"(\d+)\.(\d+)\.(\d+)\"', content)
if not m:
    sys.exit('Could not parse version from pyproject.toml')

major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
if bump == 'major':
    major, minor, patch = major + 1, 0, 0
elif bump == 'minor':
    minor, patch = minor + 1, 0
elif bump == 'patch':
    patch += 1
else:
    sys.exit(f'Unknown bump type: {bump}')

new_ver = f'{major}.{minor}.{patch}'
new_content = re.sub(r'version\s*=\s*\"[^\"]+\"', f'version = \"{new_ver}\"', content, count=1)
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f'Bumped version to {new_ver}')
"
fi

CURRENT_VERSION=$("$PY_BIN" -c "
import re
with open('pyproject.toml', 'r', encoding='utf-8') as f:
    print(re.search(r'version\s*=\s*\"([^\"]+)\"', f.read()).group(1))
")
echo "Target version: $CURRENT_VERSION"

echo "Cleaning previous build artifacts..."
rm -rf dist/ build/ *.egg-info

echo "Building wheel and source distribution..."
"$PY_BIN" -m build

echo "Verifying distributions with twine..."
"$PY_BIN" -m twine check dist/*

echo "Publishing version $CURRENT_VERSION to $REPOSITORY..."
"$PY_BIN" -m twine upload --repository "$REPOSITORY" dist/*
echo "Successfully published eepy-page-i18n==$CURRENT_VERSION to $REPOSITORY!"
