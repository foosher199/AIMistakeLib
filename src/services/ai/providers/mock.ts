import type { AIProvider, OCRResult } from '../index';
import { CATEGORIES } from '@/types';

// 模拟题库数据
const MOCK_QUESTIONS: Record<string, { content: string; answer: string }[]> = {
  math: [
    { content: '已知函数 f(x) = x² - 2x + 1，求 f(2) 的值。', answer: '1' },
    { content: '在△ABC中，∠A = 60°，∠B = 45°，求∠C的度数。', answer: '75°' },
    { content: '解方程：2x + 5 = 15', answer: 'x = 5' },
    { content: '求等差数列 1, 4, 7, 10, ... 的第10项。', answer: '28' },
    { content: '已知圆的半径为5cm，求圆的面积。', answer: '25π cm²' },
  ],
  chinese: [
    { content: '《红楼梦》的作者是谁？', answer: '曹雪芹' },
    { content: '解释"春风又绿江南岸"中"绿"字的用法。', answer: '形容词作动词，使...变绿' },
    { content: '请分析《背影》中父亲形象的特点。', answer: '慈爱、深沉、伟大' },
    { content: '"先天下之忧而忧，后天下之乐而乐"出自哪篇文章？', answer: '《岳阳楼记》' },
    { content: '请简述鲁迅《故乡》的主题思想。', answer: '对旧社会的批判和对新生活的向往' },
  ],
  english: [
    { content: 'Choose the correct answer: I _____ to the cinema yesterday.', answer: 'went' },
    { content: 'Fill in the blank: She is interested _____ learning French.', answer: 'in' },
    { content: 'What is the past participle of "go"?', answer: 'gone' },
    { content: 'Translate: 时间过得真快！', answer: 'How time flies!' },
    { content: 'Complete the sentence: If I _____ rich, I would travel the world.', answer: 'were' },
  ],
  physics: [
    { content: '一个物体从静止开始自由下落，5秒后速度是多少？', answer: '49 m/s' },
    { content: '电路中电阻R=10Ω，电压U=5V，求电流I。', answer: '0.5 A' },
    { content: '光的折射定律是什么？', answer: 'n₁sinθ₁ = n₂sinθ₂' },
    { content: '简述牛顿第一定律的内容。', answer: '惯性定律' },
    { content: '一个质量为2kg的物体，加速度为3m/s²，求所受合力。', answer: '6 N' },
  ],
  chemistry: [
    { content: '写出氢气在氧气中燃烧的化学方程式。', answer: '2H₂ + O₂ → 2H₂O' },
    { content: '什么是氧化还原反应？', answer: '电子转移的反应' },
    { content: '元素周期表中，第IA族元素称为什么？', answer: '碱金属' },
    { content: '简述酸碱中和反应的本质。', answer: 'H⁺ + OH⁻ → H₂O' },
    { content: '甲烷的分子式是什么？', answer: 'CH₄' },
  ],
  biology: [
    { content: '细胞的基本结构包括哪些？', answer: '细胞膜、细胞质、细胞核' },
    { content: '光合作用的主要产物是什么？', answer: '葡萄糖和氧气' },
    { content: 'DNA的全称是什么？', answer: '脱氧核糖核酸' },
    { content: '简述食物链的概念。', answer: '生物之间吃与被吃的关系' },
    { content: '人类的遗传物质是什么？', answer: 'DNA' },
  ],
  history: [
    { content: '秦始皇统一六国是在哪一年？', answer: '公元前221年' },
    { content: '鸦片战争发生于哪个朝代？', answer: '清朝' },
    { content: '辛亥革命爆发于哪一年？', answer: '1911年' },
    { content: '第二次世界大战结束于哪一年？', answer: '1945年' },
    { content: '简述唐朝的盛世局面。', answer: '贞观之治、开元盛世' },
  ],
  geography: [
    { content: '地球上最大的洋是哪个？', answer: '太平洋' },
    { content: '我国的首都是哪里？', answer: '北京' },
    { content: '赤道穿过哪些大洲？', answer: '非洲、亚洲、南美洲、大洋洲' },
    { content: '什么是季风气候？', answer: '随季节变化的风向' },
    { content: '简述板块构造学说的主要内容。', answer: '地壳由板块组成，板块不断运动' },
  ],
  politics: [
    { content: '马克思主义哲学的核心观点是什么？', answer: '实践观点' },
    { content: '社会主义市场经济的基本特征是什么？', answer: '公有制为主体' },
    { content: '什么是社会主义核心价值观？', answer: '富强民主文明和谐' },
    { content: '简述我国的基本政治制度。', answer: '人民代表大会制度' },
    { content: '文化的本质是什么？', answer: '人类精神活动及其产品' },
  ],
};

// Mock AI 提供商（用于测试）
export const mockProvider: AIProvider = {
  name: 'mock',
  
  async recognize(_imageBase64: string): Promise<OCRResult[]> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 随机选择 2-4 个题目返回（模拟批量识别）
    const subjects = Object.keys(MOCK_QUESTIONS);
    const numQuestions = Math.floor(Math.random() * 3) + 2; // 2-4 题
    const results: OCRResult[] = [];
    
    for (let i = 0; i < numQuestions; i++) {
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      const subjectQuestions = MOCK_QUESTIONS[randomSubject];
      const randomIndex = Math.floor(Math.random() * subjectQuestions.length);
      
      // 随机选择难度
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      // 获取该学科的分类
      const categories = CATEGORIES[randomSubject] || ['其他'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      results.push({
        content: subjectQuestions[randomIndex].content,
        subject: randomSubject,
        category: randomCategory,
        difficulty: randomDifficulty,
        answer: subjectQuestions[randomIndex].answer,
        confidence: 0.75 + Math.random() * 0.2,
      });
    }
    
    return results;
  },
};
