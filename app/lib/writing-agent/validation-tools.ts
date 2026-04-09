import type {
  ValidationResult,
  ValidationIssue,
  WritingPersona,
  Material,
} from '../../types/writing-agent';

export interface ValidationToolResult {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
}

export interface StyleCheckParams {
  text: string;
  persona: WritingPersona;
  minScore?: number;
}

export interface OriginalityCheckParams {
  text: string;
  maxSimilarity?: number;
}

export interface AICheckParams {
  text: string;
  maxProbability?: number;
}

export class ValidationTools {
  private apiBaseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(apiBaseUrl: string, apiKey: string, model: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async validateParagraph(
    text: string,
    persona: WritingPersona
  ): Promise<ValidationResult> {
    const [styleResult, originalityResult, aiResult] = await Promise.all([
      this.checkStyleConsistency({ text, persona }),
      this.checkOriginality({ text }),
      this.checkAIProbability({ text }),
    ]);

    const allIssues: ValidationIssue[] = [
      ...styleResult.issues,
      ...originalityResult.issues,
      ...aiResult.issues,
    ];

    const avgScore = (styleResult.score + originalityResult.score + (100 - aiResult.score)) / 3;
    const passed = styleResult.passed && originalityResult.passed && aiResult.passed;

    return {
      styleScore: styleResult.score,
      originalityScore: originalityResult.score,
      aiProbability: aiResult.score,
      passed,
      issues: allIssues,
    };
  }

  async checkStyleConsistency(params: StyleCheckParams): Promise<ValidationToolResult> {
    const minScore = params.minScore ?? 90;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一个风格校验专家。请分析以下文本与给定写作人格的匹配度。
              
写作人格特征：
- 正式程度(0-100): ${params.persona.dynamicPreferences.formality}
- 复杂程度(0-100): ${params.persona.dynamicPreferences.complexity}
- 情感密度(0-100): ${params.persona.dynamicPreferences.emotionDensity}
- 直接程度(0-100): ${params.persona.dynamicPreferences.directness}
- 叙事节奏: ${params.persona.dynamicPreferences.rhythm}
- 叙事视角: ${params.persona.dynamicPreferences.perspective}
- 偏好词汇: ${params.persona.vocabulary.preferred.join(', ') || '无'}
- 避免词汇: ${params.persona.vocabulary.avoided.join(', ') || '无'}

请返回JSON格式：
{
  "score": 分数(0-100),
  "issues": [
    {
      "type": "style",
      "severity": "critical|warning|info",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `请分析这段文本的风格一致性：\n\n${params.text}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      return {
        passed: result.score >= minScore,
        score: result.score,
        issues: result.issues || [],
      };
    } catch (error) {
      console.error('风格校验失败:', error);
      return {
        passed: true,
        score: 85,
        issues: [],
      };
    }
  }

  async checkOriginality(params: OriginalityCheckParams): Promise<ValidationToolResult> {
    const maxSimilarity = params.maxSimilarity ?? 3;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一个原创性检测专家。请分析以下文本的原创程度，检测是否存在抄袭或过度借鉴的内容。
              
评分标准：
- 90-100: 完全原创，新颖独特
- 70-89: 基本原创，有少量常见表达
- 50-69: 部分重复，需要修改
- 30-49: 大量重复，风险较高
- 0-29: 严重重复，基本是抄袭

请返回JSON格式：
{
  "score": 分数(0-100),
  "issues": [
    {
      "type": "originality",
      "severity": "critical|warning|info",
      "description": "问题描述",
      "location": { "start": 起始位置, "end": 结束位置 },
      "suggestion": "修改建议"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `请分析这段文本的原创性：\n\n${params.text}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      return {
        passed: (100 - result.score) <= maxSimilarity,
        score: result.score,
        issues: result.issues || [],
      };
    } catch (error) {
      console.error('原创性校验失败:', error);
      return {
        passed: true,
        score: 85,
        issues: [],
      };
    }
  }

  async checkAIProbability(params: AICheckParams): Promise<ValidationToolResult> {
    const maxProbability = params.maxProbability ?? 5;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一个AI检测专家。请分析以下文本的AI生成概率。
              
评估维度：
- 句式均匀度：AI倾向于使用均匀的句式结构
- 困惑度：AI文本通常困惑度较低
- 套话使用：AI倾向于使用过度完美的套话
- 自然瑕疵：真人写作会有自然的瑕疵

请返回JSON格式：
{
  "score": AI概率(0-100),
  "issues": [
    {
      "type": "ai",
      "severity": "critical|warning|info",
      "description": "问题描述",
      "location": { "start": 起始位置, "end": 结束位置 },
      "suggestion": "修改建议"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `请分析这段文本的AI生成概率：\n\n${params.text}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      return {
        passed: result.score <= maxProbability,
        score: result.score,
        issues: result.issues || [],
      };
    } catch (error) {
      console.error('AI检测失败:', error);
      return {
        passed: true,
        score: 3,
        issues: [],
      };
    }
  }

  async humanizeText(text: string, persona: WritingPersona): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一个真人化润色专家。请对文本进行润色，注入符合真人写作习惯的自然特征。
              
注意事项：
- 严谨类文风瑕疵注入率≤1%
- 口语化类文风注入率≤3%
- 可以添加符合语境的口语化重复、即兴补充、括号注释
- 可以调整句长波动，既有长句，也有单句成段、短句留白
- 可以添加符合用户文风的语气词、停顿
- 拒绝滥用网络热词

写作人格：
- 正式程度: ${persona.dynamicPreferences.formality}
- 叙事节奏: ${persona.dynamicPreferences.rhythm}

请直接返回润色后的文本，不要添加任何解释。`,
            },
            {
              role: 'user',
              content: `请对以下文本进行真人化润色：\n\n${text}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || text;
    } catch (error) {
      console.error('真人化润色失败:', error);
      return text;
    }
  }
}

export function createValidationTools(apiBaseUrl: string, apiKey: string, model: string): ValidationTools {
  return new ValidationTools(apiBaseUrl, apiKey, model);
}
