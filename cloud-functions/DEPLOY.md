# 腾讯云云函数部署说明

## 1. 部署 AI 识别云函数

### 步骤 1: 登录腾讯云控制台
访问 https://console.cloud.tencent.com/tcb

### 步骤 2: 进入云函数管理
1. 选择环境 `mistake-record-1gfkpu0t4d9e8174`
2. 点击左侧菜单「云函数」
3. 点击「新建云函数」

### 步骤 3: 创建云函数
1. **函数名称**: `ai-recognize`
2. **运行环境**: Node.js 18.15
3. **函数代码**:
   - 将 `ai-recognize/index.js` 的内容复制到代码编辑器
   - 创建 `package.json` 文件，内容复制 `ai-recognize/package.json`
4. **执行方法**: `index.main`
5. **内存**: 256MB
6. **超时时间**: 60秒
7. 点击「完成」

### 步骤 4: 配置触发器
1. 进入云函数详情页
2. 点击「触发管理」
3. 点击「创建触发器」
4. **触发方式**: HTTP 触发
5. **请求方法**: POST
6. **鉴权方式**: 免鉴权
7. 点击「提交」

### 步骤 5: 获取云函数 URL
创建成功后，你会得到一个 URL，类似：
```
https://mistake-record-1gfkpu0t4d9e8174-xxx.service.tcloudbase.com/ai-recognize
```

将这个 URL 配置到前端代码中。

---

## 2. 配置数据库 CORS（解决数据库跨域问题）

### 方法 1: 配置 Web 安全域名
1. 进入腾讯云控制台
2. 点击「环境」→「安全配置」
3. 在「Web 安全域名」中添加你的域名：
   - `https://www.kimi.com`
   - `https://*.kimi.com`

### 方法 2: 创建数据库代理云函数（推荐）

如果方法 1 不生效，创建一个数据库代理云函数：

**函数名称**: `db-proxy`

```javascript
// index.js
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'mistake-record-1gfkpu0t4d9e8174',
});

const db = app.database();

exports.main = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const { action, collection, data, where, id, orderBy, limit } = event.body || {};

  try {
    let result;
    const coll = db.collection(collection);

    switch (action) {
      case 'get':
        result = await coll.where(where || {}).orderBy(orderBy?.field || 'createdAt', orderBy?.direction || 'desc').get();
        break;
      case 'add':
        result = await coll.add(data);
        break;
      case 'update':
        result = await coll.doc(id).update(data);
        break;
      case 'delete':
        result = await coll.doc(id).remove();
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
```

**package.json**:
```json
{
  "name": "db-proxy",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "^2.0.0"
  }
}
```

---

## 3. 前端配置

将云函数 URL 配置到前端代码中：

```typescript
// src/config/cloud-functions.ts
export const CLOUD_FUNCTIONS = {
  // AI 识别云函数 URL
  AI_RECOGNIZE: 'https://你的云函数URL/ai-recognize',
  
  // 数据库代理云函数 URL（如果需要）
  DB_PROXY: 'https://你的云函数URL/db-proxy',
};
```
