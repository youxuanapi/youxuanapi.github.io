import { NextRequest, NextResponse } from 'next/server';
import type { OriginalityReport, SimilarFragment } from '../../../types/editor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, article } = body;

    if (!apiBaseUrl || !apiKey || !model || !article) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    // 原创性检测提示词
    const systemPrompt = `你是一位专业的原创性检测专家，擅长分析文章的原创度和AI生成概率。

你的任务是：
1. 分析文章的原创性，识别可能的抄袭或重复内容
2. 评估文章的AI生成概率
3. 提供具体的改进建议

输出格式要求（严格JSON格式）：
{
  "score": 85,
  "aiProbability": 15,
  "similarFragments": [
    {
      "text": "可疑文本片段",
      "similarity": 0.85,
      "source": "可能的来源（如不确定可为空）",
      "startIndex": 100,
      "endIndex": 150
    }
  ],
  "suggestions": [
    "改进建议1",
    "改进建议2"
  ],
  "analysis": {
    "uniqueness": "内容独特性分析",
    "expression": "表达方式分析",
    "structure": "结构创新性分析"
  }
}

评分标准：
- 90-100分：高度原创，无明显问题
- 80-89分：较为原创， minor issues
- 70-79分：一般原创度，需要改进
- 60-69分：原创度较低，需要大幅修改
- <60分：原创度严重不足`;

    const userPrompt = `请对以下文章进行原创性检测分析：

${article}

请输出JSON格式的检测报告。`;

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
        temperature: 0.3,
        max_tokens: 2000,
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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: 'API 返回内容为空' },
        { status: 500 }
      );
    }

    // 解析JSON响应
    let report: OriginalityReport;
    try {
      report = JSON.parse(content);
    } catch {
      // 尝试从markdown代码块中提取
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('无法解析JSON响应');
      }
    }

    // 确保所有必需字段存在
    report = {
      ...report,
      score: report.score ?? 75,
      aiProbability: report.aiProbability ?? 20,
      similarFragments: report.similarFragments ?? [],
      suggestions: report.suggestions ?? [],
    };

    return NextResponse.json({
      success: true,
      report,
    });

  } catch (error) {
    console.error('原创性检测失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '原创性检测失败' },
      { status: 500 }
    );
  }
}
