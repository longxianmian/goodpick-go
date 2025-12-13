module.exports = {
  apps: [
    {
      name: "goodpick-go",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        APP_BASE_URL: "https://www.goodpickgo.com",
        JWT_EXPIRES_IN: "7d",
        OSS_REGION: "ap-southeast-1",
        OSS_BUCKET: "prodee-h5-assets",
        LIFF_ID: "2008410104-YJ9V8QnR",
        AI_INTEGRATIONS_OPENAI_BASE_URL: "https://api.openai.com/v1"
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
