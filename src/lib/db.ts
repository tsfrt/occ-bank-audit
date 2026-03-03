import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

// Lakebase DB credentials are separate from Databricks workspace credentials.
// Prefer LAKEBASE_DATABASE_URL for the PostgreSQL connection to Lakebase.
const connectionString =
  process.env.LAKEBASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "LAKEBASE_DATABASE_URL or DATABASE_URL must be set for the database connection"
  );
}

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
