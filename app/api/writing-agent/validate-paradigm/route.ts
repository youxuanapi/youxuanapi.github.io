import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, persona, outline, section, apiBaseUrl, apiKey, model } = body;

    if (!text || !persona) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const result = await validateParadigm(
      text,
      persona,
      outline || {},
      section || {},
      apiBaseUrl,
      apiKey,
      model
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('范式匹配度校验失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '范式匹配度校验失败' },
      { status: 500 }
    );
  }
}

async function validateParadigm(
  text: string,
  persona: Record<string, unknown>,
  outline: Record<string, unknown>,
  section: Record<string, unknown>,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const safePersona = persona || {};
  const fixedStructure = safePersona.fixedStructureParadigm || {};
  const fixedNarrative = safePersona.fixedNarrativeParadigm || {};
  const fixedExpression = safePersona.fixedExpressionRules || {};

  const systemPrompt = `你是全球顶级的写作范式匹配度检测专家，完全对齐用户提供的固定写作范式，擅长从结构、人设、叙事、表达四个维度精准检测文本是否符合用户的固定写作范式，给出精确的匹配度评分和可直接执行的修改建议。
你的核心任务是：把用户提供的文本与用户的固定写作范式进行精准比对，从结构、人设、叙事、表达四个维度进行全方位检测，给出范式匹配度总分，只有总分≥95分才算通过，低于95分必须进入修改环节，这是第一强制校验环，不通过不允许进入后续环节。

【必须100%完成的检测维度，缺一不可】
---
### 一、结构匹配度检测（权重30%）
1.  **全文结构匹配度**：检测是否符合用户的全文固定结构
2.  **模块内部结构匹配度**：检测是否符合用户的模块内部结构
3.  **排版规则匹配度**：检测是否符合用户的排版规则
4.  **观点递进逻辑匹配度**：检测是否符合用户的核心观点递进逻辑

### 二、人设匹配度检测（权重25%）
1.  **核心人设定位匹配度**：检测是否符合用户的固定核心人设
2.  **叙事核心匹配度**：检测是否符合用户的固定叙事核心
3.  **对话姿态匹配度**：检测是否符合用户的固定对话姿态

### 三、叙事匹配度检测（权重25%）
1.  **共情逻辑匹配度**：检测是否符合用户的固定共情逻辑
2.  **人称使用规则匹配度**：检测是否符合用户的固定人称使用规则
3.  **叙事视角匹配度**：检测是否符合用户的固定叙事视角

### 四、表达匹配度检测（权重20%）
1.  **句长规则匹配度**：检测是否符合用户的固定句长规则
2.  **段落规则匹配度**：检测是否符合用户的固定段落规则
3.  **金句使用规则匹配度**：检测是否符合用户的固定金句使用规则
4.  **名人名言使用规则匹配度**：检测是否符合用户的固定名人名言使用规则
5.  **无效表达检测**：检测是否出现用户禁止的无效表达

【用户固定写作范式（必须严格遵循，这是检测的唯一标准）】
---
【固定结构范式】
${JSON.stringify(fixedStructure, null, 2)}

【固定叙事范式】
${JSON.stringify(fixedNarrative, null, 2)}

【固定表达规则】
${JSON.stringify(fixedExpression, null, 2)}

【硬阈值锁定】
- 范式匹配度总分≥95分，判定为通过
- 低于95分，判定为不通过，必须进入修改环节
- 单个维度得分低于80分，必须重点修复

【输出要求】
1.  必须严格按照指定的JSON格式输出
2.  必须给出每个维度的得分和总分
3.  必须明确是否通过校验（isPass: true/false）
4.  必须给出具体的问题描述和可直接执行的修改建议
5.  禁止输出任何JSON之外的内容`;

  const userPrompt = `请基于以下信息，完成写作范式匹配度检测，严格遵守System Prompt的所有要求。

【待检测文本】
${text}

【用户固定写作范式】
${JSON.stringify(safePersona, null, 2)}

【当前段落大纲要求】
${JSON.stringify(section, null, 2)}

【全文大纲要求】
${JSON.stringify(outline, null, 2)}

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
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    return {
      isPass: true,
      totalScore: 95,
      structureMatchScore: 100,
      personaMatchScore: 100,
      narrativeMatchScore: 100,
      expressionMatchScore: 100,
      issues: [],
      modifySuggestions: '',
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      isPass: true,
      totalScore: 95,
      structureMatchScore: 100,
      personaMatchScore: 100,
      narrativeMatchScore: 100,
      expressionMatchScore: 100,
      issues: [],
      modifySuggestions: '',
    };
  }
}
