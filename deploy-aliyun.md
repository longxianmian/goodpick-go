# GoodPick Go 阿里云部署文档

> **部署目标**：在阿里云新加坡ECS服务器上部署GoodPick Go优惠券平台，包含前端、后端、数据库和对象存储。

---

## 1. 服务器准备

### 1.1 阿里云ECS配置建议
- **地区**：新加坡（ap-southeast-1）
- **实例类型**：ecs.c6.large（2核4G）或更高
- **操作系统**：Ubuntu 22.04 LTS
- **带宽**：5Mbps或更高
- **安全组**：开放端口80, 443, 22

### 1.2 安装Node.js环境
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 20（使用NodeSource仓库）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 10.x.x

# 安装构建工具
sudo apt install -y build-essential
```

### 1.3 安装PM2进程管理器
```bash
sudo npm install -g pm2

# 配置PM2开机自启
pm2 startup systemd
# 按提示执行返回的命令
```

### 1.4 安装PostgreSQL数据库（如果不使用RDS）
```bash
# 安装PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

**PostgreSQL配置**：
```sql
-- 创建数据库
CREATE DATABASE goodpick_prod;

-- 创建用户
CREATE USER goodpick_user WITH PASSWORD 'your-strong-password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE goodpick_prod TO goodpick_user;

-- 退出
\q
```

### 1.5 安装Nginx（可选，用于反向代理）
```bash
sudo apt install -y nginx

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 2. 代码部署

### 2.1 从GitHub拉取代码
```bash
# 创建项目目录
sudo mkdir -p /var/www/goodpick-go
sudo chown -R $USER:$USER /var/www/goodpick-go
cd /var/www/goodpick-go

# 克隆代码（替换为实际的GitHub仓库地址）
git clone https://github.com/your-org/goodpick-go.git .

# 或者使用SSH
git clone git@github.com:your-org/goodpick-go.git .
```

### 2.2 安装依赖
```bash
# 安装npm依赖
npm install

# 如果遇到权限问题
npm install --legacy-peer-deps
```

### 2.3 配置环境变量
```bash
# 创建生产环境配置文件
vim .env.production
```

**粘贴以下内容**（替换为实际值）：
```bash
# 数据库配置
DATABASE_URL=postgresql://goodpick_user:your-password@localhost:5432/goodpick_prod

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-production
JWT_EXPIRES_IN=7d

# 阿里云OSS配置
OSS_REGION=ap-southeast-1
OSS_ACCESS_KEY_ID=LTAI***************
OSS_ACCESS_KEY_SECRET=************************
OSS_BUCKET=prodee-h5-assets

# LINE Platform配置
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef
LIFF_ID=2008410104-YJ9V8QnR

# OpenAI配置
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-***************

# Google Maps配置
GOOGLE_MAPS_API_KEY=AIzaSy***************

# Session配置
SESSION_SECRET=your-session-secret-production

# Node环境
NODE_ENV=production
```

**保护环境变量文件**：
```bash
chmod 600 .env.production
```

---

## 3. 数据库迁移

### 3.1 运行数据库迁移
```bash
# 加载环境变量
export $(cat .env.production | xargs)

# 同步数据库Schema（Drizzle）
npm run db:push

# 如果遇到问题，强制推送
npm run db:push --force
```

### 3.2 创建初始管理员账号（可选）
```bash
# 运行种子脚本（如果有）
npm run seed

# 或手动创建
psql $DATABASE_URL -c "
INSERT INTO admins (email, password, name)
VALUES (
  'admin@goodpick.com',
  '\$2a\$10\$YOUR_BCRYPT_HASH',  -- 使用bcryptjs生成
  'System Admin'
);
"
```

**生成bcrypt密码哈希**：
```bash
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-admin-password', 10);
console.log(hash);
"
```

---

## 4. 构建项目

### 4.1 构建前端和后端
```bash
# 设置环境变量
export NODE_ENV=production

# 构建项目
npm run build

# 验证构建产物
ls -la dist/
# 应包含：index.js, public/assets/
```

**构建说明**：
- **前端**：Vite构建为静态文件（`dist/public`）
- **后端**：esbuild打包为单个 `dist/index.js` 文件

---

## 5. PM2进程管理

### 5.1 创建PM2配置文件
```bash
vim ecosystem.config.js
```

**粘贴以下内容**：
```javascript
module.exports = {
  apps: [{
    name: 'goodpick-go',
    script: './dist/index.js',
    instances: 2,  // 使用2个实例（Cluster模式）
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      // 从.env.production加载其他环境变量
      // 或直接在这里定义
      DATABASE_URL: 'postgresql://goodpick_user:password@localhost:5432/goodpick_prod',
      JWT_SECRET: 'your-jwt-secret',
      OSS_REGION: 'ap-southeast-1',
      OSS_ACCESS_KEY_ID: 'LTAI***',
      OSS_ACCESS_KEY_SECRET: '***',
      OSS_BUCKET: 'prodee-h5-assets',
      LINE_CHANNEL_ID: '1234567890',
      LINE_CHANNEL_SECRET: 'abcdef1234567890',
      LIFF_ID: '2008410104-YJ9V8QnR',
      AI_INTEGRATIONS_OPENAI_BASE_URL: 'https://api.openai.com/v1',
      AI_INTEGRATIONS_OPENAI_API_KEY: 'sk-proj-***',
      GOOGLE_MAPS_API_KEY: 'AIzaSy***',
      SESSION_SECRET: 'your-session-secret'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
}
```

### 5.2 启动PM2
```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs goodpick-go

# 保存PM2配置（开机自启）
pm2 save
```

### 5.3 PM2常用命令
```bash
# 重启应用
pm2 restart goodpick-go

# 停止应用
pm2 stop goodpick-go

# 删除应用
pm2 delete goodpick-go

# 查看详细信息
pm2 show goodpick-go

# 监控CPU/内存
pm2 monit

# 查看实时日志
pm2 logs --lines 100
```

---

## 6. Nginx反向代理（推荐）

### 6.1 创建Nginx配置
```bash
sudo vim /etc/nginx/sites-available/goodpick-go
```

**粘贴以下内容**（替换域名）：
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL证书配置（使用Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 日志
    access_log /var/log/nginx/goodpick-go-access.log;
    error_log /var/log/nginx/goodpick-go-error.log;

    # 上传文件大小限制（视频上传）
    client_max_body_size 100M;

    # 代理到Node.js应用
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置（视频上传）
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.2 启用配置并重启Nginx
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/goodpick-go /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 6.3 安装SSL证书（Let's Encrypt）
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

---

## 7. LINE Developers配置

### 7.1 配置LIFF应用
登录 [LINE Developers Console](https://developers.line.biz/)

**LIFF设置**：
1. 进入 **LINE Login** → **LIFF** → 选择LIFF应用
2. **Endpoint URL**：`https://your-domain.com/campaign/1`
3. **Scope**：`profile`, `openid`, `phone`（需要获取手机号）
4. **保存**

### 7.2 配置LINE Login
1. 进入 **LINE Login** → **Channel settings**
2. **Callback URL**：`https://your-domain.com/api/auth/line/callback`
3. **保存**

### 7.3 配置店员OA菜单（如果使用独立OA）
1. 进入 **Messaging API** → **Rich Menu**
2. 创建菜单，添加按钮：
   - **文字**：我的工作台
   - **Action**：`https://your-domain.com/staff/redeem`

---

## 8. 验证部署

### 8.1 服务健康检查
```bash
# 检查Node.js进程
pm2 status

# 检查端口监听
sudo netstat -tlnp | grep 5000

# 检查Nginx
sudo systemctl status nginx

# 检查数据库连接
psql $DATABASE_URL -c "SELECT version();"
```

### 8.2 访问测试
```bash
# 测试前端
curl https://your-domain.com/

# 测试API
curl https://your-domain.com/api/config

# 测试管理后台
curl https://your-domain.com/admin/login
```

### 8.3 功能测试清单
- [ ] 管理后台登录（`/admin/login`）
- [ ] 门店管理（创建/编辑/删除）
- [ ] 活动管理（创建/编辑/OpenAI翻译）
- [ ] 媒体上传（图片/视频到阿里云OSS）
- [ ] 用户H5页面（`/campaign/1`）
- [ ] LINE登录（LIFF）
- [ ] 领取优惠券
- [ ] 店员绑定（扫描二维码）
- [ ] 扫码核销（html5-qrcode）
- [ ] Dashboard统计

---

## 9. 日志和监控

### 9.1 查看应用日志
```bash
# PM2日志
pm2 logs goodpick-go --lines 100

# 错误日志
tail -f logs/err.log

# 输出日志
tail -f logs/out.log
```

### 9.2 查看Nginx日志
```bash
# 访问日志
sudo tail -f /var/log/nginx/goodpick-go-access.log

# 错误日志
sudo tail -f /var/log/nginx/goodpick-go-error.log
```

### 9.3 查看数据库日志
```bash
# PostgreSQL日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 9.4 监控工具（可选）
```bash
# 安装htop监控系统资源
sudo apt install -y htop

# 运行
htop

# 或使用PM2监控
pm2 monit
```

---

## 10. 更新部署

### 10.1 拉取最新代码
```bash
cd /var/www/goodpick-go

# 拉取代码
git pull origin main

# 安装新依赖（如果有）
npm install

# 重新构建
npm run build
```

### 10.2 数据库迁移（如果有变更）
```bash
# 备份数据库
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 运行迁移
npm run db:push
```

### 10.3 重启服务
```bash
# 重启PM2
pm2 restart goodpick-go

# 查看日志确认启动成功
pm2 logs goodpick-go --lines 50
```

---

## 11. 备份策略

### 11.1 数据库备份
```bash
# 手动备份
pg_dump $DATABASE_URL > /var/backups/goodpick-$(date +%Y%m%d).sql

# 自动备份（Cron）
crontab -e
```

**添加每日备份任务**：
```cron
# 每天凌晨2点备份数据库
0 2 * * * pg_dump postgresql://goodpick_user:password@localhost:5432/goodpick_prod > /var/backups/goodpick-$(date +\%Y\%m\%d).sql

# 删除7天前的备份
0 3 * * * find /var/backups -name "goodpick-*.sql" -mtime +7 -delete
```

### 11.2 代码备份
```bash
# 使用Git Tag标记发布版本
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0
```

---

## 12. 故障排查

### 12.1 服务无法启动
**症状**：`pm2 status` 显示服务状态为 `errored`

**排查步骤**：
```bash
# 查看错误日志
pm2 logs goodpick-go --err --lines 50

# 检查环境变量
pm2 show goodpick-go

# 手动启动测试
node dist/index.js
```

### 12.2 数据库连接失败
**症状**：日志显示 `DATABASE_URL must be set` 或连接超时

**排查步骤**：
```bash
# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1;"

# 检查PostgreSQL服务
sudo systemctl status postgresql

# 检查防火墙
sudo ufw status
```

### 12.3 LINE登录失败
**症状**：用户点击领券按钮后报错

**排查步骤**：
1. 检查 `/api/config` 接口返回的LIFF ID
2. 确认LINE Developers的回调URL正确
3. 检查浏览器控制台错误信息
4. 验证LINE Channel ID和Secret正确

### 12.4 媒体上传失败
**症状**：管理后台上传图片/视频报错

**排查步骤**：
```bash
# 检查OSS环境变量
pm2 show goodpick-go | grep OSS

# 测试OSS连接
node -e "
const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-ap-southeast-1',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
});
client.list().then(console.log).catch(console.error);
"
```

---

## 13. 性能优化建议

### 13.1 启用Gzip压缩
**Nginx配置**（已包含在上面的配置中）：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 13.2 数据库索引优化
```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_coupons_user_id ON coupons(user_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_campaign_stores_campaign_id ON campaign_stores(campaign_id);
CREATE INDEX idx_campaign_stores_store_id ON campaign_stores(store_id);
```

### 13.3 PM2 Cluster模式
已在 `ecosystem.config.js` 中配置，使用2个实例负载均衡。

---

## 14. 安全加固

### 14.1 防火墙配置
```bash
# 安装UFW
sudo apt install -y ufw

# 允许SSH
sudo ufw allow 22

# 允许HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 14.2 禁用root SSH登录
```bash
sudo vim /etc/ssh/sshd_config

# 修改以下配置
PermitRootLogin no
PasswordAuthentication no

# 重启SSH服务
sudo systemctl restart ssh
```

### 14.3 定期更新系统
```bash
# 自动安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 15. 快速命令参考

```bash
# 启动服务
pm2 start ecosystem.config.js --env production

# 重启服务
pm2 restart goodpick-go

# 查看日志
pm2 logs goodpick-go

# 查看状态
pm2 status

# 停止服务
pm2 stop goodpick-go

# 重启Nginx
sudo systemctl restart nginx

# 查看Nginx日志
sudo tail -f /var/log/nginx/goodpick-go-access.log

# 备份数据库
pg_dump $DATABASE_URL > backup.sql

# 拉取最新代码并重启
cd /var/www/goodpick-go && git pull && npm install && npm run build && pm2 restart goodpick-go
```

---

**部署文档版本**：v1.0  
**更新日期**：2025-11-08  
**维护人员**：开发团队
