import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getSqliteDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Prisma SQLite URLs look like: file:./dev.db or file:dev.db
  // Keep it as a `file:` URL string for better-sqlite3 adapter.
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Unsupported DATABASE_URL for SQLite adapter: ${databaseUrl}`);
  }

  return databaseUrl;
}

const adapter = new PrismaBetterSqlite3({ url: getSqliteDatabaseUrl() });

/** Меняй при добавлении полей к моделям, иначе в dev останется старый global PrismaClient без новых колонок. */
const PRISMA_CLIENT_SCHEMA_TAG = "playerProfileMark:isTop500:v1" as const;

function prismaClientHasCurrentSchema(client: PrismaClient): boolean {
  if (typeof (client as unknown as { playerProfileMark?: { findUnique: unknown } }).playerProfileMark?.findUnique !== "function") {
    return false;
  }
  return (client as unknown as Record<string, unknown>)[PRISMA_CLIENT_SCHEMA_TAG] === true;
}

function createPrismaClient(): PrismaClient {
  const c = new PrismaClient({ adapter });
  (c as unknown as Record<string, unknown>)[PRISMA_CLIENT_SCHEMA_TAG] = true;
  return c;
}

function getOrCreatePrisma(): PrismaClient {
  const cached = global.prisma;
  if (cached && prismaClientHasCurrentSchema(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {});
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }
  return client;
}

export const prisma = getOrCreatePrisma();
