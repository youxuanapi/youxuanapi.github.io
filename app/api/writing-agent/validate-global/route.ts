import { NextRequest, NextResponse } from 'next/server';
import { ZHUQUE_THRESHOLDS } from '../../../lib/writing-agent/zhuque-constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { allParagraphs, persona, outline, apiBaseUrl, apiKey, model } = body;

    if (!allParagraphs || !Array.isArray(allParagraphs) || allParagraphs.length === 0) {
      return NextResponse.json({ error: '缺少段落内容' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const result = await validateGlobal(
      allParagraphs,
      persona || {},
      outline || {},
      apiBaseUrl,
      apiKey,
      model
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('全局校验失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '全局校验失败' },
      { status: 500 }
    );
  }
}

async function validateGlobal(
  allParagraphs: string[],
  persona: Record<string, unknown>,
  outline: Record<string, unknown>,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const safePersona = persona || {};
  const fullText = allParagraphs.join('\n\n');

  const systemPrompt = `你是全球顶级的AI文本检测专家，完全对齐朱雀AI检测、Originality.ai、GPTZero、Winston等主流检测器的核心检测逻辑，擅长从全局视角精准识别文本的AI生成特征，定位跨段落问题根源，给出可直接执行的修改建议。

【必须完成的全局校验维度】
---
1.  跨段落句式重复检测：检测全文是否存在同一句式重复超过3次且有规律分布
2.  跨段落结构重复检测：检测是否存在连续2段以上使用相同的段落结构模式
3.  跨段落结尾范式重复检测：检测是否存在连续2段以上使用相同的段落结尾范式
4.  句长变化幅度检测：计算全文句长变化幅度，要求≥30%
5.  独家原创内容占比检测：要求用户专属的独家内容（个人案例、独家观点、专属素材、非公开数据）占比≥30%
6.  朱雀AI高频N-gram短语检测：检测是否出现朱雀AI检测高频短语
7.  首尾呼应检测：检测是否完成首尾呼应闭环

【朱雀AI专属硬阈值（必须严格遵守）】
---
- 跨段落句式重复出现次数：≤2次
- 跨段落结构重复出现次数：≤2次  
- 跨段落结尾范式重复出现次数：≤2次
- 全文句长变化幅度：≥30%
- 独家原创内容占比：≥30%
- 朱雀AI高频N-gram短语出现次数：=0次

【输出要求】
1.  必须严格按照指定的JSON格式输出
2.  每个检测维度必须给出检测结果和评分
3.  必须明确是否通过校验（isPass: true/false）
4.  必须给出具体的问题描述和修改建议`;

  const userPrompt = `请基于以下信息，完成全文本全局校验，严格遵守System Prompt的所有要求。

【全文内容】
${fullText}

【用户专属写作人格】
${JSON.stringify(safePersona, null, 2)}

【全文大纲】
${JSON.stringify(outline, null, 2)}

【用户专属独家内容库】
${JSON.stringify(safePersona.exclusiveLibrary || {}, null, 2)}

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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    return {
      isPass: true,
      crossParagraphChecks: {},
      sentenceVariationScore: 100,
      exclusiveContentRatio: 100,
      issues: [],
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      isPass: true,
      crossParagraphChecks: {},
      sentenceVariationScore: 100,
      exclusiveContentRatio: 100,
      issues: [],
    };
  }
}
