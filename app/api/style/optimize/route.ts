import { NextRequest, NextResponse } from 'next/server';
import type { OptimizationSettings, OptimizationResult, WritingStyle } from '../../../types/editor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, article, settings, style } = body;

    if (!apiBaseUrl || !apiKey || !model || !article) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    const optSettings: OptimizationSettings = settings || {
      intensity: 'medium',
      preserveStructure: true,
      preserveKeywords: true,
    };

    // 构建风格优化提示词
    const systemPrompt = buildOptimizationPrompt(optSettings, style);
    const userPrompt = buildUserPrompt(article, optSettings, style);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: getTemperatureByIntensity(optSettings.intensity),
        max_tokens: 4000,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `API 请求失败：${response.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const optimizedContent = data.choices?.[0]?.message?.content;
    
    if (!optimizedContent) {
      return NextResponse.json(
        { error: 'API 返回内容为空' },
        { status: 500 }
      );
    }

    // 分析修改内容
    const changes = analyzeChanges(article, optimizedContent);
    
    // 计算风格匹配度
    const styleScore = calculateStyleScore(article, optimizedContent, style);

    const result: OptimizationResult = {
      original: article,
      optimized: optimizedContent,
      changes,
      styleScore,
      originalityScore: 0, // 将在原创性检测中计算
    };

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('文风优化失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '文风优化失败' },
      { status: 500 }
    );
  }
}

function buildOptimizationPrompt(settings: OptimizationSettings, style?: WritingStyle): string {
  const intensityDescriptions = {
    light: '轻度优化：保留原文大部分内容，仅微调表达方式',
    medium: '中度优化：在保持核心意思的基础上，显著改善表达方式',
    deep: '深度优化：全面重构表达，使其完全符合目标风格',
  };

  let prompt = `你是一位专业的写作优化专家，擅长根据用户风格优化文章表达。

优化原则：
1. ${intensityDescriptions[settings.intensity]}
2. 保持文章的核心观点和逻辑结构
3. 确保优化后的内容自然流畅，符合人工写作特征
4. 避免AI痕迹，增加口语化和烟火气`;

  if (style) {
    prompt += `

用户写作风格特征：
- 风格描述：${style.description}
- 语言习惯：${style.languageHabits.formality > 50 ? '正式' : '口语化'}，复杂度${style.languageHabits.complexity}%
- 句式特点：平均句长${style.sentenceStructure.avgLength}字，短句占比${style.sentenceStructure.shortSentenceRatio}%
- 表达方式：${style.expressionStyle.directness > 50 ? '直接' : '间接'}表达，偏好${style.expressionStyle.narrativePerspective === 'first' ? '第一人称' : style.expressionStyle.narrativePerspective === 'second' ? '第二人称' : '第三人称'}叙述
- 词汇偏好：${style.vocabulary.preferredWords.slice(0, 5).join('、')}
- 避免词汇：${style.vocabulary.avoidedWords.slice(0, 5).join('、')}`;
  }

  prompt += `

优化要求：
1. 替换AI痕迹词汇（如"深入探讨"、"至关重要"、"息息相关"等）
2. 打破过于规整的句式和结构
3. 增加口语化衔接词（其实、说到底、话说回来）
4. 加入适度的不确定性和人性化修饰
5. 保持段落间的逻辑连贯性
6. 保留用户的个人表达习惯和语言特征`;

  return prompt;
}

function buildUserPrompt(article: string, settings: OptimizationSettings, style?: WritingStyle): string {
  let prompt = `请优化以下文章`;
  
  if (style) {
    prompt += `，使其符合用户的专属写作风格`;
  }
  
  prompt += `：

${article}

优化强度：${settings.intensity === 'light' ? '轻度' : settings.intensity === 'medium' ? '中度' : '深度'}

请直接输出优化后的文章内容，不要包含其他说明。`;

  return prompt;
}

function getTemperatureByIntensity(intensity: string): number {
  switch (intensity) {
    case 'light':
      return 0.3;
    case 'medium':
      return 0.5;
    case 'deep':
      return 0.7;
    default:
      return 0.5;
  }
}

function analyzeChanges(original: string, optimized: string) {
  const changes = [];
  
  // 简单的变化检测逻辑
  const originalLines = original.split('\n').filter(l => l.trim());
  const optimizedLines = optimized.split('\n').filter(l => l.trim());
  
  // 检测新增、删除和修改的行
  const maxLines = Math.max(originalLines.length, optimizedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const orig = originalLines[i] || '';
    const opt = optimizedLines[i] || '';
    
    if (orig !== opt) {
      changes.push({
        original: orig.slice(0, 100),
        modified: opt.slice(0, 100),
        reason: '表达优化',
        type: 'sentence' as const,
      });
    }
  }
  
  return changes.slice(0, 10); // 限制返回前10个变化
}

function calculateStyleScore(original: string, optimized: string, style?: WritingStyle): number {
  if (!style) return 75; // 默认分数
  
  // 基于风格特征计算匹配度
  let score = 70;
  
  // 检查偏好词汇的使用
  const preferredWordCount = style.vocabulary.preferredWords.filter(word => 
    optimized.includes(word)
  ).length;
  score += Math.min(15, preferredWordCount * 3);
  
  // 检查避免词汇的减少
  const avoidedWordCount = style.vocabulary.avoidedWords.filter(word => 
    optimized.includes(word)
  ).length;
  score -= Math.min(15, avoidedWordCount * 5);
  
  return Math.min(100, Math.max(0, score));
}
