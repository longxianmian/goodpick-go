// server/db.ts
// 统一使用 pg + drizzle-orm/node-postgres，彻底不用 Neon/WebSocket

import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// pg 是 CommonJS 模块，这里用默认导入再解构出 Pool
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. 请在环境变量中配置 DATABASE_URL');
}

// 阿里云 RDS 一般不需要 SSL，如果你那边必须走 SSL，可以在环境变量里写 DB_SSL=true
const useSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  // 如有需要可以开启：
  // max: 10,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 10000,
});

// 不带 schema，保持和之前代码结构兼容
export const db = drizzle(pool);

// 如果以后要写原生 SQL，也可以直接用这个 pool
export { pool };
