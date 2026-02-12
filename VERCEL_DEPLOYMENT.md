# Vercel 部署指南

## 部署步骤

### 1. 在 Vercel 上创建项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入您的 GitHub 仓库
4. 选择 "Next.js" 框架预设

### 2. 配置环境变量

在 Vercel 项目设置中，进入 **Settings** → **Environment Variables**，添加以下环境变量：

#### 必需的环境变量

```bash
# Supabase 配置（客户端可访问）
NEXT_PUBLIC_SUPABASE_URL=https://tkintamowtnsdueiebez.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraW50YW1vd3Ruc2R1ZWllYmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTY1MjMsImV4cCI6MjA3NDY5MjUyM30.mRPVmk_7dJJ6WWYw1vmBeWDkGGr3wLbCDu35_VvYfPI

# Supabase Service Role Key（服务端密钥）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraW50YW1vd3Ruc2R1ZWllYmV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTExNjUyMywiZXhwIjoyMDc0NjkyNTIzfQ.FZ28yGjTyinYlcQvVJXEr_JOq1uHMHZFGodtXfkGZW8

# AI 服务 API Keys
ALIBABA_API_KEY=sk-3f121f09619945f1b5856923d64c3162
BAIDU_API_KEY=xysiQ2ZK670uimOCKNOLs3zf
BAIDU_SECRET_KEY=7AvUW0DrNvuPj6T38KXcvexDTS9QMHMi
GEMINI_API_KEY=AIzaSyCJQysOXsxMKK091_OgoBsHKRB-Y5tMWzE
```

### 3. 环境变量作用域

为每个环境变量选择适当的作用域：
- ✅ **Production** - 生产环境（必选）
- ✅ **Preview** - 预览部署（建议选择）
- ✅ **Development** - 本地开发（可选）

### 4. 部署设置

在 **Settings** → **General** 中确认：
- **Framework Preset**: Next.js
- **Node Version**: 18.x 或更高
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 5. 构建和输出设置

在 **Settings** → **Build & Development Settings** 中：
- Root Directory: `./` （留空或 `./`）
- Build Command: `npm run build`
- Output Directory: 保持默认
- Install Command: `npm install`

### 6. Supabase 数据库迁移

确保已在 Supabase 中执行数据库迁移：

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入您的项目
3. 进入 **SQL Editor**
4. 运行 `supabase/migrations/00001_initial_schema.sql` 中的 SQL

### 7. Supabase 认证设置

在 Supabase Dashboard 中配置：

1. 进入 **Authentication** → **Providers**
2. 启用 **Anonymous** 登录
3. 进入 **Authentication** → **Settings**
4. **禁用** "Email Confirmations"（用于快速测试）
5. 添加您的 Vercel 部署域名到 **Site URL** 和 **Redirect URLs**:
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/**
   ```

### 8. 部署

1. 保存所有环境变量
2. 点击 **Deploy** 或推送代码到 GitHub
3. Vercel 会自动触发部署

## 常见错误解决

### 错误：Cannot find Supabase configuration

**原因**: 环境变量未正确配置

**解决方案**:
1. 检查环境变量名称是否正确（注意 `NEXT_PUBLIC_` 前缀）
2. 确保环境变量已应用到 Production 环境
3. 重新部署项目

### 错误：API route timeout

**原因**: AI API 响应时间过长

**解决方案**:
1. 在 `vercel.json` 中增加函数超时时间（Pro 计划）
2. 或优化 AI API 调用逻辑

### 错误：Database connection failed

**原因**: Supabase 配置错误或数据库表未创建

**解决方案**:
1. 检查 Supabase URL 和密钥是否正确
2. 确保已执行数据库迁移
3. 检查 RLS 策略是否正确配置

## 验证部署

部署成功后，访问您的域名并测试：

1. ✅ 用户注册/登录
2. ✅ 匿名登录
3. ✅ 上传图片识别
4. ✅ 错题管理（增删改查）
5. ✅ 意见反馈提交

## 性能优化建议

1. **启用 Vercel Analytics**: 监控性能和用户体验
2. **配置 CDN**: Vercel 自动配置全球 CDN
3. **优化图片**: 使用 Next.js Image 组件
4. **启用增量静态生成**: 对静态页面使用 ISR

## 安全检查清单

- ✅ Service Role Key 仅在服务端使用
- ✅ 生产环境使用独立的 Supabase 项目
- ✅ 定期轮换 API 密钥
- ✅ 启用 Supabase RLS 策略
- ✅ 限制 CORS 来源

## 监控和日志

在 Vercel 项目中：
- **Deployments**: 查看部署历史
- **Analytics**: 查看性能数据
- **Logs**: 查看运行时日志
- **Speed Insights**: 查看页面加载速度

## 域名配置

1. 在 **Settings** → **Domains** 中添加自定义域名
2. 按照 Vercel 的 DNS 配置说明操作
3. 等待 DNS 传播（通常 24-48 小时）
4. 更新 Supabase 的 Redirect URLs

## 回滚

如需回滚到之前的版本：
1. 进入 **Deployments**
2. 找到之前的成功部署
3. 点击 "..." → **Promote to Production**

## 技术支持

如遇到问题：
1. 查看 Vercel 部署日志
2. 检查浏览器控制台错误
3. 查看 Supabase 日志
4. 联系技术支持

---

**部署时间**: 首次部署约 2-5 分钟
**构建时间**: 约 1-3 分钟
**冷启动时间**: < 1 秒
