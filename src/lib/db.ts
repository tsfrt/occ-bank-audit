import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

// Lakebase DB credentials are separate from Databricks workspace credentials.
// The pg adapter requires a postgresql:// URL (not prisma+postgres://).
// Lakebase requires SSL: https://docs.databricks.com/aws/en/oltp/projects/connection-strings
function getDatabaseUrl(): string {
  const url =
    process.env.LAKEBASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  const s = url.trim();
  if (!s) {
    throw new Error(
      "LAKEBASE_DATABASE_URL or DATABASE_URL must be set for the database connection"
    );
  }
  if (!s.startsWith("postgresql://") && !s.startsWith("postgres://")) {
    throw new Error(
      `Database URL must use scheme postgresql:// or postgres:// (got: ${s.slice(0, 20)}...). ` +
        "For Lakebase use a PostgreSQL connection string; do not use prisma+postgres:// here."
    );
  }
  // Lakebase requires sslmode=require; without it you get P1010 "denied access" / "(not available)"
  if (/@[^/]*\.databricks\.com/i.test(s) && !/sslmode=/i.test(s)) {
    const separator = s.includes("?") ? "&" : "?";
    return `${s}${separator}sslmode=require`;
  }
  return s;
}

const connectionString = getDatabaseUrl();

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
