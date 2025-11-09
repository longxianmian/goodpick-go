// 标准 Node.js Postgres 连接配置（适用于阿里云 ECS、本地开发等）
// 不再使用 Neon serverless / WebSocket 方式

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// 兼容两种场景：
// - 本地 / ECS 自建 PostgreSQL：不启用 SSL
// - 将来如果用外部托管（比如 Neon），可以通过 DB_SSL=true 打开 SSL
const useSSL = process.env.DB_SSL === 'true';

const pool = new Pool({
  connectionString,
  ssl: useSSL
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

// drizzle ORM 实例，全项目共用
export const db = drizzle(pool);
