// AI 服务抽象层 - 支持多提供商拓展

export interface AIProvider {
  name: string;
  recognize(imageBase64: string): Promise<OCRResult[]>;
}

export interface OCRResult {
  content: string;
  subject: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer: string;
  confidence: number;
  rawResponse?: any;
}

// AI 服务管理器
class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string = 'mock';

  // 注册 AI 提供商
  registerProvider(provider: AIProvider) {
    this.providers.set(provider.name, provider);
  }

  // 设置默认提供商
  setDefaultProvider(name: string) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.defaultProvider = name;
  }

  // 获取指定提供商
  getProvider(name?: string): AIProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider;
  }

  // 获取所有已注册提供商
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  // 识别（使用默认或指定提供商）
  async recognize(imageBase64: string, providerName?: string): Promise<OCRResult[]> {
    const provider = this.getProvider(providerName);
    return provider.recognize(imageBase64);
  }
}

// 单例实例
export const aiService = new AIServiceManager();

// 导出具体提供商实现
export { mockProvider } from './providers/mock';
export { baiduProvider, configureBaiduAI } from './providers/baidu';
export { alibabaProvider, configureAlibabaAI } from './providers/alibaba';
