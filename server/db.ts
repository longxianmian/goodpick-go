import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// 只在 Replit 环境中使用 WebSocket
// 在阿里云 ECS 等非 Replit 环境中，使用 HTTP 连接（Neon 默认行为）
if (process.env.REPL_ID || process.env.REPLIT_ENVIRONMENT) {
  neonConfig.webSocketConstructor = ws;
  console.log('🔌 Neon: 使用 WebSocket 连接（Replit 环境）');
} else {
  console.log('🌐 Neon: 使用 HTTP 连接（非 Replit 环境）');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle({ client: pool, schema });
