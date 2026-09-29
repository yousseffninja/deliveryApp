#!/usr/bin/env bash
# Publishes the stacked feature branches as sequential PRs and merges them
# into main in order. Requires: gh CLI authenticated (gh auth login).
#
#   ./scripts/publish-and-merge-prs.sh <owner>/<repo>
#
# The branches are stacked (each contains the previous one), so merging in
# order keeps every PR diff clean against main.
set -euo pipefail

REPO="${1:-}"
if [[ -z "$REPO" ]]; then
  echo "usage: $0 <owner>/<repo>"
  exit 1
fi

BRANCHES=(
  feat/1-project-scaffold
  feat/2-mock-api-layer
  feat/3-local-persistence
  feat/4-sync-engine-state
  feat/5-delivery-screens
  feat/6-delivery-actions
  feat/7-sync-queue-simulator
  test/8-core-behaviors
  docs/9-architecture-readme
)

git remote add origin "https://github.com/${REPO}.git" 2>/dev/null || true

git push -u origin main

for BRANCH in "${BRANCHES[@]}"; do
  echo "==> ${BRANCH}"
  git push -u origin "$BRANCH"
  gh pr create --base main --head "$BRANCH" --fill
  gh pr merge "$BRANCH" --merge --delete-branch
  git fetch origin
done

git checkout main && git pull origin main
echo "Done: ${#BRANCHES[@]} PRs created and merged."
