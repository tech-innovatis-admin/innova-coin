import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __appHeadsPgPool: Pool | undefined;
}

function createDatabaseUrl() {
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("${")
  ) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("Missing PostgreSQL environment variables.");
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
