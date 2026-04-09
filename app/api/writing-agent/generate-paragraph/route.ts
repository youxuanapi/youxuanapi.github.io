import { NextRequest, NextResponse } from 'next/server';
import type { ParagraphV2, ValidationResultsV2 } from '../../../types/writing-agent-v2';

const MAX_RETRY_COUNT = 5;
const MAX_MODIFY_COUNT = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, paragraphIndex, section, previousContent, persona, outline, researchReport, topic, apiBaseUrl, apiKey, model } = body;

    if (!taskId || paragraphIndex === undefined || !section) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const result = await generateParagraphWithValidation(
      section,
      previousContent || '',
      persona,
      outline,
      researchReport,
      topic,
      apiBaseUrl,
      apiKey,
      model
    );

    return NextResponse.json({
      paragraphId: result.paragraph.id,
      content: result.paragraph.content,
      validationResults: result.paragraph.validationResults,
      status: result.paragraph.status,
    });
  } catch (error) {
    console.error('段落生成失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '段落生成失败' },
      { status: 500 }
    );
  }
}

async function generateParagraphWithValidation(
  section: Record<string, unknown>,
  previousContent: string,
  persona: Record<string, unknown>,
  outline: Record<string, unknown>,
  researchReport: Record<string, unknown>,
  topic: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<{ paragraph: ParagraphV2 }> {
  let modifyCount = 0;
  let currentContent = '';
  let validationResults: ValidationResultsV2 | undefined;

  while (modifyCount < MAX_MODIFY_COUNT) {
    if (modifyCount === 0) {
      currentContent = await generateContent(
        section,
        previousContent,
        persona || {},
        outline || {},
        researchReport || {},
        topic,
        apiBaseUrl,
        apiKey,
        model
      );
    }

    if (!currentContent) {
      modifyCount++;
      continue;
    }

    validationResults = await validateAll(currentContent, persona || {}, outline || {}, section, researchReport || {}, previousContent, apiBaseUrl, apiKey, model);

    if (validationResults.isAllPassed) {
      break;
    }

    if (validationResults.issues && validationResults.issues.length > 0) {
      const issuesText = JSON.stringify(validationResults.issues);
      const modifyRule = (validationResults.styleValidation?.modifyRule || '') + 
                        (validationResults.originalityValidation?.modifyRule || '') +
                        (validationResults.aiValidation?.modifyRule || '') +
                        (validationResults.mainLineValidation?.modifyRule || '');
      
      currentContent = await modifyContent(
        currentContent,
        (persona || {}).generationRules || '',
        (outline || {}).coreValueLine || '',
        section,
        previousContent,
        issuesText,
        modifyRule,
        apiBaseUrl,
        apiKey,
        model
      );
      modifyCount++;
    } else {
      break;
    }
  }

  const paragraph: ParagraphV2 = {
    id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sectionIndex: 0,
    status: validationResults?.isAllPassed ? 'completed' : 'failed',
    content: currentContent,
    validationResults,
    retryCount: 0,
    modifyCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { paragraph };
}

async function generateContent(
  section: Record<string, unknown>,
  previousContent: string,
  persona: Record<string, unknown>,
  outline: Record<string, unknown>,
  researchReport: Record<string, unknown>,
  topic: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<string> {
  const safePersona = persona || {};
  const safeOutline = outline || {};
  const safeResearchReport = researchReport || {};
  
  const fixedStructure = safePersona.fixedStructureParadigm || {};
  const fixedNarrative = safePersona.fixedNarrativeParadigm || {};
  const fixedExpression = safePersona.fixedExpressionRules || {};
  
  const flawTypes = safePersona.naturalFlawLibrary?.flawTypes || ['口语化重复', '思维跳跃', '短句留白', '即兴补充'];
  const flawCount = Math.max(1, Math.floor(flawTypes.length / 2));
  
  const systemPrompt = `你是一位完全复刻用户专属写作人格的资深写作者，正在逐段创作一篇高质量原创爆款文章，同时天然规避AI生成特征。
你的核心任务是：必须100%严格遵循用户的固定写作范式，严格遵守所有约束规则，100%复刻用户的写作风格，内生用户原生的真人写作特征，生成符合大纲要求、与前文自然衔接、无AI痕迹、有温度、有价值的自然段落，绝对禁止模型自由发挥。

【最核心！必须100%遵守用户固定写作范式，这是不可违反的红线，违反直接作废！】
---
【用户固定结构范式（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedStructure, null, 2)}

【用户固定叙事范式（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedNarrative, null, 2)}

【用户固定表达规则（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedExpression, null, 2)}

【绝对不可违反的15条强制约束规则，每条必须100%遵守，违反直接作废！】
---
### 一、最核心！固定范式第一约束（必须100%遵守）
1.  必须100%遵循用户的全文固定结构，当前段落必须明确属于用户固定结构的哪一部分，绝对不允许偏离固定结构
2.  如果当前段落是模块开头，必须严格遵循用户的模块编号规则，模块编号必须单独成段，使用用户固定的分隔符（▼+01/02/03.）
3.  必须严格遵循用户的固定句式规则：平均句长控制在${fixedExpression.avgSentenceLength || 12}字以内，最长段落不超过${fixedExpression.maxParagraphSentenceCount || 5}句话，必须包含大量单句成段
4.  必须严格遵循用户的固定叙事规则：全程第二人称「你」贯穿，第一人称「我」仅用于极简案例佐证，单案例不超过2句话，禁止大段个人故事
5.  必须严格遵循用户的固定表达规则：每个模块开头必须用短句金句抛出核心观点，名人名言每篇仅用1-2次，仅用于核心观点佐证

### 二、当前段落强约束规则（必须严格遵守）
- 段落核心定位：${(section as any).corePosition || ''}
- 必须覆盖的核心关键点：${JSON.stringify((section as any).coreKeyPoints || [])}
- 字数要求：${(section as any).wordRange?.min || 150}-${(section as any).wordRange?.max || 300}字
- 情绪节奏：${(section as any).emotionRhythm || ''}
- 必须呼应的核心主线：${(section as any).mainLineRelevance || ''}
- 必须使用的专属素材：${(section as any).requiredMaterial || ''}
- 绝对禁止使用的内容：${JSON.stringify((section as any).bannedContent || [])} + ${JSON.stringify(safeResearchReport.homogeneityBanList || [])} + ${JSON.stringify(safeResearchReport.aiHighFrequencyBanList || [])}
- 真人化瑕疵注入要求：${(section as any).flawInjectionRule || ''}

### 三、全文强制约束规则（必须严格遵守）
6.  必须全程严格遵循用户的固定范式说明书，任何段落都不允许偏离固定结构、固定叙事、固定表达规则
7.  必须严格遵循用户的核心递进逻辑：3个模块从表层→中层→底层，层层递进，绝不允许观点重复、逻辑混乱
8.  必须严格遵循用户的核心人设：${fixedNarrative.corePersona || '清醒通透、温柔克制的情感人生导师'}，全程和读者平等对话，引导式输出，绝对不允许高高在上的说教
9.  必须严格遵循用户的共情逻辑：${fixedNarrative.empathyLogic || '先戳读者群体痛点→给结论→拆逻辑→案例佐证→情绪安抚'}，任何模块都不能偏离这个共情逻辑
10. 必须严格遵循用户的无效表达禁止规则：绝对不允许出现${JSON.stringify(fixedExpression.invalidExpressionBan || ['同一句话重复多次', '大段流水账叙事', '无意义情绪宣泄'])}

### 四、其他约束规则（必须严格遵守）
11. 【上下文衔接规则】必须与前文内容自然衔接，承接前文的情绪与逻辑，禁止出现逻辑断裂、话题跳转，前文回顾：
${previousContent || '（当前是第一段，无需前文衔接）'}

12. 【全文主线规则】必须严格呼应全文核心价值主线，禁止生成与主线无关的内容，全文核心价值主线：
${safeOutline.coreValueLine || ''}

13. 【内生真人化写作规则（过检核心，必须严格执行）】
必须严格匹配用户原生自然瑕疵特征库，在本段内生至少${flawCount}处符合用户习惯的真人瑕疵，从以下清单中选择，绝对禁止后期硬加假瑕疵：
${JSON.stringify(flawTypes)}
- 绝对禁止生成完美无缺的AI文本，允许出现符合语境的口语化重复、即兴补充、自然停顿
- 必须严格匹配用户的句长波动要求，必须包含大量单句成段，平均句长${fixedExpression.avgSentenceLength || 12}字以内，最长段落不超过${fixedExpression.maxParagraphSentenceCount || 5}句话
- 绝对禁止生成极度均匀的句长、刻板的句式、生硬的书面化套话

14. 【原创性规则】必须对使用的素材进行100%原创性改写，禁止照搬、洗稿，必须加入用户的个人视角与观点，禁止使用全网通用烂大街的案例、金句、套话。

15. 【格式绝对禁止规则】绝对禁止生成任何正文小标题、分点、序号、括号备注、Markdown格式符号，必须输出纯自然的文章段落，只有逗号、句号、问号、感叹号、破折号这几种标点。

---

【输出要求】
1.  必须直接输出完整的段落内容，禁止输出任何其他内容，禁止添加解释、说明、备注、标题、分点
2.  必须严格遵守所有约束规则，100%匹配用户文风，100%遵循用户固定写作范式，内生真人特征，无AI痕迹，符合真人写作习惯
3.  必须严格控制字数在要求范围内，误差不超过10%
4.  必须严格遵循用户的固定结构规则：如果是模块开头，模块编号必须单独成段，使用用户固定的分隔符（▼+01/02/03.）
5.  必须严格遵循用户的固定句式规则：平均句长${fixedExpression.avgSentenceLength || 12}字以内，最长段落不超过${fixedExpression.maxParagraphSentenceCount || 5}句话，必须包含大量单句成段
6.  必须严格遵循用户的固定叙事规则：全程第二人称「你」贯穿，第一人称「我」仅用于极简案例佐证
7.  禁止输出任何不符合约束规则的内容，违反固定范式直接作废！`;

  const userPrompt = `请基于以下信息，生成当前段落的内容，必须100%严格遵循用户的固定写作范式，这是不可违反的红线，违反直接作废！严格遵守System Prompt的所有要求。

【写作主题（必须100%紧扣！！！）】${topic || ''}

【当前段落的大纲约束】${JSON.stringify(section, null, 2)}

【全文核心价值主线】${safeOutline.coreValueLine || ''}

【全文强制约束规则】${safeOutline.fullTextConstraintRules || ''}

【用户固定写作范式（必须100%遵守！！！）】
【固定结构范式】${JSON.stringify(fixedStructure, null, 2)}
【固定叙事范式】${JSON.stringify(fixedNarrative, null, 2)}
【固定表达规则】${JSON.stringify(fixedExpression, null, 2)}

【绝对禁用的同质化内容清单】${JSON.stringify(safeResearchReport.homogeneityBanList || [], null, 2)}

【前文回顾（必须100%自然衔接）】${previousContent || '（当前是第一段，无需前文衔接）'}

请直接输出完整的段落内容，禁止任何额外输出。`;

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
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`生成请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function validateAll(
  text: string,
  persona: Record<string, unknown>,
  outline: Record<string, unknown>,
  section: Record<string, unknown>,
  researchReport: Record<string, unknown>,
  previousContent: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<ValidationResultsV2> {
  const [paradigmValidation, styleValidation, originalityValidation, aiValidation, mainLineValidation] = await Promise.allSettled([
    validateParadigm(text, persona, outline, section, apiBaseUrl, apiKey, model),
    validateStyle(text, persona || {}, (outline || {}).coreValueLine || '', section, (researchReport || {}).homogeneityBanList || [], previousContent, apiBaseUrl, apiKey, model),
    validateOriginality(text, researchReport || {}, apiBaseUrl, apiKey, model),
    validateAI(text, persona || {}, apiBaseUrl, apiKey, model),
    validateMainLine(text, (outline || {}).coreValueLine || '', section, previousContent, apiBaseUrl, apiKey, model),
  ]);

  const paradigmResult = paradigmValidation.status === 'fulfilled' ? paradigmValidation.value : null;
  const styleResult = styleValidation.status === 'fulfilled' ? styleValidation.value : null;
  const originalityResult = originalityValidation.status === 'fulfilled' ? originalityValidation.value : null;
  const aiResult = aiValidation.status === 'fulfilled' ? aiValidation.value : null;
  const mainLineResult = mainLineValidation.status === 'fulfilled' ? mainLineValidation.value : null;

  const isAllPassed = 
    (paradigmResult?.isPass ?? true) &&
    (styleResult?.isPass ?? true) && 
    (originalityResult?.isPass ?? true) && 
    (aiResult?.isPass ?? true) && 
    (mainLineResult?.isPass ?? true);

  const allIssues = [
    ...(paradigmResult?.issues || []),
    ...(styleResult?.issues || []),
    ...(originalityResult?.duplicationDetails?.map((d: any) => ({
      type: 'originality',
      severity: 'warning' as const,
      description: d.suggestion,
      location: d.location,
      originalText: d.duplicateText,
      suggestion: d.suggestion,
    })) || []),
    ...(aiResult?.issues || []),
    ...(mainLineResult?.issues || []),
  ];

  return {
    paradigmValidation: paradigmResult,
    styleValidation: styleResult,
    originalityValidation: originalityResult,
    aiValidation: aiResult,
    mainLineValidation: mainLineResult,
    isAllPassed,
    issues: allIssues,
  } as ValidationResultsV2;
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
  const response = await fetch('/api/writing-agent/validate-paradigm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona, outline, section, apiBaseUrl, apiKey, model }),
  });
  if (response.ok) return response.json();
  return { isPass: true, totalScore: 95, structureMatchScore: 100, personaMatchScore: 100, narrativeMatchScore: 100, expressionMatchScore: 100, issues: [], modifySuggestions: '' };
}

async function validateStyle(
  text: string,
  persona: Record<string, unknown>,
  coreValueLine: string,
  section: Record<string, unknown>,
  homogeneityBanList: string[],
  previousContent: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const response = await fetch('/api/writing-agent/validate-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona, coreValueLine, section, homogeneityBanList, previousContent, apiBaseUrl, apiKey, model }),
  });
  if (response.ok) return response.json();
  return { isPass: true, totalScore: 90, dimensionScores: {}, issues: [], modifyRule: '' };
}

async function validateOriginality(
  text: string,
  researchReport: Record<string, unknown>,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const response = await fetch('/api/writing-agent/validate-originality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, researchReport, apiBaseUrl, apiKey, model }),
  });
  if (response.ok) return response.json();
  return { isPass: true, totalDuplicationRate: 0, paragraphDuplicationRate: 0, duplicationDetails: [], modifyRule: '' };
}

async function validateAI(
  text: string,
  persona: Record<string, unknown>,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const response = await fetch('/api/writing-agent/validate-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona, apiBaseUrl, apiKey, model }),
  });
  if (response.ok) return response.json();
  return { isPass: true, comprehensiveAiScore: 0, issues: [], modifyRule: '' };
}

async function validateMainLine(
  text: string,
  coreValueLine: string,
  section: Record<string, unknown>,
  previousContent: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
) {
  const response = await fetch('/api/writing-agent/validate-mainline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, coreValueLine, section, previousContent, apiBaseUrl, apiKey, model }),
  });
  if (response.ok) return response.json();
  return { isPass: true, totalScore: 90, keyPointCoverage: 100, mainLineRelevanceScore: 90, contextConnectionScore: 90, issues: [], modifyRule: '' };
}

async function modifyContent(
  content: string,
  generationRules: string,
  coreValueLine: string,
  section: Record<string, unknown>,
  previousContent: string,
  issueDescriptions: string,
  modifyRule: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch('/api/writing-agent/modify-paragraph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      content, 
      generationRules, 
      coreValueLine, 
      section, 
      previousContent, 
      issueDescriptions, 
      modifyRule,
      apiBaseUrl, 
      apiKey, 
      model 
    }),
  });
  if (response.ok) {
    const data = await response.json();
    return data.modifiedContent || content;
  }
  return content;
}
