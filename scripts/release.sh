#!/usr/bin/env bash
#
# Vextris — Release Script
#
# Bumps version, commits, tags, pushes, and creates a GitHub Release
# with auto-generated release notes from commit history.
#
# Usage:
#   ./scripts/release.sh              # patch bump (0.2.0 → 0.2.1)
#   ./scripts/release.sh minor         # minor bump (0.2.0 → 0.3.0)
#   ./scripts/release.sh major         # major bump (0.2.0 → 1.0.0)
#   ./scripts/release.sh --notes "Custom release notes here"
#
# Requires: git, gh CLI (authenticated), jq
#

set -euo pipefail

# ─── Setup ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

# Check dependencies
for cmd in git gh jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

# ─── Parse Args ──────────────────────────────────────────────

BUMP_TYPE="patch"
CUSTOM_NOTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    patch)  BUMP_TYPE="patch" ;;
    minor)  BUMP_TYPE="minor" ;;
    major)  BUMP_TYPE="major" ;;
    --notes)
      shift
      CUSTOM_NOTES="$1"
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./scripts/release.sh [patch|minor|major] [--notes \"custom notes\"]"
      exit 1
      ;;
  esac
  shift
done

# ─── Pre-flight Checks ───────────────────────────────────────

# Must be on master branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "master" ]]; then
  echo "ERROR: Must be on master branch (currently on $BRANCH)"
  exit 1
fi

# Working tree must be clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean. Commit or stash changes first."
  git status --short
  exit 1
fi

# Must be up to date with origin
git fetch origin master
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "ERROR: Local master is not in sync with origin. Push or pull first."
  exit 1
fi

# ─── Read Current Version ────────────────────────────────────

CURRENT_VERSION=$(jq -r '.version' package.json)
if [[ "$CURRENT_VERSION" == "null" || -z "$CURRENT_VERSION" ]]; then
  echo "ERROR: Could not read version from package.json"
  exit 1
fi

# ─── Calculate New Version ───────────────────────────────────

IFS='.' read -ra PARTS <<< "$CURRENT_VERSION"
MAJOR="${PARTS[0]}"
MINOR="${PARTS[1]}"
PATCH="${PARTS[2]}"

case "$BUMP_TYPE" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEW_VERSION}"

echo "─── Vextris Release ───"
echo "  Current: v${CURRENT_VERSION}"
echo "  New:     v${NEW_VERSION}"
echo "  Bump:    ${BUMP_TYPE}"
echo ""

# ─── Generate Release Notes ──────────────────────────────────

# Get the previous tag (if any)
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -n "$PREV_TAG" ]]; then
  COMMITS=$(git log --oneline --no-decorate "${PREV_TAG}..HEAD")
else
  COMMITS=$(git log --oneline --no-decorate HEAD)
fi

# Build release notes from commits
generate_notes() {
  local notes=""
  notes="## What's New\n\n"

  # Categorize commits by type
  local features fixes chores others
  features=$(echo "$COMMITS" | grep -iE '^\w+ feat:' || true)
  fixes=$(echo "$COMMITS" | grep -iE '^\w+ fix:' || true)
  chores=$(echo "$COMMITS" | grep -iE '^\w+ chore:|^\w+ docs:' || true)
  others=$(echo "$COMMITS" | grep -ivE '^\w+ (feat:|fix:|chore:|docs:)' || true)

  if [[ -n "$features" ]]; then
    notes="${notes}### ✨ Features\n"
    while IFS= read -r line; do
      local msg="${line#* }"
      msg="${msg#feat: }"
      notes="${notes}- ${msg}\n"
    done <<< "$features"
    notes="${notes}\n"
  fi

  if [[ -n "$fixes" ]]; then
    notes="${notes}### 🐛 Fixes\n"
    while IFS= read -r line; do
      local msg="${line#* }"
      msg="${msg#fix: }"
      notes="${notes}- ${msg}\n"
    done <<< "$fixes"
    notes="${notes}\n"
  fi

  if [[ -n "$chores" ]]; then
    notes="${notes}### 🔧 Maintenance\n"
    while IFS= read -r line; do
      local msg="${line#* }"
      notes="${notes}- ${msg}\n"
    done <<< "$chores"
    notes="${notes}\n"
  fi

  if [[ -n "$others" ]]; then
    notes="${notes}### Other Changes\n"
    while IFS= read -r line; do
      notes="${notes}- ${line#* }\n"
    done <<< "$others"
    notes="${notes}\n"
  fi

  notes="${notes}---\n\n**Full Changelog**: https://github.com/xbillwatsonx/vextris/compare/${PREV_TAG:+$PREV_TAG...}$TAG"
  echo -e "$notes"
}

if [[ -n "$CUSTOM_NOTES" ]]; then
  RELEASE_NOTES="$CUSTOM_NOTES"
else
  RELEASE_NOTES=$(generate_notes)
fi

echo "─── Release Notes ───"
echo "$RELEASE_NOTES"
echo ""

# ─── Confirm ─────────────────────────────────────────────────

read -p "Proceed with release v${NEW_VERSION}? (y/N) " -r
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ─── Execute ─────────────────────────────────────────────────

echo ""
echo "1/6 Bumping package.json version..."
jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json

echo "2/6 Committing version bump..."
git add package.json
git commit -m "chore: bump version to ${NEW_VERSION}"

echo "3/6 Creating tag ${TAG}..."
git tag -a "$TAG" -m "Vextris ${TAG}"

echo "4/6 Pushing to GitHub..."
git push
git push --tags

echo "5/6 Creating GitHub Release..."
gh release create "$TAG" \
  --title "Vextris ${TAG}" \
  --notes "$RELEASE_NOTES"

echo "6/6 Done!"
echo ""
echo "✅ Released Vextris ${TAG}"
echo "   https://github.com/xbillwatsonx/vextris/releases/tag/${TAG}"