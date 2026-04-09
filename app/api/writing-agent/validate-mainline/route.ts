import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, coreValueLine, section, previousContent, apiBaseUrl, apiKey, model } = body;

    if (!text) {
      return NextResponse.json({ error: '请提供待校验文本' }, { status: 400 });
    }

    if (!coreValueLine || !section) {
      return NextResponse.json({ error: '请提供核心价值主线和段落大纲要求' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const validationResult = await validateMainLine(text, coreValueLine, section, previousContent, apiBaseUrl, apiKey, model);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('核心主线校验失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '核心主线校验失败' },
      { status: 500 }
    );
  }
}

async function validateMainLine(
  text: string,
  coreValueLine: string,
  section: Record<string, unknown>,
  previousContent: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `你是文章核心主线校验专家。请校验文本是否符合大纲要求、是否呼应核心价值主线、是否与前文自然衔接。

【硬阈值规则（绝对不可突破）】
1.  核心关键点覆盖率必须达到100%，任意关键点缺失，直接判定为不通过
2.  总分必须≥90分，否则直接判定为不通过
3.  未呼应核心价值主线，直接判定为不通过
4.  与前文衔接断裂，直接判定为不通过

【输出要求】
1.  必须严格按照指定的JSON格式输出，禁止增减字段、禁止修改字段名
2.  所有分数必须在0-100分之间
3.  每个问题必须精准定位：类型、严重程度、问题描述、起止位置、原文片段、可执行的修改建议
4.  禁止输出任何JSON之外的内容，禁止添加解释、说明、备注`;

  const userPrompt = `请基于以下信息，完成文本的核心主线一致性校验。

【全文核心价值主线】${coreValueLine}

【当前段落大纲要求】${JSON.stringify(section, null, 2)}

【前文回顾】${previousContent}

【待校验文本】${text}

请严格按照指定格式输出JSON内容，禁止任何额外输出。`;

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`核心主线校验请求失败: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const result = JSON.parse(content);

  const totalScore = result.totalScore || 0;
  const keyPointCoverage = result.keyPointCoverage || 0;
  const mainLineRelevanceScore = result.mainLineRelevanceScore || 0;
  const contextConnectionScore = result.contextConnectionScore || 0;
  const isPass = totalScore >= 90 && keyPointCoverage >= 100;

  return {
    totalScore,
    keyPointCoverage,
    mainLineRelevanceScore,
    contextConnectionScore,
    isPass,
    issues: result.issues || [],
    modifyRule: result.modifyRule || '',
  };
}
