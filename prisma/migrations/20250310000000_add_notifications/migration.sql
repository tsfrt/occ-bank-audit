-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('case_assigned', 'case_status_changed');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "previous_status" TEXT,
    "new_status" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_idx" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_idx" ON "notifications"("recipient_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "audit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
