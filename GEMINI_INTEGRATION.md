# Google Gemini 集成指南

本文档说明如何在项目中使用 Google Gemini AI 进行题目识别。

## 1. 安装依赖

```bash
npm install @google/generative-ai
```

## 2. 获取 Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 复制 API Key

## 3. 配置环境变量

在 `.env.local` 文件中添加：

```bash
# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here
# 或者使用
# GOOGLE_API_KEY=your-gemini-api-key-here
```

## 4. 使用方式

### 在 Hook 中使用

```tsx
import { useOCR } from '@/hooks/useOCR'

function MyComponent() {
  const { recognize, switchProvider } = useOCR()

  // 切换到 Gemini
  switchProvider('gemini')

  // 识别图片
  const handleRecognize = async (file: File) => {
    try {
      const results = await recognize(file)
      console.log('识别结果:', results)
    } catch (error) {
      console.error('识别失败:', error)
    }
  }

  // 或者直接指定 provider
  const handleRecognizeWithGemini = async (file: File) => {
    const results = await recognize(file, { provider: 'gemini' })
  }
}
```

### API 调用

```typescript
// POST /api/ai/recognize
const response = await fetch('/api/ai/recognize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageBase64: 'data:image/jpeg;base64,...',
    provider: 'gemini',
  }),
})

const data = await response.json()
console.log(data.results)
```

## 5. Gemini 模型特点

### 优势
- 🚀 **速度快** - Gemini 2.0 Flash 模型响应速度快
- 🎯 **准确度高** - 多模态理解能力强，识别准确度 0.85-0.95
- 📊 **结构化输出** - 支持 JSON Schema 定义的结构化响应
- 🌍 **免费额度** - 提供较高的免费 API 调用额度
- 🔒 **隐私保护** - Google 承诺不使用 API 数据训练模型

### 与其他 AI 的对比

| 特性 | Alibaba DashScope | Google Gemini | Baidu OCR |
|------|-------------------|---------------|-----------|
| 模型 | qwen-vl-plus | gemini-2.0-flash-exp | 通用 OCR |
| 准确度 | 0.8-0.95 | 0.85-0.95 | 0.75 |
| 速度 | 快 | 很快 | 快 |
| 多题识别 | ✅ | ✅ | ❌ |
| 结构化输出 | ✅ | ✅ | ❌ |
| 免费额度 | 有限 | 较高 | 有限 |

## 6. 自动降级策略

API 路由已配置自动降级：
1. 首选提供商失败时，自动尝试备用方案
2. Alibaba 失败 → 尝试 Gemini → 尝试 Baidu
3. Gemini 失败 → 尝试 Baidu

## 7. 常见问题

### Q: Gemini API 返回 403 错误
A: 检查 API Key 是否正确，以及是否在 Google AI Studio 中启用了 API。

### Q: Gemini 识别速度慢
A: Gemini 2.0 Flash 是优化过速度的模型，如果仍然慢，可能是网络问题。考虑添加超时配置。

### Q: 如何调整识别准确度
A: 可以在 `lib/ai/gemini.ts` 中调整 `temperature` 参数（当前为 0.1，降低值可提高稳定性）。

### Q: 支持哪些 Gemini 模型
A: 当前使用 `gemini-2.0-flash-exp`，可以改为：
- `gemini-2.0-flash-exp` - 最新实验版本，速度最快
- `gemini-1.5-pro` - Pro 版本，能力更强但速度较慢
- `gemini-1.5-flash` - Flash 版本，平衡速度和能力

修改模型：在 `lib/ai/gemini.ts` 第 25 行修改 `model` 参数。

## 8. 费用说明

Gemini API 免费额度（截至 2024）：
- Gemini 2.0 Flash: 15 RPM（每分钟请求数）
- Gemini 1.5 Pro: 2 RPM
- Gemini 1.5 Flash: 15 RPM

查看最新价格：https://ai.google.dev/pricing

## 9. 调试技巧

启用详细日志：

```typescript
// 在 lib/ai/gemini.ts 中添加
console.log('Gemini 请求:', { imageSize: imageData.length })
console.log('Gemini 响应:', text)
```

查看 API 错误：

```bash
# 查看 Next.js 服务器日志
npm run dev
```

## 10. 最佳实践

1. **使用 Gemini 作为主力模型**：速度快、准确度高、免费额度大
2. **配置多个 AI 提供商**：确保系统可靠性
3. **监控 API 配额**：避免超出免费额度
4. **优化图片大小**：压缩图片可提高速度和降低成本
5. **缓存识别结果**：避免重复识别相同图片

## 支持

如有问题，请访问：
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API 文档](https://ai.google.dev/docs)
