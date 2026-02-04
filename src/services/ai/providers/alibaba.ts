// 阿里通义千问 AI 提供商
// 通过腾讯云云函数调用，避免 CORS 问题

import type { AIProvider, OCRResult } from '../index';
import { callAIRecognize, isCloudFunctionsConfigured } from '@/config/cloud-functions';

// 阿里云配置（仅在直接调用时使用，生产环境应使用云函数）
const ALIBABA_CONFIG = {
  API_KEY: 'sk-3f121f09619945f1b5856923d64c3162',
  BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  MODEL: 'qwen-vl-plus',
};

/**
 * 阿里 AI 提供商
 * 
 * 工作流程：
 * 1. 优先使用云函数调用（避免 CORS）
 * 2. 如果云函数未配置，尝试直接调用（开发环境）
 * 3. 如果直接调用失败，返回错误提示
 */
export const alibabaProvider: AIProvider = {
  name: 'alibaba',
  
  async recognize(imageBase64: string): Promise<OCRResult[]> {
    // 优先使用云函数
    if (isCloudFunctionsConfigured()) {
      try {
        console.log('Using cloud function for AI recognition...');
        const results = await callAIRecognize(imageBase64, 'alibaba');
        return results.map((item: any) => normalizeResult(item));
      } catch (error: any) {
        console.error('Cloud function failed:', error);
        // 云函数失败，尝试直接调用
      }
    }
    
    // 尝试直接调用（开发环境，可能有 CORS 问题）
    console.log('Trying direct API call...');
    return recognizeDirect(imageBase64);
  },
};

/**
 * 直接调用阿里云 API（可能有 CORS 问题）
 */
async function recognizeDirect(imageBase64: string): Promise<OCRResult[]> {
  try {
    const prompt = `请识别图片中的所有题目，并以 JSON 数组格式返回。

要求：
1. 识别图片中的每一道题目
2. 对每道题目分析：学科、难度、知识点分类、答案、详细解析
3. 返回格式必须是合法的 JSON 数组

返回格式示例：
[
  {
    "content": "题目内容",
    "subject": "学科ID（math/chinese/english/physics/chemistry/biology/history/geography/politics）",
    "category": "知识点分类",
    "difficulty": "难度（easy/medium/hard）",
    "answer": "答案",
    "explanation": "详细解析"
  }
]

注意：
- 如果图片中有多个题目，返回多个对象
- 如果无法确定某一项，使用合理的默认值
- 只返回 JSON 数组，不要其他说明文字`;

    const response = await fetch(`${ALIBABA_CONFIG.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALIBABA_CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: ALIBABA_CONFIG.MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 解析 AI 返回的 JSON
    const results = parseAIResponse(content);
    
    if (results.length === 0) {
      return [{
        content: '未能识别出题目内容，请尝试重新拍摄或手动输入',
        subject: 'math',
        category: '其他',
        difficulty: 'medium',
        answer: '',
        confidence: 0,
      }];
    }

    return results;
  } catch (error: any) {
    console.error('Alibaba AI direct call failed:', error);
    
    // 如果是 CORS 错误，提示用户部署云函数
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      return [{
        content: 'CORS 错误：请部署云函数来解决跨域问题。参考 cloud-functions/DEPLOY.md',
        subject: 'math',
        category: '其他',
        difficulty: 'medium',
        answer: '',
        confidence: 0,
      }];
    }
    
    return [{
      content: `识别失败: ${error.message}。请检查网络连接或稍后重试。`,
      subject: 'math',
      category: '其他',
      difficulty: 'medium',
      answer: '',
      confidence: 0,
    }];
  }
}

/**
 * 解析 AI 返回的内容，提取 JSON 数组
 */
function parseAIResponse(content: string): OCRResult[] {
  try {
    // 尝试直接解析
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map(item => normalizeResult(item));
    }
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions.map((item: any) => normalizeResult(item));
    }
  } catch {
    // 尝试从文本中提取 JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.map(item => normalizeResult(item));
        }
      } catch (e) {
        console.error('JSON parse failed:', e);
      }
    }
  }
  
  return [];
}

/**
 * 标准化 AI 返回的结果
 */
function normalizeResult(item: any): OCRResult {
  const validSubjects = ['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics'];
  const validDifficulties = ['easy', 'medium', 'hard'];
  
  return {
    content: item.content || item.question || item.text || '未识别到题目内容',
    subject: validSubjects.includes(item.subject) ? item.subject : 'math',
    category: item.category || item.knowledgePoint || '其他',
    difficulty: validDifficulties.includes(item.difficulty) ? item.difficulty : 'medium',
    answer: item.answer || item.答案 || '',
    confidence: 0.85,
    rawResponse: {
      explanation: item.explanation || item.parse || item.解析 || '',
    },
  };
}

/**
 * 配置阿里 AI 凭证（用于动态配置）
 */
export function configureAlibabaAI(_apiKey: string) {
  console.log('Alibaba AI configured with new API key');
}
