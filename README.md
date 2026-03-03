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
   Edit `.env`:
   - `DATABASE_URL`: PostgreSQL connection string (e.g. Lakebase branch endpoint or local Postgres).
   - For “Run analysis”: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `MODEL_SERVING_ENDPOINT_NAME`.

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

Then get `DATABASE_URL` for that branch (e.g. `databricks postgres generate-database-credential projects/.../branches/.../endpoints/primary`) and run Prisma migrations against it.

See [Databricks CLI for Lakebase](https://docs.databricks.com/aws/en/oltp/projects/cli).

## Deployment

- **Preview**: Pushing to a non-`main` branch (or opening a PR to `main`) runs the Deploy Preview workflow. It creates/reuses a Lakebase branch, runs migrations, builds the app, and deploys the bundle with target `preview`. Configure secrets: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABASE_URL` (or `PREVIEW_DATABASE_URL`); and `LAKEBASE_PROJECT_ID`, `LAKEBASE_PROD_BRANCH_ID` (vars or secrets).

- **Production**: Pushing a tag `v*` (e.g. `v1.0.0`) runs the Deploy Production workflow. It runs Prisma migrations against production and deploys the bundle with target `prod`. Configure secrets: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABASE_URL`.

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
