#!/usr/bin/env bash
# Open a PR from the current branch to main and watch the Deploy Preview CI run.
# On failure, print the failed job logs so you can fix errors.
#
# Prerequisites:
#   gh auth login   # run once to authenticate
#
# Usage:
#   ./scripts/open-pr-and-watch-ci.sh [--no-watch]
#   --no-watch   Only open the PR; do not watch the workflow run.

set -euo pipefail

NO_WATCH=false
for arg in "$@"; do
  case "$arg" in
    --no-watch) NO_WATCH=true ;;
  esac
done

if ! gh auth status &>/dev/null; then
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "You are on main. Switch to a feature branch first, then run this script."
  exit 1
fi

# Create PR if one doesn't exist
PR_JSON=$(gh pr list --head "$BRANCH" --base main --json number,url,state 2>/dev/null || true)
if [ -z "$PR_JSON" ] || [ "$PR_JSON" = "[]" ]; then
  echo "Creating PR from $BRANCH -> main..."
  gh pr create --base main --head "$BRANCH" --fill
  PR_JSON=$(gh pr list --head "$BRANCH" --base main --json number,url,state)
fi

PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number')
PR_URL=$(echo "$PR_JSON" | jq -r '.[0].url')
echo "PR: $PR_URL (#$PR_NUMBER)"

if [ "$NO_WATCH" = true ]; then
  echo "Skipping workflow watch (--no-watch). Check status at: $PR_URL"
  exit 0
fi

echo ""
echo "Waiting for 'Deploy Preview' workflow to start..."
for _ in $(seq 1 30); do
  RUN_JSON=$(gh run list --workflow="deploy-preview.yml" --branch "$BRANCH" --limit 1 --json databaseId,status,conclusion 2>/dev/null || true)
  if [ -n "$RUN_JSON" ] && [ "$RUN_JSON" != "[]" ]; then
    RUN_ID=$(echo "$RUN_JSON" | jq -r '.[0].databaseId')
    echo "Found run ID: $RUN_ID"
    break
  fi
  sleep 2
done

if [ -z "${RUN_ID:-}" ] || [ "$RUN_ID" = "null" ]; then
  echo "No workflow run found for $BRANCH. Check Actions: $PR_URL"
  exit 0
fi

echo "Watching run $RUN_ID (Ctrl+C to stop watching; run will continue on GitHub)..."
gh run watch "$RUN_ID" || true

# After watch ends, show conclusion and failed logs if any
STATUS_JSON=$(gh run view "$RUN_ID" --json conclusion,status)
CONCLUSION=$(echo "$STATUS_JSON" | jq -r '.conclusion')
if [ "$CONCLUSION" = "failure" ]; then
  echo ""
  echo "=== Deploy Preview FAILED. Fetching failed step logs... ==="
  gh run view "$RUN_ID" --log-failed 2>/dev/null || gh run view "$RUN_ID"
  echo ""
  echo "Fix the errors above, push to $BRANCH, and re-run this script or check the PR."
  exit 1
fi

echo "Run finished: $CONCLUSION"
exit 0
