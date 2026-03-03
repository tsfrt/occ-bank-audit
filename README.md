# Bank Audit Analyst UI

Office of the Comptroller – analyst UI for managing bank audits as cases, with automated AI analysis via Databricks model serving, risk and AI confidence scores, and review workflows (mark as reviewed / dig deeper).

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

Credentials are split so **Lakebase DB** (Prisma) uses different secrets from **Databricks workspace** (CLI/bundle):

| Purpose | Secrets |
|--------|---------|
| **Workspace** (CLI, bundle deploy, model serving) | `DATABRICKS_HOST`, `DATABRICKS_TOKEN` |
| **Lakebase DB** (Prisma, migrations) | `LAKEBASE_DATABASE_URL` or `DATABASE_URL` |

- **Preview**: Pushing to a non-`main` branch (or opening a PR to `main`) runs the Deploy Preview workflow. Set secrets: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`; and `LAKEBASE_DATABASE_URL` (or `PREVIEW_DATABASE_URL` / `DATABASE_URL`). Optional: `LAKEBASE_PROJECT_ID`, `LAKEBASE_PROD_BRANCH_ID`.

- **Production**: Pushing a tag `v*` runs the Deploy Production workflow. Set secrets: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`; and `LAKEBASE_DATABASE_URL` (or `DATABASE_URL`).

**Branch protection**: Enforce that only approved PRs can merge into `main` (GitHub repo Settings → Branches → Branch protection rule for `main`).

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start Next.js dev server       |
| `npm run build`| Production build               |
| `npm run start`| Start production server        |
| `npm run lint` | Run ESLint                     |
| `npx prisma migrate dev` | Create/apply migrations (dev) |
| `npx prisma migrate deploy` | Apply migrations (CI/prod)     |
