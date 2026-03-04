#!/usr/bin/env bash
# Create a Lakebase branch and read-write endpoint for a feature branch / PR.
# Usage: ./scripts/lakebase-feature-branch.sh <project_id> <prod_branch_id> <feature_branch_id>
# Example: ./scripts/lakebase-feature-branch.sh bank-audit-db br-main pr-42
# Requires: databricks auth login (or DATABRICKS_HOST + token); Prisma expects DATABASE_URL.
# Output: Prints connection info; set DATABASE_URL from endpoint host or run generate-database-credential.

set -euo pipefail

PROJECT_ID="${1:?Usage: $0 <project_id> <prod_branch_id> <feature_branch_id>}"
PROD_BRANCH_ID="${2:?}"
FEATURE_BRANCH_ID="${3:?}"

PROJECT_RESOURCE="projects/${PROJECT_ID}"
SOURCE_BRANCH="${PROJECT_RESOURCE}/branches/${PROD_BRANCH_ID}"
BRANCH_RESOURCE="${PROJECT_RESOURCE}/branches/${FEATURE_BRANCH_ID}"
ENDPOINT_ID="primary"

echo "Creating Lakebase branch ${FEATURE_BRANCH_ID} from ${PROD_BRANCH_ID}..."

# Create branch from production (copy-on-write)
if ! databricks postgres get-branch "${BRANCH_RESOURCE}" 2>/dev/null; then
  databricks postgres create-branch "${PROJECT_ID}" "${FEATURE_BRANCH_ID}" \
    --json "{\"spec\":{\"source_branch\":\"${SOURCE_BRANCH}\",\"no_expiry\":true}}"
  echo "Branch ${FEATURE_BRANCH_ID} created."
else
  echo "Branch ${FEATURE_BRANCH_ID} already exists."
fi

# Create read-write endpoint on the feature branch (required for app to connect)
ENDPOINT_RESOURCE="${BRANCH_RESOURCE}/endpoints/${ENDPOINT_ID}"
if ! databricks postgres get-endpoint "${ENDPOINT_RESOURCE}" 2>/dev/null; then
  databricks postgres create-endpoint "${PROJECT_ID}" "${FEATURE_BRANCH_ID}" "${ENDPOINT_ID}" \
    --json '{"spec":{"endpoint_type":"ENDPOINT_TYPE_READ_WRITE","autoscaling_limit_min_cu":0.5,"autoscaling_limit_max_cu":2.0}}'
  echo "Endpoint ${ENDPOINT_ID} created on branch ${FEATURE_BRANCH_ID}."
else
  echo "Endpoint ${ENDPOINT_ID} already exists on branch ${FEATURE_BRANCH_ID}."
fi

echo ""
echo "Lakebase branch ready: ${BRANCH_RESOURCE}"
echo "Endpoint: ${ENDPOINT_RESOURCE}"
echo "To get DATABASE_URL, run:"
echo "  databricks postgres generate-database-credential ${ENDPOINT_RESOURCE}"
echo "Then run Prisma migrations against this DB: DATABASE_URL=<url> npx prisma migrate deploy"
