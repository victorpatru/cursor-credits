import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../../.env.local") });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                // Maximum number of connections
  connectionTimeoutMillis: 5000,   // 5 second timeout for new connections
  idleTimeoutMillis: 30000,        // 30 seconds before closing idle connections
  query_timeout: 10000,            // 10 second query timeout
});

export const db = drizzle(pool);


