// 百度 AI OCR 提供商
// 文档：https://ai.baidu.com/ai-doc/OCR/Ek3h7xypm

import type { AIProvider, OCRResult } from '../index';
import { callAIRecognize, isCloudFunctionsConfigured } from '@/config/cloud-functions';
import { CATEGORIES } from '@/types';

// 百度 AI 配置
const BAIDU_CONFIG = {
  API_KEY: 'xysiQ2ZK670uimOCKNOLs3zf',
  SECRET_KEY: '7AvUW0DrNvuPj6T38KXcvexDTS9QMHMi',
  
  // 获取 Token 的接口
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token',
  
  // OCR 接口
  OCR_ACCURATE_URL: 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic',
};

// 缓存 access token
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * 获取百度 AI Access Token
 * 
 * ⚠️ 注意：生产环境应该通过云函数获取 token，不要在前端暴露 Secret Key
 * 这里为了演示，提供前端直连代码
 */
async function getAccessToken(): Promise<string> {
  // 检查缓存
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }
  
  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: BAIDU_CONFIG.API_KEY,
      client_secret: BAIDU_CONFIG.SECRET_KEY,
    });
    
    const response = await fetch(`${BAIDU_CONFIG.TOKEN_URL}?${params}`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Baidu Auth Error: ${data.error_description}`);
    }
    
    // 缓存 token，提前 5 分钟过期
    accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };
    
    return data.access_token;
  } catch (error: any) {
    console.error('Get access token failed:', error);
    throw new Error('获取百度 AI 授权失败，请检查网络连接');
  }
}

/**
 * 分析文本，推测学科
 */
function detectSubject(text: string): string {
  const subjectKeywords: Record<string, string[]> = {
    math: ['函数', '方程', '几何', '三角', '数列', '导数', '积分', '概率', '统计', '代数', '计算', '求证', '证明'],
    chinese: ['古诗', '文言文', '阅读', '作文', '成语', '修辞', '作者', '作品', '诗词', '散文'],
    english: ['grammar', 'vocabulary', 'reading', 'translation', 'choose', 'fill in', 'complete', 'select'],
    physics: ['力', '速度', '加速度', '电流', '电压', '电阻', '光', '热', '能量', '磁场', '电场'],
    chemistry: ['化学', '元素', '分子', '原子', '反应', '方程式', '酸碱', '氧化', '化合'],
    biology: ['细胞', '基因', 'DNA', '生物', '植物', '动物', '遗传', '进化', '生态'],
    history: ['历史', '朝代', '皇帝', '战争', '革命', '条约', '年代', '事件'],
    geography: ['地理', '气候', '地形', '河流', '山脉', '国家', '城市', '经纬度'],
    politics: ['政治', '经济', '哲学', '文化', '社会', '制度', '政策', '马克思主义'],
  };
  
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let detectedSubject = 'math';
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }
  
  return detectedSubject;
}

/**
 * 分析难度
 */
function detectDifficulty(text: string): 'easy' | 'medium' | 'hard' {
  const hardKeywords = ['证明', '推导', '综合', '应用', '拓展', '探究', '分析', '论述'];
  const easyKeywords = ['计算', '选择', '填空', '直接', '简单', '写出', '列举'];
  
  let hardScore = 0;
  let easyScore = 0;
  
  for (const keyword of hardKeywords) {
    if (text.includes(keyword)) hardScore++;
  }
  for (const keyword of easyKeywords) {
    if (text.includes(keyword)) easyScore++;
  }
  
  if (hardScore > easyScore) return 'hard';
  if (easyScore > hardScore) return 'easy';
  return 'medium';
}

/**
 * 将识别结果拆分为多个题目
 */
function splitQuestions(text: string): string[] {
  // 按多个换行符分割（题目之间的空行）
  const parts = text.split(/\n{2,}/).filter(p => p.trim());
  
  // 如果只有一段，尝试按题号分割
  if (parts.length === 1) {
    // 匹配常见的题号格式：1. 1、 (1) ① 等
    const questionRegex = /(?:^|\n)(?:\d+[\.、]|\(\d+\)|[①②③④⑤⑥⑦⑧⑨⑩])/g;
    const matches = text.split(questionRegex).filter(p => p.trim());
    if (matches.length > 1) {
      return matches.map((m, i) => `${i + 1}. ${m.trim()}`);
    }
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * 百度 AI OCR 提供商
 * 
 * 工作流程：
 * 1. 使用百度 OCR API 提取图片中的文字
 * 2. 将文字拆分为多个题目
 * 3. 分析每个题目的学科和难度
 * 
 * ⚠️ 注意：百度 OCR 只返回文字内容，不返回答案和解析
 */
export const baiduProvider: AIProvider = {
  name: 'baidu',

  async recognize(imageBase64: string): Promise<OCRResult[]> {
    // 优先使用云函数（避免 Secret Key 暴露在前端）
    if (isCloudFunctionsConfigured()) {
      try {
        const results = await callAIRecognize(imageBase64, 'baidu');
        return results.map((item: any) => ({
          content: item.content || '未识别到题目内容',
          subject: item.subject || 'math',
          category: item.category || '其他',
          difficulty: item.difficulty || 'medium',
          answer: item.answer || '',
          confidence: item.confidence || 0.85,
          rawResponse: {
            explanation: item.explanation || '',
          },
        }));
      } catch (error: any) {
        console.error('Cloud function failed, falling back to direct call:', error);
      }
    }

    // Fallback：直接调用（开发环境）
    try {
      // 获取 access token
      const accessToken = await getAccessToken();
      
      // 调用百度 OCR API（高精度版）
      const response = await fetch(
        `${BAIDU_CONFIG.OCR_ACCURATE_URL}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            image: imageBase64,
            language_type: 'CHN_ENG',
            detect_direction: 'true',
            paragraph: 'true',
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.error_code) {
        throw new Error(`百度 OCR 错误: ${data.error_msg}`);
      }
      
      // 提取识别的文字
      const wordsResult = data.words_result || [];
      
      if (wordsResult.length === 0) {
        return [{
          content: '未能识别出文字内容，请尝试重新拍摄或手动输入',
          subject: 'math',
          category: '其他',
          difficulty: 'medium',
          answer: '',
          confidence: 0,
        }];
      }
      
      // 合并所有识别的文字
      const fullText = wordsResult.map((item: any) => item.words).join('\n');
      
      // 拆分为多个题目
      const questionTexts = splitQuestions(fullText);
      
      // 为每个题目生成结果
      const results: OCRResult[] = questionTexts.map((text) => {
        const subject = detectSubject(text);
        const difficulty = detectDifficulty(text);
        const categories = CATEGORIES[subject] || ['其他'];
        
        return {
          content: text.trim(),
          subject,
          category: categories[0],
          difficulty,
          answer: '', // 百度 OCR 不返回答案
          confidence: 0.85,
          rawResponse: {
            explanation: '', // 百度 OCR 不返回解析
          },
        };
      });
      
      return results;
    } catch (error: any) {
      console.error('Baidu OCR failed:', error);
      // 返回错误提示，而不是模拟数据
      return [{
        content: `识别失败: ${error.message}。请检查网络连接或稍后重试。`,
        subject: 'math',
        category: '其他',
        difficulty: 'medium',
        answer: '',
        confidence: 0,
      }];
    }
  },
};

/**
 * 配置百度 AI 凭证（用于动态配置）
 */
export function configureBaiduAI(_apiKey: string, _secretKey: string) {
  // 实际项目中可以在这里动态更新配置
  console.log('Baidu AI configured with new credentials');
}
