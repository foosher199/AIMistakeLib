# Vercel 部署故障排查指南

## 快速诊断步骤

### 1. 检查构建日志

在 Vercel Dashboard → Deployments → 点击失败的部署 → 查看 Build Logs

**常见构建错误**:

#### 错误: "Cannot find module"
```
Error: Cannot find module '@/lib/supabase'
```

**解决方案**:
```bash
# 确保 tsconfig.json 中配置了路径别名
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 错误: "Type error"
```
Type error: ... is declared but its value is never read
```

**解决方案**:
```bash
# 本地运行构建检查
npm run build

# 修复所有类型错误后再部署
```

### 2. 检查环境变量

在 Vercel Dashboard → Settings → Environment Variables

**必需的环境变量清单**:

```bash
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ ALIBABA_API_KEY
✅ BAIDU_API_KEY
✅ BAIDU_SECRET_KEY
✅ GEMINI_API_KEY
```

**检查要点**:
- ✅ 变量名称拼写正确
- ✅ 没有多余的空格
- ✅ 已选择 Production 环境
- ✅ 值已正确复制（无换行）

### 3. 检查 Supabase 连接

**常见错误**:
```
Error: Invalid Supabase URL
Error: Invalid API key
```

**解决步骤**:

1. **验证 Supabase URL**:
   - 登录 [Supabase Dashboard](https://supabase.com/dashboard)
   - 进入项目 → Settings → API
   - 复制 **Project URL**
   - 格式应为: `https://xxxxx.supabase.co`

2. **验证 API Keys**:
   - **anon/public key**: 在 API Settings 中找到 `anon` `public` key
   - **service_role key**: 在 API Settings 中找到 `service_role` key
   - ⚠️ **警告**: service_role key 具有完全访问权限，仅在服务端使用

3. **检查数据库表**:
   ```sql
   -- 在 Supabase SQL Editor 中运行
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'mistake_%';
   ```

   应该看到:
   ```
   mistake_profiles
   mistake_questions
   mistake_feedbacks
   ```

### 4. 常见运行时错误

#### 错误: "Failed to fetch"

**可能原因**:
- Supabase RLS 策略阻止访问
- 网络问题
- CORS 配置错误

**解决方案**:

1. **检查 RLS 策略**:
   ```sql
   -- 在 Supabase SQL Editor 中查看策略
   SELECT * FROM pg_policies WHERE tablename LIKE 'mistake_%';
   ```

2. **临时禁用 RLS 测试**:
   ```sql
   -- ⚠️ 仅用于测试，不要在生产环境使用
   ALTER TABLE mistake_questions DISABLE ROW LEVEL SECURITY;
   ```

3. **检查 CORS 设置**:
   - Vercel 自动处理 CORS
   - 检查 `vercel.json` 中的 headers 配置

#### 错误: "Authentication required"

**可能原因**:
- 用户未登录
- Session 过期
- Cookie 设置问题

**解决方案**:

1. **检查 Supabase Auth 配置**:
   - 进入 Supabase Dashboard → Authentication → Settings
   - 确保 **Site URL** 设置为您的 Vercel 域名
   - 添加 Vercel 域名到 **Redirect URLs**:
     ```
     https://your-app.vercel.app
     https://your-app.vercel.app/**
     ```

2. **检查匿名登录**:
   - 进入 Authentication → Providers
   - 确保 **Anonymous** 已启用

#### 错误: "AI API timeout"

**可能原因**:
- AI API 响应时间过长
- Vercel 函数超时（默认 10 秒）

**解决方案**:

1. **增加函数超时时间** (需要 Vercel Pro):
   ```json
   // vercel.json
   {
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     }
   }
   ```

2. **优化 AI API 调用**:
   - 压缩图片大小
   - 使用更快的 AI 模型
   - 添加超时重试逻辑

### 5. 数据库迁移问题

#### 错误: "relation does not exist"

**原因**: 数据库表未创建

**解决方案**:

1. **执行数据库迁移**:
   - 登录 Supabase Dashboard
   - 进入 SQL Editor
   - 打开 `supabase/migrations/00001_initial_schema.sql`
   - 复制全部内容并在 SQL Editor 中执行

2. **验证表是否创建**:
   ```sql
   -- 查看所有表
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

3. **检查表结构**:
   ```sql
   -- 查看 mistake_questions 表结构
   \d mistake_questions
   ```

### 6. 部署后页面空白

**可能原因**:
- JavaScript 错误
- 环境变量未加载
- 路由配置错误

**解决步骤**:

1. **检查浏览器控制台**:
   - 打开浏览器 DevTools (F12)
   - 查看 Console 标签
   - 记录所有错误信息

2. **检查网络请求**:
   - 打开 Network 标签
   - 刷新页面
   - 查看失败的请求

3. **查看 Vercel 日志**:
   - 进入 Vercel Dashboard → Deployments
   - 点击部署 → Runtime Logs
   - 查看实时日志

### 7. 环境变量不生效

**常见错误**:
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**解决步骤**:

1. **检查变量名前缀**:
   - 客户端变量必须以 `NEXT_PUBLIC_` 开头
   - 服务端变量不需要前缀

2. **重新部署**:
   - 修改环境变量后需要重新部署
   - Vercel Dashboard → Deployments → Redeploy

3. **检查作用域**:
   - 确保环境变量应用到 Production
   - Preview 和 Development 也建议配置

### 8. 性能问题

#### 页面加载慢

**优化方案**:

1. **启用缓存**:
   ```typescript
   // app/layout.tsx
   export const revalidate = 3600 // 1 小时
   ```

2. **优化图片**:
   ```tsx
   import Image from 'next/image'

   <Image
     src="/image.jpg"
     width={500}
     height={500}
     alt="Description"
   />
   ```

3. **代码分割**:
   ```typescript
   import dynamic from 'next/dynamic'

   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <p>Loading...</p>,
   })
   ```

#### API 响应慢

**优化方案**:

1. **使用边缘函数**:
   ```typescript
   export const runtime = 'edge'
   ```

2. **添加数据库索引**:
   ```sql
   -- 已在迁移文件中配置
   CREATE INDEX idx_user_id ON mistake_questions(user_id);
   ```

3. **启用查询缓存**:
   ```typescript
   const { data } = useQuestions({
     limit: 10,
     staleTime: 5 * 60 * 1000, // 5 分钟
   })
   ```

## 完整检查清单

部署前检查:
- [ ] 本地 `npm run build` 成功
- [ ] 所有环境变量已准备
- [ ] Supabase 数据库迁移已执行
- [ ] Supabase Auth 已配置
- [ ] .gitignore 包含 .env 文件

部署后检查:
- [ ] 构建成功（绿色勾号）
- [ ] 环境变量已配置
- [ ] 首页可以访问
- [ ] 登录功能正常
- [ ] 数据库连接正常
- [ ] API 路由响应正常

## 获取帮助

如果以上方法都无法解决问题:

1. **查看 Vercel 日志**:
   - Runtime Logs
   - Build Logs
   - Edge Functions Logs

2. **查看 Supabase 日志**:
   - Supabase Dashboard → Logs
   - Database Logs
   - API Logs

3. **本地复现**:
   ```bash
   # 使用生产环境变量
   cp .env.example .env.local
   # 填写实际值
   npm run build
   npm start
   ```

4. **联系支持**:
   - Vercel: https://vercel.com/support
   - Supabase: https://supabase.com/support

## 紧急回滚

如果部署出现严重问题:

1. 进入 Vercel Dashboard → Deployments
2. 找到上一个成功的部署
3. 点击 "..." → **Promote to Production**
4. 立即回滚到稳定版本

## 监控和告警

建议设置:

1. **Vercel Analytics**: 监控性能
2. **Sentry**: 错误追踪
3. **Uptime Robot**: 可用性监控
4. **Supabase Webhooks**: 数据库事件通知

---

**更新时间**: 2026-02-12
**适用版本**: Next.js 15.5.12, Supabase Latest
