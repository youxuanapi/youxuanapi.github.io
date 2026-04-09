import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, researchReport, apiBaseUrl, apiKey, model } = body;

    if (!text) {
      return NextResponse.json({ error: '请提供待校验文本' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const validationResult = await validateOriginality(text, researchReport, apiBaseUrl, apiKey, model);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('原创性校验失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '原创性校验失败' },
      { status: 500 }
    );
  }
}

async function validateOriginality(
  text: string,
  researchReport: Record<string, unknown> | null,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `你是全球顶级的原创性查重校验专家，擅长精准识别文本中的非原创内容，定位重复片段，给出可直接落地的原创性改写建议。

【硬阈值规则（绝对不可突破）】
1.  全文重复度超过3%，直接判定为不通过，必须重写
2.  单段落重复度超过5%，直接判定为不通过，必须重写
3.  连续20字以上完全重复，直接判定为不通过，必须原创性改写
4.  连续30字以上语义重复，直接判定为不通过，必须原创性改写

【输出要求】
1.  必须严格按照指定的JSON格式输出，禁止增减字段、禁止修改字段名
2.  全文重复度、段落重复度必须精确到小数点后1位
3.  每个重复片段必须精准定位：原文片段、来源、重复率、起止位置、原创性改写建议
4.  修改规则必须可直接落地，可注入自动修改环节
5.  禁止输出任何JSON之外的内容，禁止添加解释、说明、备注`;

  const userPrompt = `请基于以下信息，完成文本的原创性查重校验，严格遵守System Prompt的所有要求。

【待校验文本】${text}

【竞争对手内容分析（重复比对参考）】${JSON.stringify(researchReport?.competitorAnalysis || [], null, 2)}

【绝对禁用的同质化内容清单】${JSON.stringify(researchReport?.homogeneityBanList || [], null, 2)}

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
    throw new Error(`原创性校验请求失败: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const result = JSON.parse(content);

  const totalDuplicationRate = result.totalDuplicationRate || 0;
  const paragraphDuplicationRate = result.paragraphDuplicationRate || 0;
  const isPass = totalDuplicationRate <= 3 && paragraphDuplicationRate <= 5;

  return {
    totalDuplicationRate,
    paragraphDuplicationRate,
    isPass,
    duplicationDetails: result.duplicationDetails || [],
    modifyRule: result.modifyRule || '',
  };
}
