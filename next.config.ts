import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  /** Prisma (custom output) + миграции не всегда попадают в trace — явно включаем. */
  outputFileTracingIncludes: {
    "/*": ["./prisma/**/*", "./src/generated/prisma/**/*"],
  },
  serverExternalPackages: ["better-sqlite3", "@prisma/client", "prisma", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
