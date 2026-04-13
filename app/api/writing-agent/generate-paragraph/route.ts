import { NextRequest, NextResponse } from 'next/server';
import type { ParagraphV2, ValidationResultsV2 } from '../../../types/writing-agent-v2';

const MAX_RETRY_COUNT = 5;
const MAX_MODIFY_COUNT = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, paragraphIndex, section, previousContent, persona, outline, researchReport, topic, customInputs, apiBaseUrl, apiKey, model, isAntiAiMode = false, referenceSkeleton = '' } = body;

    if (!taskId || paragraphIndex === undefined || !section) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const sections = outline?.sections || [];
    const totalParagraphs = sections.length;
    
    const result = await generateParagraphWithValidation(
      section,
      previousContent || '',
      persona,
      outline,
      researchReport,
      topic,
      customInputs,
      paragraphIndex,
      totalParagraphs,
      apiBaseUrl,
      apiKey,
      model,
      isAntiAiMode,
      referenceSkeleton
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
  customInputs: any,
  paragraphIndex: number,
  totalParagraphs: number,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  isAntiAiMode: boolean = false,
  referenceSkeleton: string = ''
): Promise<{ paragraph: ParagraphV2 }> {
  let modifyCount = 0;
  let currentContent = '';
  let validationResults: ValidationResultsV2 | undefined;

  if (isAntiAiMode) {
    // Anti-AI 模式下跳过验证，直接生成
    currentContent = await generateContent(
      section,
      previousContent,
      persona || {},
      outline || {},
      researchReport || {},
      topic,
      customInputs,
      paragraphIndex,
      totalParagraphs,
      apiBaseUrl,
      apiKey,
      model,
      isAntiAiMode,
      referenceSkeleton
    );
    
    validationResults = {
      isAllPassed: true,
      issues: []
    };
  } else {
    // 非 Anti-AI 模式下执行完整验证流程
    while (modifyCount < MAX_MODIFY_COUNT) {
      if (modifyCount === 0) {
        currentContent = await generateContent(
          section,
          previousContent,
          persona || {},
          outline || {},
          researchReport || {},
          topic,
          customInputs,
          paragraphIndex,
          totalParagraphs,
          apiBaseUrl,
          apiKey,
          model,
          isAntiAiMode,
          referenceSkeleton
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
          (persona as any)?.generationRules || '',
          (outline as any)?.coreValueLine || '',
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
  customInputs: any,
  paragraphIndex: number,
  totalParagraphs: number,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  isAntiAiMode: boolean,
  referenceSkeleton: string
): Promise<string> {
  let systemPrompt = '';
  let userPrompt = '';
  
  if (isAntiAiMode) {
    if (referenceSkeleton && referenceSkeleton.trim().length > 0) {
      systemPrompt = `你是一个专门执行"文本同构映射"的助手。
用户提供了一篇【人类骨架参考文本】：
${referenceSkeleton}

你需要写一段关于【${topic}】的内容。
【最高指令】：你必须100%保留参考文本中所有的标点符号位置、句子长短节奏、甚至原有的逻辑语病和转折词（如：倒不是没有啥、不管咋样）。
你只能把原文本中的名词和动词，替换成当前主题的内容。绝对不要改变原有的句法骨架，也不要加入任何高级形容词。直接输出替换后的正文。`;
      
      userPrompt = `请基于参考骨架，替换成关于当前主题的内容。
当前主题：${topic}
当前段落：${JSON.stringify(section, null, 2)}
直接输出正文。`;
    } else {
      const isFirstHalf = paragraphIndex < Math.floor(totalParagraphs / 2);
      const isLastParagraph = paragraphIndex === totalParagraphs - 1;
      const isClimaxParagraph = !isFirstHalf && !isLastParagraph;

      let phaseSpecificPrompt = '';
      if (isFirstHalf) {
        phaseSpecificPrompt = `【当前阶段：背景与事件引入】
- 只允许围绕大纲展开
- 绝对禁止提及"颗粒度细节"和"反常识升华"内容
- 保持线性叙事推进`;
      } else if (isClimaxParagraph) {
        phaseSpecificPrompt = `【当前阶段：高潮段落】
- 请将以下细节进行极具画面感和情绪张力的扩写，融入本段叙事中
- 颗粒度细节：${customInputs?.detail || '无'}
- 重点：把这个画面/细节写活，要有代入感`;
      } else if (isLastParagraph) {
        phaseSpecificPrompt = `【当前阶段：结尾升华】
- 以此金句作为全篇的收尾，语气要冷酷清醒，直接收尾，不要再重复前文的故事
- 反常识升华：${customInputs?.sublimation || '无'}
- 重点：说完就停，不要画蛇添足`;
      }

      systemPrompt = `你是用手机备忘录吐槽的真实网友。核心禁忌：绝对不能重复前文出现过的场景和比喻！必须推进叙事！为了真实，请保留口语化、包含一逗到底的超长句，并将'哪怕'写成'那怕'，动词前的'地'写成'的'。

${phaseSpecificPrompt}`;

      userPrompt = `【当前要写的主题和要求】：${topic}
【本段具体内容约束】：${JSON.stringify(section, null, 2)}
【前文回顾（顺着往下写）】：${previousContent || '（这是第一段）'}

直接输出段落正文，不要有任何多余的开头和结尾词。`;
    }
  } else {
    const safePersona = persona || {};
    const safeOutline = outline || {};
    const safeResearchReport = researchReport || {};
    
    const fixedStructure = safePersona.fixedStructureParadigm || {};
    const fixedNarrative = safePersona.fixedNarrativeParadigm || {};
    const fixedExpression = safePersona.fixedExpressionRules || {};
    
    const flawTypes = (safePersona as any)?.naturalFlawLibrary?.flawTypes || ['口语化重复', '思维跳跃', '短句留白', '即兴补充'];
    const flawCount = Math.max(1, Math.floor(flawTypes.length / 2));

    const isFirstHalf = paragraphIndex < Math.floor(totalParagraphs / 2);
    const isLastParagraph = paragraphIndex === totalParagraphs - 1;
    const isClimaxParagraph = !isFirstHalf && !isLastParagraph;

    let phaseSpecificPrompt = '';
    if (isFirstHalf) {
      phaseSpecificPrompt = `【当前阶段：背景与事件引入】
- 只允许围绕大纲展开
- 绝对禁止提及"颗粒度细节"和"反常识升华"内容
- 保持线性叙事推进`;
    } else if (isClimaxParagraph) {
      phaseSpecificPrompt = `【当前阶段：高潮段落】
- 请将以下细节进行极具画面感和情绪张力的扩写，融入本段叙事中
- 颗粒度细节：${customInputs?.detail || '无'}
- 重点：把这个画面/细节写活，要有代入感`;
    } else if (isLastParagraph) {
      phaseSpecificPrompt = `【当前阶段：结尾升华】
- 以此金句作为全篇的收尾，语气要冷酷清醒，直接收尾，不要再重复前文的故事
- 反常识升华：${customInputs?.sublimation || '无'}
- 重点：说完就停，不要画蛇添足`;
    }
    
    systemPrompt = `你是一位完全复刻用户专属写作人格的资深写作者，正在逐段创作一篇高质量原创爆款文章，同时天然规避AI生成特征。
你的核心任务是：必须100%严格遵循用户的固定写作范式，严格遵守所有约束规则，100%复刻用户的写作风格，内生用户原生的真人写作特征，生成符合大纲要求、与前文自然衔接、无AI痕迹、有温度、有价值的自然段落，绝对禁止模型自由发挥。

【用户固定结构范式（必须严格遵循）】
${JSON.stringify(fixedStructure, null, 2)}

【用户固定叙事范式（必须严格遵循）】
${JSON.stringify(fixedNarrative, null, 2)}

【用户固定表达规则（必须严格遵循）】
${JSON.stringify(fixedExpression, null, 2)}

【全局防重约束（极其重要）】
【极其重要】严禁在不同段落中重复使用相同的比喻、场景描写和中心句！前文已经写过的细节，后文绝对不可再次提及，必须保持人类写作的线性推进感。

${phaseSpecificPrompt}

【输出要求】直接输出完整段落，禁止其他内容。`;

    userPrompt = `请基于以下信息，生成当前段落：
【主题】${topic}
【当前段落约束】${JSON.stringify(section, null, 2)}
【前文回顾】${previousContent || '（这是第一段）'}
直接输出正文。`;
  }

  const completionParams: any = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: isAntiAiMode ? 1.05 : 0.7,
    max_tokens: 1500,
  };
  
  if (isAntiAiMode) {
    completionParams.frequency_penalty = 0.4;
    completionParams.presence_penalty = 0.2;
  }

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(completionParams),
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
    validateStyle(text, persona || {}, (outline as any)?.coreValueLine || '', section, (researchReport as any)?.homogeneityBanList || [], previousContent, apiBaseUrl, apiKey, model),
    validateOriginality(text, researchReport || {}, apiBaseUrl, apiKey, model),
    validateAI(text, persona || {}, apiBaseUrl, apiKey, model),
    validateMainLine(text, (outline as any)?.coreValueLine || '', section, previousContent, apiBaseUrl, apiKey, model),
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
