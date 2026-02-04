// 腾讯云云函数：AI 题目识别
// 通过 SDK app.callFunction() 调用
// event 直接是 callFunction 传入的 data 对象，无需从 event.body 中提取

const axios = require('axios');

// 阿里云配置
const ALIBABA_CONFIG = {
  API_KEY: 'sk-3f121f09619945f1b5856923d64c3162',
  BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  MODEL: 'qwen-vl-plus',
};

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  try {
    const { imageBase64, provider = 'alibaba' } = event;

    if (!imageBase64) {
      return { success: false, error: 'Missing imageBase64 parameter' };
    }

    let results;
    if (provider === 'alibaba') {
      results = await recognizeWithAlibaba(imageBase64);
    } else if (provider === 'baidu') {
      results = await recognizeWithBaidu(imageBase64);
    } else {
      return { success: false, error: 'Unknown provider: ' + provider };
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error:', error);
    // axios 的 4xx/5xx 响应体在 error.response.data 里，提取具体错误信息
    const apiError = error.response?.data?.error?.message;
    return { success: false, error: apiError || error.message || 'Internal server error' };
  }
};

/**
 * 使用阿里云通义千问识别
 */
async function recognizeWithAlibaba(imageBase64) {
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

  const response = await axios.post(
    `${ALIBABA_CONFIG.BASE_URL}/chat/completions`,
    {
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
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALIBABA_CONFIG.API_KEY}`,
      },
      timeout: 60000, // 60秒超时
    }
  );

  const content = response.data.choices?.[0]?.message?.content || '';
  console.log('AI Response:', content);

  // 解析 AI 返回的 JSON
  return parseAIResponse(content);
}

/**
 * 使用百度 OCR 识别（备用）
 */
async function recognizeWithBaidu(imageBase64) {
  const BAIDU_CONFIG = {
    API_KEY: 'xysiQ2ZK670uimOCKNOLs3zf',
    SECRET_KEY: '7AvUW0DrNvuPj6T38KXcvexDTS9QMHMi',
  };

  // 1. 获取 access token
  const tokenResponse = await axios.post(
    'https://aip.baidubce.com/oauth/2.0/token',
    null,
    {
      params: {
        grant_type: 'client_credentials',
        client_id: BAIDU_CONFIG.API_KEY,
        client_secret: BAIDU_CONFIG.SECRET_KEY,
      },
    }
  );

  const accessToken = tokenResponse.data.access_token;

  // 2. 调用 OCR API
  const ocrResponse = await axios.post(
    'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic',
    new URLSearchParams({
      image: imageBase64,
      language_type: 'CHN_ENG',
      detect_direction: 'true',
      paragraph: 'true',
    }),
    {
      params: { access_token: accessToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const wordsResult = ocrResponse.data.words_result || [];
  const fullText = wordsResult.map((item) => item.words).join('\n');

  // 拆分为多个题目
  const questionTexts = splitQuestions(fullText);

  return questionTexts.map((text) => ({
    content: text.trim(),
    subject: detectSubject(text),
    category: '其他',
    difficulty: detectDifficulty(text),
    answer: '',
    confidence: 0.85,
    explanation: '',
  }));
}

/**
 * 解析 AI 返回的内容，提取 JSON 数组
 */
function parseAIResponse(content) {
  try {
    // 尝试直接解析
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeResult(item));
    }
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions.map((item) => normalizeResult(item));
    }
  } catch {
    // 尝试从文本中提取 JSON
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => normalizeResult(item));
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
function normalizeResult(item) {
  const validSubjects = [
    'math',
    'chinese',
    'english',
    'physics',
    'chemistry',
    'biology',
    'history',
    'geography',
    'politics',
  ];
  const validDifficulties = ['easy', 'medium', 'hard'];

  return {
    content: item.content || item.question || item.text || '未识别到题目内容',
    subject: validSubjects.includes(item.subject) ? item.subject : 'math',
    category: item.category || item.knowledgePoint || '其他',
    difficulty: validDifficulties.includes(item.difficulty)
      ? item.difficulty
      : 'medium',
    answer: item.answer || '',
    confidence: 0.85,
    explanation: item.explanation || item.parse || '',
  };
}

/**
 * 将识别结果拆分为多个题目
 */
function splitQuestions(text) {
  const parts = text.split(/\n{2,}/).filter((p) => p.trim());

  if (parts.length === 1) {
    const questionRegex =
      /(?:^|\n)(?:\d+[\.、]|\(\d+\)|[①②③④⑤⑥⑦⑧⑨⑩])/g;
    const matches = text.split(questionRegex).filter((p) => p.trim());
    if (matches.length > 1) {
      return matches.map((m, i) => `${i + 1}. ${m.trim()}`);
    }
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * 分析文本，推测学科
 */
function detectSubject(text) {
  const subjectKeywords = {
    math: ['函数', '方程', '几何', '三角', '数列', '导数', '积分', '概率', '统计', '代数'],
    chinese: ['古诗', '文言文', '阅读', '作文', '成语', '修辞', '作者', '作品'],
    english: ['grammar', 'vocabulary', 'reading', 'translation', 'choose', 'fill'],
    physics: ['力', '速度', '加速度', '电流', '电压', '电阻', '光', '热', '能量'],
    chemistry: ['化学', '元素', '分子', '原子', '反应', '方程式', '酸碱', '氧化'],
    biology: ['细胞', '基因', 'DNA', '生物', '植物', '动物', '遗传', '进化'],
    history: ['历史', '朝代', '皇帝', '战争', '革命', '条约', '年代'],
    geography: ['地理', '气候', '地形', '河流', '山脉', '国家', '城市'],
    politics: ['政治', '经济', '哲学', '文化', '社会', '制度', '政策'],
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
function detectDifficulty(text) {
  const hardKeywords = ['证明', '推导', '综合', '应用', '拓展', '探究', '分析'];
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
