#!/usr/bin/env bash
# One-click "ship dev to main" — fast-forward only, with safety checks.
# Triggers Mintlify rebuild of mda.sno.dev.
#
# Run: pnpm deploy   (or: bash scripts/deploy-docs.sh)

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }

fail() { red "✗ $*"; exit 1; }
ok()   { green "✓ $*"; }
info() { yellow "→ $*"; }

# 1. Must be on dev
branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "dev" ] || fail "Not on dev (currently on '$branch'). Switch to dev first."
ok "On dev branch"

# 2. No staged changes (unstaged is OK — they don't affect the merge)
if ! git diff --cached --quiet; then
  fail "You have STAGED but uncommitted changes. Commit or unstage them first."
fi
ok "No staged changes"

# 3. Sync state with remote
info "Fetching origin..."
git fetch origin --quiet

# 4. Local dev must match origin/dev (i.e., everything pushed)
local_dev=$(git rev-parse dev)
remote_dev=$(git rev-parse origin/dev)
if [ "$local_dev" != "$remote_dev" ]; then
  fail "Local dev ($local_dev) differs from origin/dev ($remote_dev). Push dev first (VSCode → Sync)."
fi
ok "dev is in sync with origin/dev"

# 5. main must be a strict ancestor of dev (so ff is possible)
if ! git merge-base --is-ancestor origin/main dev; then
  fail "origin/main has commits not in dev. Someone pushed to main directly. Stop and ask for help."
fi

# 6. Anything to deploy?
ahead=$(git rev-list --count origin/main..dev)
if [ "$ahead" -eq 0 ]; then
  green "Nothing to deploy — main is already at dev."
  exit 0
fi
ok "$ahead commit(s) ahead of main, ready to ship"

# 7. Do it
info "Switching to main..."
git checkout --quiet main
info "Pulling main (ff only)..."
git pull --ff-only --quiet origin main
info "Fast-forwarding main to dev..."
git merge --ff-only --quiet dev
info "Pushing main to origin..."
git push --quiet origin main

# 8. Always return to dev
info "Switching back to dev..."
git checkout --quiet dev

green ""
green "✅ Deployed. Mintlify will rebuild mda.sno.dev in a few minutes."
green "   You're back on dev. Carry on."
