import { NextRequest, NextResponse } from 'next/server';
import type { WritingPersonaV2 } from '../../../types/writing-agent-v2';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { samples, apiBaseUrl, apiKey, model, userId, trackType } = body;

    if (!samples || samples.length < 1) {
      return NextResponse.json({ error: '请提供至少1篇原创样本' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const styleAnalysis = await analyzeWritingStyle(samples, apiBaseUrl, apiKey, model, trackType || '情感文');
    const persona = buildPersonaFromAnalysis(styleAnalysis, userId || 'current-user', trackType || '情感文');

    return NextResponse.json({
      persona,
      analysis: styleAnalysis,
    });
  } catch (error) {
    console.error('人格创建失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '人格创建失败' },
      { status: 500 }
    );
  }
}

async function analyzeWritingStyle(
  samples: string[],
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  trackType: string
): Promise<Record<string, unknown>> {
  try {
    const systemPrompt = `你是全球顶级的写作风格逆向工程专家，擅长从用户原创样本中，提取可1:1复刻的完整写作人格特征，包括用户固有的真人写作习惯与原生瑕疵，特别是从多篇样本中提炼通用不变的固定写作范式。
你的核心任务是：把用户提供的原创文本样本，拆解为「可量化、可校验、可直接落地执行」的完整写作人格包，特别强调从多篇样本中提炼所有样本通用、固定、不变的特征，单篇样本独有的、非通用的特征仅作为补充，不纳入核心强制约束规则。
核心原则：通用固定范式 > 单篇独有特征，通用范式是用户个人写作风格的核心护城河，必须100%锁定。

【必须100%提取的特征维度，缺一不可】
---
### 一、多篇样本通用范式提取（这是最核心的优化点，优先于所有其他维度）
1.  **通用结构范式提取**：从所有样本中，提取通用、固定、不变的全文结构、模块内部结构、排版规则、核心观点递进逻辑
2.  **通用叙事范式提取**：从所有样本中，提取通用、固定、不变的核心人设、叙事核心、共情逻辑、人称使用规则、对话姿态
3.  **通用表达规则提取**：从所有样本中，提取通用、固定、不变的句长规则、段落规则、无效表达禁止规则、金句使用规则、名人名言使用规则
4.  **必须输出「用户核心写作范式说明书」**：用可执行的规则描述用户的固定写作逻辑，而不是只有零散的数字指标

### 二、可量化基础行文特征（所有数字必须精准统计，误差不超过5%）
1.  平均句长：样本中所有句子的平均字数，精确到个位
2.  句长波动范围：样本中句子字数的最小值、最大值，精确到个位
3.  句长突变频率：样本中长句后接3字以内短句的出现频率，百分比精确到个位
4.  平均段落长度：样本中所有段落的平均句子数量，精确到个位
5.  段落长度波动范围：样本中段落句子数量的最小值、最大值，精确到个位
6.  单句成段占比：单句成段的段落数/总段落数，用百分比表示，精确到个位
7.  标点使用频率：每100字中，逗号、句号、问号、感叹号、破折号、括号的出现次数，精确到个位
8.  换行节奏：每多少字出现一次段落换行，平均换行字数，精确到个位
9.  中文虚词使用频率（朱雀AI检测核心）：每100字中，的、了、着、过、语气词（吧、吗、呢、啊）的出现次数，以及虚词使用方差，精确到个位

### 三、可量化风格维度指标（0-100分，必须精准匹配样本）
1.  formality：正式程度，0=极致口语化，100=极致书面化
2.  complexity：内容复杂程度，0=极简大白话，100=极致专业深度
3.  emotionDensity：情感密度，0=完全理性无情绪，100=极致情绪表达
4.  directness：表达直接程度，0=极致委婉铺垫，100=极致直白输出
5.  dialogueSense：用户对话感，0=单向说教，100=面对面和读者聊天
6.  oralLevel：口语化程度，0=完全书面语，100=极致口语化表达
7.  naturalFlawRate：自然瑕疵率，0=完全严谨无瑕疵，100=大量口语化即兴表达
8.  storyTendency：故事化叙事占比，0=完全干货说理，100=完全故事化表达
9.  thinkingJumpFrequency：思维跳跃频率，0=完全线性逻辑，100=高频话题跳转
10. semanticJumpFrequency：语义跳跃频率，0=完全线性衔接，100=高频语义跳跃

### 四、词汇表达专属特征（必须100%从样本中提取，禁止编造）
1.  favoriteWords：用户高频使用的专属口头禅、偏好词、固定表达，至少提取15个
2.  avoidedWords：用户绝对不会使用的禁用词、AI高频套话、网络烂梗，至少提取10个
3.  transitionWords：用户高频使用的段落/句子衔接词、过渡范式，至少提取8个
4.  sentencePatterns：用户高频使用的固定句式、开头结尾范式、设问/反问句式，至少提取6个
5.  metaphorPatterns：用户高频使用的固定比喻、类比范式，至少提取3个
6.  modalParticleHabits：用户高频使用的句末语气词、停顿词习惯
7.  aiHighFrequencyBanList：用户样本中绝对未出现的AI高频生成套话，至少提取20个

### 五、逻辑结构与叙事特征（必须100%从样本中提取，禁止编造）
1.  articleStructurePreference：用户偏好的文章整体结构范式，必须精准描述
2.  paragraphConnectionMode：用户偏好的段落衔接方式，必须精准描述（含是否允许无过渡硬切）
3.  argumentHabits：用户偏好的论证方式，必须精准描述
4.  openingParadigm：用户偏好的文章开头范式，必须精准描述
5.  endingParadigm：用户偏好的文章结尾范式，必须精准描述
6.  coreValueOutputMode：用户偏好的核心价值输出方式，必须精准描述
7.  paragraphEndingHabits：用户偏好的段落结尾范式，必须明确是否有固定规律（如每段设问结尾）

### 六、思维认知与情绪特征（必须100%从样本中提取，禁止编造）
1.  viewTendency：用户核心观点倾向，必须精准描述
2.  perspectivePreference：用户固定叙事视角，必须明确「first|second|third」，禁止模糊
3.  emotionScale：用户情绪表达尺度，必须精准描述（含是否有情绪突变、沉默留白）
4.  userStanding：用户和读者的关系定位，必须精准描述
5.  coreCognition：用户样本中反复出现的核心认知、底层价值观，至少提取3条
6.  emotionCurveHabits：用户样本中的情绪曲线规律，必须精准描述（平滑过渡/突发爆发/突然沉默）

### 七、真人原生瑕疵特征库（必须100%从样本中提取，禁止编造，核心用于过AI检测）
1.  naturalFlawTypes：用户样本中出现的自然瑕疵类型，如「口语化重复、思维跳跃、短句留白、戛然而止、话题跳转、即兴补充」
2.  flawFrequency：用户样本中自然瑕疵的出现频率，百分比精确到个位
3.  flawScenes：用户样本中自然瑕疵的出现场景，如「情绪激动时、话题过渡时、结尾留白时」

### 八、反AI豁免清单（必须100%从样本中提取，禁止编造，校验环节自动生效）
1.  exemptSentencePatterns：用户固有的高频句式，即使重复出现也不判定为AI特征，至少提取3个
2.  exemptStructurePatterns：用户固有的段落结构模式，即使重复出现也不判定为AI特征
3.  exemptEndingHabits：用户固有的段落结尾习惯，即使有规律也不判定为AI特征

### 九、生成环节强制约束规则（必须基于以上特征，生成可直接复制到生成prompt的文本化规则，每条规则必须可执行、可校验）
1.  句长约束规则：必须明确平均句长、波动范围、句长突变要求
2.  段落约束规则：必须明确平均段落句子数、单句成段占比、换行节奏
3.  词汇约束规则：必须明确必须使用的偏好词、绝对禁止使用的禁用词+AI高频套话
4.  叙事约束规则：必须明确叙事视角、和读者的关系定位、核心叙事范式
5.  结构约束规则：必须明确文章结构偏好、段落衔接方式、开头结尾范式
6.  真人化约束规则：必须明确自然瑕疵类型、出现频率、注入场景，完全匹配用户原生习惯
7.  豁免规则：必须明确校验环节自动豁免的用户固有写作习惯
8.  中文虚词约束规则（朱雀AI检测核心）：必须明确的、了、着、过、语气词的使用频率要求

### 十、独家原创素材库（必须100%从样本中提取，禁止编造）
1.  exclusiveCases：从样本中提取的用户专属个人案例，至少3个
2.  coreViewpoints：从样本中提取的用户专属核心观点，至少5个
3.  sceneDetails：从样本中提取的用户高频场景细节，至少5个

### 十一、固定写作范式专属字段（这是本次重构的核心新增字段）
请输出以下三个专属字段，这是所有样本通用的、固定的、不变的底层写作范式，作为后续所有环节的唯一模板：

fixedStructureParadigm: {
  "fullTextStructure": "精准描述用户全文固定结构，比如：开头核心结论→过渡段抛出3个判断标准→3个平行递进模块（▼+01/02/03.分隔）→结尾三段式闭环",
  "moduleInnerStructure": "精准描述每个模块的固定内部结构，比如：模块编号单独成段→核心观点金句→金句佐证→第二人称逻辑拆解→极简案例→模块收尾闭环",
  "typesettingRules": "精准描述排版规则，比如：用「▼」作为模块分隔符，「01.」作为模块编号，大量单句成段，最长段落不超过5句话",
  "viewProgressiveRule": "精准描述核心观点的递进逻辑，比如：3个模块从表层相处→中层行动→底层未来，层层递进"
}

fixedNarrativeParadigm: {
  "corePersona": "用户固定核心人设，比如：清醒通透、温柔克制的情感人生导师",
  "narrativeCore": "用户固定叙事核心，比如：第二人称「你」贯穿全文，全程以读者为核心",
  "empathyLogic": "用户固定共情逻辑，比如：先戳读者群体痛点→给结论→拆逻辑→案例佐证→情绪安抚",
  "firstPersonRule": "用户第一人称使用规则，比如：仅用于极简案例佐证，单案例不超过2句话，绝对不允许大段个人故事",
  "dialoguePosture": "用户固定对话姿态，比如：和读者平等对话，引导式输出，不吐槽、不宣泄、不说教"
}

fixedExpressionRules: {
  "avgSentenceLength": 数字,
  "maxParagraphSentenceCount": 数字,
  "invalidExpressionBan": ["同一句话重复多次", "大段流水账叙事", "无意义情绪宣泄", "..."],
  "goldenSentenceRule": "用户金句使用规则，比如：每个模块开头必须用短句金句抛出核心观点",
  "quoteRule": "用户名人名言使用规则，比如：每篇仅用1-2次，仅用于核心观点佐证"
}
---

【输出要求】
1.  必须严格按照指定的JSON格式输出，禁止增减字段、禁止修改字段名
2.  所有特征必须100%来自用户提供的样本，禁止编造、禁止主观臆断
3.  「通用固定范式」必须优先于所有其他维度，这是用户个人写作风格的核心护城河
4.  「生成强制约束规则」必须可直接落地，每条规则都能被校验、被执行
5.  必须包含fixedStructureParadigm、fixedNarrativeParadigm、fixedExpressionRules三个专属字段
6.  禁止输出任何JSON之外的内容，禁止添加解释、说明、备注`;

    const userPrompt = `请基于以下${samples.length}篇用户原创文本样本，提取完整的写作人格特征，特别注意从所有样本中提炼通用、固定、不变的底层写作范式，严格遵守System Prompt的所有要求。

【用户原创样本】
${samples.map((s, i) => `【样本${i + 1}】\n${s}`).join('\n\n')}

【用户选定文章赛道】${trackType}

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
        max_tokens: 10000,
      }),
    });

    if (!response.ok) {
      throw new Error(`风格分析请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('风格分析失败:', error);
    return getDefaultPersonaAnalysis();
  }
}

function buildPersonaFromAnalysis(
  analysis: Record<string, unknown>,
  userId: string,
  trackType: string
): WritingPersonaV2 {
  const now = new Date();
  const nowISO = now.toISOString();
  const timestamp = now.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return {
    id: generateId(),
    userId,
    name: (analysis.name as string) || `专属写作人格 (${timestamp})`,
    description: (analysis.description as string) || '基于样本分析生成',
    trackType,
    
    quantitativeFeatures: {
      avgSentenceLength: (analysis.quantitativeFeatures as any)?.avgSentenceLength || 20,
      sentenceLengthMin: (analysis.quantitativeFeatures as any)?.sentenceLengthMin || 8,
      sentenceLengthMax: (analysis.quantitativeFeatures as any)?.sentenceLengthMax || 35,
      sentenceJumpFrequency: (analysis.quantitativeFeatures as any)?.sentenceJumpFrequency || 5,
      avgParagraphSentenceCount: (analysis.quantitativeFeatures as any)?.avgParagraphSentenceCount || 4,
      paragraphSentenceMin: (analysis.quantitativeFeatures as any)?.paragraphSentenceMin || 1,
      paragraphSentenceMax: (analysis.quantitativeFeatures as any)?.paragraphSentenceMax || 8,
      singleSentenceParagraphRatio: (analysis.quantitativeFeatures as any)?.singleSentenceParagraphRatio || 10,
      avgLineBreakWordCount: (analysis.quantitativeFeatures as any)?.avgLineBreakWordCount || 80,
      commaFrequencyPer100Words: (analysis.quantitativeFeatures as any)?.commaFrequencyPer100Words || 8,
      periodFrequencyPer100Words: (analysis.quantitativeFeatures as any)?.periodFrequencyPer100Words || 4,
      questionMarkFrequencyPer100Words: (analysis.quantitativeFeatures as any)?.questionMarkFrequencyPer100Words || 1,
      exclamationMarkFrequencyPer100Words: (analysis.quantitativeFeatures as any)?.exclamationMarkFrequencyPer100Words || 0,
      functionWordFrequency: {
        dePer100Words: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.dePer100Words || 6,
        lePer100Words: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.lePer100Words || 2,
        zhePer100Words: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.zhePer100Words || 1,
        guoPer100Words: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.guoPer100Words || 0,
        modalParticlePer100Words: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.modalParticlePer100Words || 1,
        functionWordVariance: (analysis.quantitativeFeatures as any)?.functionWordFrequency?.functionWordVariance || 3,
      },
    },

    styleMetrics: {
      formality: (analysis.styleMetrics as any)?.formality || 50,
      complexity: (analysis.styleMetrics as any)?.complexity || 50,
      emotionDensity: (analysis.styleMetrics as any)?.emotionDensity || 50,
      directness: (analysis.styleMetrics as any)?.directness || 50,
      dialogueSense: (analysis.styleMetrics as any)?.dialogueSense || 50,
      oralLevel: (analysis.styleMetrics as any)?.oralLevel || 30,
      naturalFlawRate: (analysis.styleMetrics as any)?.naturalFlawRate || 10,
      storyTendency: (analysis.styleMetrics as any)?.storyTendency || 50,
      thinkingJumpFrequency: (analysis.styleMetrics as any)?.thinkingJumpFrequency || 5,
      semanticJumpFrequency: (analysis.styleMetrics as any)?.semanticJumpFrequency || 5,
    },

    vocabularyFeatures: {
      favoriteWords: (analysis.vocabularyFeatures as any)?.favoriteWords || ['但是', '不过', '其实', '因为', '所以'],
      avoidedWords: (analysis.vocabularyFeatures as any)?.avoidedWords || ['综上所述', '由此可见', '一言以蔽之'],
      transitionWords: (analysis.vocabularyFeatures as any)?.transitionWords || ['但是', '不过', '其实', '然而'],
      sentencePatterns: (analysis.vocabularyFeatures as any)?.sentencePatterns || ['你有没有发现...', '其实...', '我之前...'],
      metaphorPatterns: (analysis.vocabularyFeatures as any)?.metaphorPatterns || ['就像...', '好比...'],
      modalParticleHabits: (analysis.vocabularyFeatures as any)?.modalParticleHabits || ['吧', '呢', '啊'],
      aiHighFrequencyBanList: (analysis.vocabularyFeatures as any)?.aiHighFrequencyBanList || ['综上所述', '总而言之', '家人们谁懂啊', '首先', '其次', '最后'],
    },

    narrativeFeatures: {
      articleStructurePreference: (analysis.narrativeFeatures as any)?.articleStructurePreference || '场景钩子→共情承接→问题拆解→解决方案→价值升华',
      paragraphConnectionMode: (analysis.narrativeFeatures as any)?.paragraphConnectionMode || '设问过渡、情绪承接',
      argumentHabits: (analysis.narrativeFeatures as any)?.argumentHabits || '个人案例优先、层层递进',
      openingParadigm: (analysis.narrativeFeatures as any)?.openingParadigm || '个人亲身场景切入',
      endingParadigm: (analysis.narrativeFeatures as any)?.endingParadigm || '情绪共鸣收尾+行动指引',
      coreValueOutputMode: (analysis.narrativeFeatures as any)?.coreValueOutputMode || '干货步骤+情绪安抚',
      paragraphEndingHabits: (analysis.narrativeFeatures as any)?.paragraphEndingHabits || '自然收尾，无固定规律',
    },

    cognitionFeatures: {
      viewTendency: (analysis.cognitionFeatures as any)?.viewTendency || '实用主义、温和理性',
      perspectivePreference: ((analysis.cognitionFeatures as any)?.perspectivePreference || 'second') as 'first' | 'second' | 'third',
      emotionScale: (analysis.cognitionFeatures as any)?.emotionScale || '克制内敛',
      userStanding: (analysis.cognitionFeatures as any)?.userStanding || '过来人',
      coreCognition: (analysis.cognitionFeatures as any)?.coreCognition || ['实践出真知', '授人以鱼不如授人以渔'],
      emotionCurveHabits: (analysis.cognitionFeatures as any)?.emotionCurveHabits || '平滑过渡',
    },

    naturalFlawLibrary: {
      flawTypes: (analysis.naturalFlawLibrary as any)?.flawTypes || ['口语化重复', '思维跳跃', '短句留白'],
      flawFrequency: (analysis.naturalFlawLibrary as any)?.flawFrequency || 10,
      flawScenes: (analysis.naturalFlawLibrary as any)?.flawScenes || ['情绪激动时', '话题过渡时'],
    },

    antiAiExemptList: {
      exemptSentencePatterns: (analysis.antiAiExemptList as any)?.exemptSentencePatterns || ['你有没有发现...', '其实...'],
      exemptStructurePatterns: (analysis.antiAiExemptList as any)?.exemptStructurePatterns || ['个人案例+观点'],
      exemptEndingHabits: (analysis.antiAiExemptList as any)?.exemptEndingHabits || ['自然收尾'],
    },

    generationRules: {
      sentenceLengthRule: (analysis.generationRules as any)?.sentenceLengthRule || '平均句长必须控制在20字左右，句长波动范围必须在8-35字之间，每段至少包含1处句长突变',
      paragraphRule: (analysis.generationRules as any)?.paragraphRule || '每个段落平均3-5句话，单句成段占比不超过15%',
      vocabularyRule: (analysis.generationRules as any)?.vocabularyRule || '必须优先使用偏好词列表中的表达，绝对禁止使用禁用词列表和AI高频套话列表中的任何内容',
      narrativeRule: (analysis.generationRules as any)?.narrativeRule || '必须全程使用第一人称叙事，以过来人的身份和读者对话',
      structureRule: (analysis.generationRules as any)?.structureRule || '必须用个人亲身场景切入开头，段落之间用自然方式过渡',
      realismRule: (analysis.generationRules as any)?.realismRule || '允许出现符合语境的口语化重复、即兴补充、短句留白，自然瑕疵率控制在10%左右',
      exemptRule: (analysis.generationRules as any)?.exemptRule || '用户固有的高频句式、结构、结尾习惯，即使符合疑似AI特征，也必须严格保留',
    },

    exclusiveLibrary: {
      exclusiveCases: (analysis.exclusiveLibrary as any)?.exclusiveCases || ['用户亲身经历案例1', '用户亲身经历案例2', '用户亲身经历案例3'],
      coreViewpoints: (analysis.exclusiveLibrary as any)?.coreViewpoints || ['核心观点1', '核心观点2', '核心观点3', '核心观点4', '核心观点5'],
      sceneDetails: (analysis.exclusiveLibrary as any)?.sceneDetails || ['场景细节1', '场景细节2', '场景细节3', '场景细节4', '场景细节5'],
    },

    fixedStructureParadigm: {
      fullTextStructure: (analysis.fixedStructureParadigm as any)?.fullTextStructure || '开头核心结论→过渡段抛出3个判断标准→3个平行递进模块→结尾三段式闭环',
      moduleInnerStructure: (analysis.fixedStructureParadigm as any)?.moduleInnerStructure || '模块编号单独成段→核心观点金句→金句佐证→第二人称逻辑拆解→极简案例→模块收尾闭环',
      typesettingRules: (analysis.fixedStructureParadigm as any)?.typesettingRules || '清晰的模块划分，清晰的逻辑递进',
      viewProgressiveRule: (analysis.fixedStructureParadigm as any)?.viewProgressiveRule || '从表层→中层→底层，层层递进',
    },

    fixedNarrativeParadigm: {
      corePersona: (analysis.fixedNarrativeParadigm as any)?.corePersona || '清醒通透、温柔克制的情感人生导师',
      narrativeCore: (analysis.fixedNarrativeParadigm as any)?.narrativeCore || '第二人称「你」贯穿全文，全程以读者为核心',
      empathyLogic: (analysis.fixedNarrativeParadigm as any)?.empathyLogic || '先戳读者群体痛点→给结论→拆逻辑→案例佐证→情绪安抚',
      firstPersonRule: (analysis.fixedNarrativeParadigm as any)?.firstPersonRule || '仅用于极简案例佐证，单案例不超过2句话',
      dialoguePosture: (analysis.fixedNarrativeParadigm as any)?.dialoguePosture || '和读者平等对话，引导式输出',
    },

    fixedExpressionRules: {
      avgSentenceLength: (analysis.fixedExpressionRules as any)?.avgSentenceLength || 12,
      maxParagraphSentenceCount: (analysis.fixedExpressionRules as any)?.maxParagraphSentenceCount || 5,
      invalidExpressionBan: (analysis.fixedExpressionRules as any)?.invalidExpressionBan || ['同一句话重复多次', '大段流水账叙事', '无意义情绪宣泄'],
      goldenSentenceRule: (analysis.fixedExpressionRules as any)?.goldenSentenceRule || '每个模块开头必须用短句金句抛出核心观点',
      quoteRule: (analysis.fixedExpressionRules as any)?.quoteRule || '每篇仅用1-2次，仅用于核心观点佐证',
    },

    createdAt: nowISO,
    updatedAt: nowISO,
  };
}

function getDefaultPersonaAnalysis(): Record<string, unknown> {
  return {
    name: '默认人格',
    description: '基于样本分析生成',
    trackType: '情感文',
    quantitativeFeatures: {
      avgSentenceLength: 12,
      sentenceLengthMin: 5,
      sentenceLengthMax: 20,
      sentenceJumpFrequency: 15,
      avgParagraphSentenceCount: 2,
      paragraphSentenceMin: 1,
      paragraphSentenceMax: 5,
      singleSentenceParagraphRatio: 40,
      avgLineBreakWordCount: 40,
      commaFrequencyPer100Words: 5,
      periodFrequencyPer100Words: 6,
      questionMarkFrequencyPer100Words: 2,
      exclamationMarkFrequencyPer100Words: 1,
      functionWordFrequency: {
        dePer100Words: 4,
        lePer100Words: 1,
        zhePer100Words: 0,
        guoPer100Words: 0,
        modalParticlePer100Words: 0,
        functionWordVariance: 2,
      },
    },
    styleMetrics: {
      formality: 30,
      complexity: 30,
      emotionDensity: 70,
      directness: 85,
      dialogueSense: 90,
      oralLevel: 75,
      naturalFlawRate: 20,
      storyTendency: 30,
      thinkingJumpFrequency: 15,
      semanticJumpFrequency: 10,
    },
    vocabularyFeatures: {
      favoriteWords: ['你', '一定要记住', '始终', '从来', '真正的', '就看', '本质是', '其实', '但是'],
      avoidedWords: ['综上所述', '由此可见', '一言以蔽之', '家人们谁懂啊'],
      transitionWords: ['其实', '但是', '不过', '然而'],
      sentencePatterns: ['你有没有发现...', '其实...', '就看...'],
      metaphorPatterns: ['就像...', '好比...'],
      modalParticleHabits: ['吧', '呢', '啊'],
      aiHighFrequencyBanList: ['综上所述', '总而言之', '家人们谁懂啊', '首先', '其次', '最后'],
    },
    narrativeFeatures: {
      articleStructurePreference: '开头核心结论→过渡段抛出3个判断标准→3个平行递进模块→结尾三段式闭环',
      paragraphConnectionMode: '清晰的模块划分，清晰的逻辑递进',
      argumentHabits: '观点先行，案例服务于观点',
      openingParadigm: '开门见山直接抛出核心金句结论',
      endingParadigm: '三段式固定闭环：回扣开头→浓缩标准→情绪祝福',
      coreValueOutputMode: '戳痛点→给结论→拆逻辑→给方法→情绪安抚',
      paragraphEndingHabits: '每个模块有明确的收尾',
    },
    cognitionFeatures: {
      viewTendency: '实用主义、温和理性',
      perspectivePreference: 'second',
      emotionScale: '克制内敛，有温度但不情绪化',
      userStanding: '情感人生导师',
      coreCognition: ['价值对等', '感受就是答案', '行动胜于言语'],
      emotionCurveHabits: '清晰的情绪递进',
    },
    naturalFlawLibrary: {
      flawTypes: ['口语化重复', '思维跳跃', '短句留白', '即兴补充'],
      flawFrequency: 15,
      flawScenes: ['观点强调时', '话题过渡时', '结尾留白时'],
    },
    antiAiExemptList: {
      exemptSentencePatterns: ['你一定要记住...', '其实...', '就看...'],
      exemptStructurePatterns: ['模块编号单独成段→核心观点金句→逻辑拆解→极简案例→模块收尾'],
      exemptEndingHabits: ['每个模块有明确的收尾'],
    },
    generationRules: {
      sentenceLengthRule: '平均句长必须控制在12字左右，句长波动范围必须在5-20字之间，极致短句',
      paragraphRule: '大量单句成段，最长段落不超过5句话，每一个核心信息点单独成段',
      vocabularyRule: '必须优先使用「你、一定要记住、始终、从来、真正的、就看、本质是」等对话引导词，绝对禁止使用禁用词列表和AI高频套话列表中的任何内容',
      narrativeRule: '必须全程使用第二人称「你」叙事，以情感人生导师的身份和读者平等对话',
      structureRule: '必须严格遵循固定结构范式：开头抛结论→过渡抛3个标准→3个平行递进模块→结尾三段式闭环',
      realismRule: '允许出现符合语境的口语化重复、即兴补充、短句留白，自然瑕疵率控制在15%左右',
      exemptRule: '用户固有的高频句式、结构、结尾习惯，即使符合疑似AI特征，也必须严格保留',
    },
    exclusiveLibrary: {
      exclusiveCases: ['用户专属案例1', '用户专属案例2', '用户专属案例3'],
      coreViewpoints: ['核心观点1', '核心观点2', '核心观点3', '核心观点4', '核心观点5'],
      sceneDetails: ['场景细节1', '场景细节2', '场景细节3', '场景细节4', '场景细节5'],
    },
    fixedStructureParadigm: {
      fullTextStructure: '开头核心结论→过渡段抛出3个判断标准→3个平行递进模块（▼+01/02/03.分隔）→结尾三段式闭环',
      moduleInnerStructure: '模块编号单独成段→核心观点金句→金句佐证→第二人称逻辑拆解→极简案例→模块收尾闭环',
      typesettingRules: '用「▼」作为模块分隔符，「01.」作为模块编号，大量单句成段，最长段落不超过5句话',
      viewProgressiveRule: '3个模块从表层→中层→底层，层层递进',
    },
    fixedNarrativeParadigm: {
      corePersona: '清醒通透、温柔克制的情感人生导师',
      narrativeCore: '第二人称「你」贯穿全文，全程以读者为核心',
      empathyLogic: '先戳读者群体痛点→给结论→拆逻辑→案例佐证→情绪安抚',
      firstPersonRule: '仅用于极简案例佐证，单案例不超过2句话，绝对不允许大段个人故事',
      dialoguePosture: '和读者平等对话，引导式输出，不吐槽、不宣泄、不说教',
    },
    fixedExpressionRules: {
      avgSentenceLength: 12,
      maxParagraphSentenceCount: 5,
      invalidExpressionBan: ['同一句话重复多次', '大段流水账叙事', '无意义情绪宣泄'],
      goldenSentenceRule: '每个模块开头必须用短句金句抛出核心观点',
      quoteRule: '每篇仅用1-2次，仅用于核心观点佐证',
    },
  };
}
