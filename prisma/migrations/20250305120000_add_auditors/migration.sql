-- CreateTable
CREATE TABLE "auditors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auditors_email_key" ON "auditors"("email");

-- Insert example auditors (fixed IDs for backfill)
INSERT INTO "auditors" ("id", "name", "email", "created_at", "updated_at") VALUES
  ('cseed0000000000001', 'Jane Smith', 'jane.smith@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseed0000000000002', 'John Doe', 'john.doe@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseed0000000000003', 'Maria Garcia', 'maria.garcia@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add auditor_id nullable first for backfill
ALTER TABLE "audit_cases" ADD COLUMN "auditor_id" TEXT;

-- Backfill: assign auditors to existing cases (round-robin)
WITH auditor_arr AS (
  SELECT ARRAY['cseed0000000000001', 'cseed0000000000002', 'cseed0000000000003'] AS ids
),
numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "id") AS rn
  FROM "audit_cases"
  WHERE "auditor_id" IS NULL
),
assignments AS (
  SELECT n."id", a.ids[1 + ((n.rn - 1) % 3)] AS auditor_id
  FROM numbered n
  CROSS JOIN auditor_arr a
)
UPDATE "audit_cases" ac
SET "auditor_id" = assignments.auditor_id
FROM assignments
WHERE ac."id" = assignments."id";

-- Make auditor_id required
ALTER TABLE "audit_cases" ALTER COLUMN "auditor_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "audit_cases_auditor_id_idx" ON "audit_cases"("auditor_id");

-- AddForeignKey
ALTER TABLE "audit_cases" ADD CONSTRAINT "audit_cases_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "auditors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
