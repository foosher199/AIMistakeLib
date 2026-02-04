import { useState, useCallback } from 'react';
import { aiService, baiduProvider, alibabaProvider } from '@/services/ai';
import type { OCRResult } from '@/services/ai';

// 注册 AI 提供商
aiService.registerProvider(baiduProvider);
aiService.registerProvider(alibabaProvider);

// 设置默认提供商为阿里（支持图片理解+分析，一次 API 调用）
aiService.setDefaultProvider('alibaba');

export type { OCRResult };

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 将文件转换为 base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 data:image/jpeg;base64, 前缀
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // 识别图片（返回多个题目）
  const recognize = useCallback(async (imageFile: File, providerName?: string): Promise<OCRResult[]> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // 模拟进度条
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 100);

      // 转换为 base64
      const base64 = await fileToBase64(imageFile);

      // 调用 AI 服务
      const results = await aiService.recognize(base64, providerName);

      clearInterval(progressInterval);
      setProgress(100);

      return results;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
    }
  }, [fileToBase64]);

  // 切换 AI 提供商
  const setProvider = useCallback((providerName: string) => {
    aiService.setDefaultProvider(providerName);
  }, []);

  // 获取可用提供商列表
  const getAvailableProviders = useCallback(() => {
    return aiService.getAllProviders().map(p => ({
      name: p.name,
      label: p.name === 'mock' ? '模拟识别' : 
             p.name === 'baidu' ? '百度 AI' : 
             p.name,
    }));
  }, []);

  return {
    isProcessing,
    progress,
    recognize,
    setProvider,
    getAvailableProviders,
  };
}
