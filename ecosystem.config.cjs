module.exports = {
  apps: [
    {
      name: "goodpick-go",
      script: "./dist/index.js",
      instances: 1,            // 先用 1 个进程，稳定后再考虑多进程
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,

        // 数据库（已经真实存在）
        DATABASE_URL: "postgresql://goodpick_user:Goodpick!2025@localhost:5432/goodpick_prod",

        // 下面这些先用“占位值”，等网站跑起来后你再换成自己的真实配置
        JWT_SECRET: "goodpick-prod-jwt-secret-change-later-123456",
        JWT_EXPIRES_IN: "7d",

        OSS_REGION: "ap-southeast-1",
        OSS_ACCESS_KEY_ID: "your-oss-access-key-id",
        OSS_ACCESS_KEY_SECRET: "your-oss-access-key-secret",
        OSS_BUCKET: "prodee-h5-assets",

        LINE_CHANNEL_ID: "1234567890",
        LINE_CHANNEL_SECRET: "line-channel-secret-change-me",
        LIFF_ID: "2008410104-YJ9V8QnR",

        AI_INTEGRATIONS_OPENAI_BASE_URL: "https://api.openai.com/v1",

        GOOGLE_MAPS_API_KEY: "AIzaSy-change-me",
        SESSION_SECRET: "goodpick-session-secret-change-me-123456"
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
