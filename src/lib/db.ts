import { Pool } from "pg";

declare global {
  var __appHeadsPgPool: Pool | undefined;
}

function readFirstDefinedEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];

    if (value && !value.includes("${")) {
      return value;
    }
  }

  return undefined;
}

function createDatabaseUrl() {
  const databaseUrl = readFirstDefinedEnv(
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRESQL_URL",
  );

  if (databaseUrl) {
    return databaseUrl;
  }

  const DB_HOST = readFirstDefinedEnv("DB_HOST", "POSTGRES_HOST", "PGHOST");
  const DB_PORT = readFirstDefinedEnv("DB_PORT", "POSTGRES_PORT", "PGPORT");
  const DB_NAME = readFirstDefinedEnv("DB_NAME", "POSTGRES_DB", "PGDATABASE");
  const DB_USER = readFirstDefinedEnv("DB_USER", "POSTGRES_USER", "PGUSER");
  const DB_PASSWORD = readFirstDefinedEnv(
    "DB_PASSWORD",
    "POSTGRES_PASSWORD",
    "PGPASSWORD",
  );

  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error(
      "Missing PostgreSQL environment variables. Configure DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD.",
    );
  }

  return `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(
    DB_PASSWORD,
  )}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

export function getDbPool() {
  if (!global.__appHeadsPgPool) {
    global.__appHeadsPgPool = new Pool({
      connectionString: createDatabaseUrl(),
      ssl:
        process.env.DB_SSL === "false"
          ? false
          : {
              rejectUnauthorized: false,
            },
    });
  }

  return global.__appHeadsPgPool;
}
