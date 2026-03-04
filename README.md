# Bank Audit Analyst UI

Office of the Comptroller – analyst UI for managing bank audits as cases, with automated AI analysis via Databricks model serving, risk and AI confidence scores, and review workflows (mark as reviewed / manual review required).

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **Prisma** with PostgreSQL (Databricks Lakebase)
- **Databricks** model serving for audit analysis; Lakebase CLI for branching
- **GitHub Actions** for preview (feature branches) and production (tags on main) deployment

## Local development

1. **Prerequisites**: Node 20+, npm. For DB: PostgreSQL (or Lakebase branch endpoint).

2. **Install and configure**:
   ```bash
   npm ci
   cp .env.example .env
   ```
   Edit `.env` (see `.env.example`):
   - **Lakebase DB** (Prisma only): `LAKEBASE_DATABASE_URL` or `DATABASE_URL` – PostgreSQL connection to Lakebase branch endpoint.
   - **Databricks workspace** (CLI, bundle, model serving): `DATABRICKS_HOST`, `DATABRICKS_TOKEN`.
   - **Model serving**: `MODEL_SERVING_ENDPOINT_NAME` for “Run analysis”.

3. **Database**: Apply migrations when connected to a real DB:
   ```bash
   npx prisma migrate deploy
   ```

4. **Run**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Lakebase feature branches

For each Git feature branch, create a Lakebase branch so you can test migrations and run the app in isolation:

```bash
./scripts/lakebase-feature-branch.sh <project_id> <prod_branch_id> <feature_branch_id>
```

Example: `./scripts/lakebase-feature-branch.sh bank-audit-db br-main pr-42`

Then get `LAKEBASE_DATABASE_URL` for that branch (e.g. `databricks postgres generate-database-credential projects/.../branches/.../endpoints/primary`) and run Prisma migrations against it.

See [Databricks CLI for Lakebase](https://docs.databricks.com/aws/en/oltp/projects/cli).

## Deployment

Deployment uses **Databricks Asset Bundles** (`databricks.yml`). The bundle defines the app (command, env, and **secret resource** for `DATABASE_URL`), so there is no separate `app.yaml`. GitHub Actions creates the secret scope, writes the DB URL to the environment-specific secret key, then runs `databricks bundle deploy`.

### Bundle and environments

| Environment | App name | Secret key (scope `bank-audit-app`) |
|-------------|----------|-------------------------------------|
| Production  | `bank-audit-analyst` | `database-url-prod` |
| Preview (branch/PR) | `bank-audit-analyst-<env>` e.g. `bank-audit-analyst-pr-5` | `database-url-<env>` e.g. `database-url-pr-5` |

The bundle’s app resource references the secret via `resources[].secret` (scope `bank-audit-app`, key from variable). No manual app setup in the UI is required; the first deploy creates the app and the secret reference.

### GitHub secrets and variables

| Purpose | Secrets / variables |
|--------|---------------------|
| **Workspace** (CLI, bundle deploy) | `DATABRICKS_HOST`, `DATABRICKS_TOKEN` |
| **Lakebase DB** (migrations + app runtime) | `LAKEBASE_DATABASE_URL` or `DATABASE_URL` |
| **Bundle** | **Variable** `DATABRICKS_WORKSPACE_USER` — workspace user segment for bundle `root_path` (e.g. `12345@databricks` or your workspace user). The token must have write access to that path. |

- **Production** (tag `v*`): Writes DB URL to `bank-audit-app` / `database-url-prod`, then `databricks bundle deploy -t prod`.
- **Preview** (non-`main`): Env is `pr-<number>` or sanitized branch name. Writes DB URL to `bank-audit-app` / `database-url-<env>`, then `databricks bundle deploy -t preview` with `app_name` and `secret_key` passed via `-v`.

**Branch protection**: Enforce that only approved PRs can merge into `main` (GitHub repo Settings → Branches → Branch protection rule for `main`).

### Opening PRs and monitoring CI

From a feature branch you can open a PR and watch the **Deploy Preview** workflow (build, validate, deploy) using the GitHub CLI:

1. **Authenticate once** (required for `gh` to create PRs and read workflow runs):
   ```bash
   gh auth login
   ```

2. **Open a PR and watch the run** (creates the PR if none exists, then streams the workflow until it finishes; on failure, prints failed step logs):
   ```bash
   ./scripts/open-pr-and-watch-ci.sh
   ```

   To only create the PR and not watch: `./scripts/open-pr-and-watch-ci.sh --no-watch`.

3. **Inspect failures**: If the run fails, the script prints the failed logs. Fix the issue, push to the same branch; the workflow re-runs on push. You can also run `gh run list --workflow=deploy-preview.yml` and `gh run view <run-id> --log-failed` manually.

## Troubleshooting

### P1010: User was denied access on the database `(not available)`

This usually means the connection to Lakebase failed before the database name was known. Common causes:

1. **Missing SSL** – Lakebase requires TLS. Your URL must include `?sslmode=require`. The app and Prisma config auto-add it when the host is `*.databricks.com` and `sslmode` is missing; if you use a different host format, add `?sslmode=require` yourself.

2. **Wrong database name** – Lakebase’s default database is `databricks_postgres`. Use:
   `postgresql://role:password@ep-xxx.databricks.com/databricks_postgres?sslmode=require`

3. **Invalid or expired credentials** – OAuth tokens from `databricks postgres generate-database-credential` expire (e.g. after 1 hour). For CI or long-running apps, use a [native Postgres password](https://docs.databricks.com/aws/en/oltp/projects/authentication) for the Lakebase role.

4. **Network/firewall** – From GitHub Actions or your network, ensure TCP 5432 to the Lakebase endpoint is allowed and that [Databricks control plane IPs](https://docs.databricks.com/aws/en/resources/ip-domain-region) are allowlisted if required.

See [Lakebase connection strings](https://docs.databricks.com/aws/en/oltp/projects/connection-strings) for the exact URL format.

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `./scripts/open-pr-and-watch-ci.sh` | Open PR from current branch to `main` and watch Deploy Preview CI (requires `gh auth login`) |
| `npm run dev`  | Start Next.js dev server       |
| `npm run build`| Production build               |
| `npm run start`| Start production server        |
| `npm run lint` | Run ESLint                     |
| `npm run db:seed` | Seed DB with sample audit cases |
| `npx prisma migrate dev` | Create/apply migrations (dev) |
| `npx prisma migrate deploy` | Apply migrations (CI/prod)     |

### Seed data

Run `npm run db:seed` (or `npx prisma db seed`) after migrations to load sample banks at different audit stages:

- **pending_analysis**: 3 banks (First Regional, Metro Credit Union, Valley Savings & Loan) — no AI analysis yet
- **pending_review**: 3 banks (Northern Trust, Pacific Commerce, Central Federal) — have risk/AI confidence, not reviewed
- **reviewed**: 2 banks (Heritage National, Summit Community) — marked reviewed with notes
- **manual_review**: 2 banks (Riverside Commercial, Gateway Financial) — escalated for manual audit

Seed data uses `reference` values starting with `SEED-`. Re-running the seed removes existing seed cases and recreates them (idempotent).
