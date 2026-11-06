#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TS_PKG_DIR="$REPO_ROOT/packages/typescript"

BUMP="patch"
OTP=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bump|-b)
            BUMP="$2"
            shift 2
            ;;
        --no-bump)
            BUMP=""
            shift
            ;;
        --otp)
            OTP="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: $0 [--bump patch|minor|major] [--no-bump] [--otp <code>]" >&2
            exit 1
            ;;
    esac
done

echo "Building and publishing @powerpcfan/eepy-page-i18n (npm)"

echo "Running catalog validation and conformance tests..."
cd "$REPO_ROOT"
npm run check

echo "Checking npm authentication..."
if ! npm whoami >/dev/null 2>&1; then
    echo "You are not logged into npm. Please run 'npm login' first." >&2
    exit 1
fi
CURRENT_USER=$(npm whoami)
echo "Authenticated as npm user: $CURRENT_USER"

cd "$TS_PKG_DIR"

if [ -n "$BUMP" ]; then
    echo "Bumping version ($BUMP)..."
    npm version "$BUMP" --no-git-tag-version
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Target version: $CURRENT_VERSION"

echo "Cleaning old build artifacts..."
rm -rf dist/ *.tgz

echo "Building TypeScript package..."
npm run build

echo "Publishing version $CURRENT_VERSION to npm..."
PUBLISH_CMD=("npm" "publish" "--access" "public")
if [ -n "$OTP" ]; then
    PUBLISH_CMD+=("--otp" "$OTP")
fi
"${PUBLISH_CMD[@]}"
echo "Successfully published @powerpcfan/eepy-page-i18n@$CURRENT_VERSION to npm!"
