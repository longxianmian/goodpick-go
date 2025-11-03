# ProDee 模块代码包

## 包含内容

### 1. 门店管理模块
- **前端**: `frontend/AdminStores.vue`
- **后端**: `backend/admin.js` (门店相关路由)

### 2. 活动管理模块
- **前端**: `frontend/AdminCampaigns.vue`
- **后端**: `backend/admin.js` (活动相关路由)
- **组件**: `components/MediaUploader.vue` (媒体上传组件，支持图片/视频)

### 3. 卡券详情页
- **前端**: 
  - `frontend/CouponDetail.vue` (公开详情页)
  - `frontend/UserCouponDetail.vue` (用户已领取详情页)

### 4. 多语言支持
- **i18n**: 
  - `i18n/zh-cn.js` (中文简体)
  - `i18n/en-us.js` (英文)
  - `i18n/th-th.js` (泰文)

## 最新更新 (2025-11-03)

### 活动管理模块
- ✅ 完整多语言支持（中英泰三语）
- ✅ 城市筛选门店选择功能
- ✅ MediaUploader 组件多语言化
- ✅ 门店选择器UI重构（city-based filtering）

### MediaUploader 组件
- ✅ 支持图片/视频上传（互斥模式）
- ✅ 拖拽排序功能
- ✅ 完整多语言提示信息

## 技术栈
- Vue 3 (Composition API)
- Element Plus (后台UI)
- Vue I18n (国际化)
- Drizzle ORM (数据库)
- Express.js (后端API)

## 使用说明
1. 前端页面需要配合 Vue Router 使用
2. 后端路由需要配合完整的 Express 应用和中间件
3. 多语言文件需要在 Vue I18n 中注册
4. MediaUploader 组件依赖 Sortable.js

