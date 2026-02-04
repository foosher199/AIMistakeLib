// 腾讯云云函数调用 — 通过 SDK app.callFunction() 实现，无需配置 URL
import { getTCBApp } from './tcb';

/**
 * 调用 ai-recognize 云函数
 * app.callFunction 的返回值结构为 { data: <云函数返回值> }
 */
export async function callAIRecognize(imageBase64: string, provider: string = 'alibaba') {
  const app = getTCBApp();

  const res = await app.callFunction({
    name: 'ai-recognize',
    data: { imageBase64, provider },
  });

  const result = res.data;

  if (!result.success) {
    throw new Error(result.error || 'AI 识别失败');
  }

  return result.data;
}

/**
 * SDK 方式调用云函数不依赖 URL，部署后即可使用
 */
export function isCloudFunctionsConfigured(): boolean {
  return true;
}
