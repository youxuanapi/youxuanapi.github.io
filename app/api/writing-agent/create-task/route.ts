import { NextRequest, NextResponse } from 'next/server';
import type { WritingTaskV2, ResearchReportV2, OutlineV2 } from '../../../types/writing-agent-v2';
import { ZHUQUE_HIGH_FREQUENCY_BAN_LIST } from '../../../lib/writing-agent/zhuque-constants';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, requirements, customInputs, apiBaseUrl, apiKey, model, persona, styleData } = body;
    const actualPersona = persona || styleData;

    if (!topic) {
      return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const taskId = generateId();
    const researchReport = await performDeepResearch(topic, requirements, customInputs, apiBaseUrl, apiKey, model, actualPersona);
    const outline = await generateOutlineV2(topic, requirements, customInputs, researchReport, apiBaseUrl, apiKey, model, actualPersona);

    const task: WritingTaskV2 = {
      id: taskId,
      userId: 'current-user',
      status: outline ? 'outline_pending' : 'researching',
      topic,
      requirements: requirements || '',
      persona,
      personaId: persona?.id,
      researchReport,
      outline,
      paragraphs: outline?.sections.map((section, index) => ({
        id: generateId(),
        sectionIndex: index,
        status: 'pending' as const,
        retryCount: 0,
        modifyCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) || [],
      modificationLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      taskId,
      status: task.status,
      outline: task.outline,
      researchReport,
    });
  } catch (error) {
    console.error('任务创建失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '任务创建失败' },
      { status: 500 }
    );
  }
}

async function performDeepResearch(
  topic: string,
  requirements: string,
  customInputs: any,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  persona: Record<string, unknown> | null
): Promise<ResearchReportV2> {
  try {
    const systemPrompt = `你是全球顶级的爆款内容调研专家，擅长挖掘垂直领域的内容蓝海、用户深层情绪痛点、差异化内容角度，同时识别AI训练数据中的高频生成内容，为爆款文章+过AI检测提供100%可落地的调研支撑。
你的核心任务是：基于用户的写作主题、需求、专属写作人格、选定赛道，完成全网竞品内容深度分析，输出可直接落地到文章大纲的调研结果，绝对禁止输出泛化、无用、无法落地的内容。

【必须100%完成的调研维度，缺一不可】
---
### 一、全网竞品内容深度拆解
1.  抓取该主题下，全网Top100高流量/高互动爆款内容，拆解每篇内容的核心信息：
    - 内容来源、标题、核心主题、核心观点、互动数据
    - 内容的核心优势、被用户认可的亮点
    - 内容的核心短板、用户在评论区吐槽的不足、未讲透的问题
2.  统计分析：该主题下全网内容的高频同质化观点、烂大街通用案例、被用烂的叙事结构，形成「同质化内容禁用清单」

### 二、AI高频生成内容识别（过检核心）
1.  抓取该主题下，主流大模型高频生成的套话、固定句式、通用案例、模板化结构
2.  统计分析：该主题下AI生成内容的高频N-gram短语、固定叙事模块、烂大街金句，形成「AI高频内容禁用清单」，至少20条
3.  特别关注：朱雀AI检测高频判定的中文N-gram短语，比如"家人们谁懂啊、总而言之、综上所述、你有没有发现"等

### 三、用户深层痛点挖掘（爆款核心，必须同时覆盖功能痛点+情绪痛点）
1.  功能痛点：用户在该主题下，遇到的实际问题、未被解决的需求、踩过的坑
2.  情绪痛点：用户在该主题下，不被理解的委屈、无处诉说的情绪、内心的矛盾与焦虑
3.  未被满足的需求：全网内容+AI生成内容都没有覆盖到的用户需求、没有讲透的问题、没有共情到的情绪

### 四、差异化内容角度挖掘（原创性+过检双核心，至少输出3个，每个角度必须有明确的落地路径）
1.  差异化角度必须满足：反主流认知、细分垂直场景、个人实战视角、情绪深度共情、底层逻辑拆解5个方向中的至少1个，绝对禁止和全网同质化内容、AI高频内容重合
2.  每个差异化角度必须包含：角度核心定位、和全网内容的核心差异、用户价值、可落地到文章的内容路径、专属素材方向，禁止输出空泛的角度描述
3.  差异化角度必须100%匹配用户的专属写作人格、观点倾向、叙事范式，禁止输出不符合用户人格的角度

### 五、爆款内容趋势与专属素材方向
1.  该主题下，近期的内容流量趋势、用户偏好的内容形式、高互动的内容类型
2.  可使用的专属素材方向：小众行业数据、最新政策/事件、用户专属个人案例、垂直领域深度内容、AI训练数据中未覆盖的独家信息，绝对禁止推荐全网烂大街的通用素材
---

【输出要求】
1.  必须严格按照指定的JSON格式输出，禁止增减字段、禁止修改字段名
2.  所有调研内容必须围绕用户的主题、需求、人格、赛道展开，禁止脱离核心需求
3.  所有输出必须可落地、可执行，差异化角度必须有明确的落地路径，禁止空泛描述
4.  禁止输出任何JSON之外的内容，禁止添加解释、说明、备注`;

    const customInputsText = customInputs ? `
【用户自定义核心冲突（仅用于大纲生成）】
- 直击痛点：${customInputs.painPoint || '无'}

【特别强调】请基于这个核心冲突，生成一个起承转合的4-5段式大纲。不要在此时剧透具体细节和结尾金句。` : '';

    const userPrompt = `请基于以下信息，完成写作主题的深度调研，严格遵守System Prompt的所有要求。

【写作主题】${topic}
【用户写作需求】${requirements || '无'}${customInputsText}
【用户专属写作人格】${JSON.stringify(persona || {}, null, 2)}
【用户选定文章赛道】${persona?.trackType || '情感文'}

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
        temperature: 0.5,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      throw new Error(`深度调研请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    try {
      const result = JSON.parse(content);
      return {
        id: generateId(),
        competitorAnalysis: result.competitorAnalysis || [],
        homogeneityBanList: result.homogeneityBanList || [],
        aiHighFrequencyBanList: result.aiHighFrequencyBanList || [],
        zhuqueHighFrequencyBanList: [...(result.zhuqueHighFrequencyBanList || []), ...ZHUQUE_HIGH_FREQUENCY_BAN_LIST],
        userPainPoints: result.userPainPoints || { functionalPainPoints: [], emotionalPainPoints: [] },
        unmetNeeds: result.unmetNeeds || [],
        differentiationAngles: (result.differentiationAngles || []).map((angle: any) => ({
          ...angle,
          exclusiveMaterialDirection: angle.exclusiveMaterialDirection || angle.contentImplementationPath || '',
        })),
        hotTrends: result.hotTrends || [],
        exclusiveMaterialDirections: result.exclusiveMaterialDirections || [],
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return getDefaultResearchReport();
    }
  } catch (error) {
    console.error('深度调研失败:', error);
    return getDefaultResearchReport();
  }
}

async function generateOutlineV2(
  topic: string,
  requirements: string,
  customInputs: any,
  researchReport: ResearchReportV2,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  persona: Record<string, unknown> | null
): Promise<OutlineV2> {
  const safePersona = persona || {};
  const fixedStructure = safePersona.fixedStructureParadigm || {};
  const fixedNarrative = safePersona.fixedNarrativeParadigm || {};
  const fixedExpression = safePersona.fixedExpressionRules || {};

  try {
    const systemPrompt = `你是全球顶级的爆款内容策划专家，擅长设计逻辑闭环、情绪饱满、主线清晰、天然适配爆款逻辑、同时规避AI刻板结构的文章大纲。
你的核心任务是：基于用户的写作主题、需求、专属写作人格、深度调研结果、选定赛道，设计一篇100%可落地、强约束、主线闭环、低AI特征的文章大纲，绝对禁止生成模板化、生硬、无逻辑的大纲。

【最核心！必须100%遵守用户固定写作范式，这是不可违反的红线】
---
【用户固定结构范式（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedStructure, null, 2)}

【用户固定叙事范式（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedNarrative, null, 2)}

【用户固定表达规则（必须严格遵循，不允许任何偏离）】
${JSON.stringify(fixedExpression, null, 2)}

【大纲设计必须100%遵守的核心规则，缺一不可】
---
### 一、核心主线规则
1.  必须明确全文唯一的「核心价值主线」，清晰说明读者读完文章能获得的情绪价值+实用价值，全文所有段落必须围绕主线展开，不允许偏离
2.  每个段落必须明确「与核心价值主线的关联点」，确保全文主线贯穿始终，不会出现逻辑断裂、内容跑偏的问题
3.  必须强制首尾呼应，明确开头段的核心场景/钩子/情绪，必须在结尾段完成闭环呼应，形成完整的情绪与逻辑闭环
4.  必须100%落地深度调研结果中的差异化角度、用户痛点，每个差异化角度、用户痛点必须对应到具体的段落，不允许出现调研与大纲脱节

### 二、硬编码锁定用户固定结构规则（不允许任何自由发挥）
1.  必须100%遵循用户的全文固定结构，开头必须先抛核心结论，过渡段必须明确抛出3个核心模块，主体必须是3个平行递进的模块，必须使用用户固定的分隔符、编号规则，结尾必须是三段式闭环
2.  每个模块必须严格遵循用户的模块内部结构，明确模块核心金句、逻辑拆解要求、案例要求、收尾规则
3.  3个模块的核心观点必须严格遵循用户的递进逻辑，从表层→中层→底层，绝不允许观点重复、逻辑混乱
4.  必须明确人设与叙事约束：每个模块必须明确第二人称「你」的使用要求、第一人称案例的使用边界，不允许大段个人故事
5.  必须明确语言约束：每个模块必须明确句长、段落长度、金句位置、无效表达禁止规则，从源头锁定语言节奏
6.  绝对禁止规则：绝对不允许生成不符合用户固定结构的大纲，绝对不允许无模块划分、无递进逻辑、无清晰框架的流水账大纲

### 三、段落强约束规则（每个段落必须明确所有约束项，缺一不可）
1.  必须删除「段落小标题」，替换为「段落核心定位」，用一句话明确该段落的核心作用、核心内容，绝对不允许生成任何正文内小标题
2.  必须明确段落权重（总权重100）、字数范围、优先级，权重与优先级必须和段落的核心价值匹配，禁止均匀分配
3.  必须明确该段落必须覆盖的「核心关键点」，必须对应调研的差异化角度、用户痛点，不允许空泛
4.  必须明确该段落的「情绪节奏」，比如「压抑共情、认知颠覆、情绪释放、理性拆解、温暖治愈」，确保全文情绪曲线有波动、有突变，禁止平滑均匀的情绪分布（AI高频特征）
5.  必须明确该段落「必须呼应的核心主线关联点」，确保不跑偏
6.  必须明确该段落「必须使用的专属素材/案例方向」，必须来自调研结果的专属素材，禁止通用案例
7.  必须明确该段落「绝对禁止使用的内容」，包含同质化禁用清单+AI高频内容禁用清单+朱雀AI高频禁用清单中的对应内容
8.  必须明确该段落「真人化瑕疵注入要求」，匹配用户原生瑕疵习惯，明确是否需要注入、注入类型、注入场景
9.  必须明确该段落「固定范式约束」，明确该段落属于全文固定结构的哪一部分，必须严格遵循用户的固定范式

### 四、其他强制规则
1.  文章标题必须符合爆款逻辑，同时匹配用户的写作人格，禁止标题党、禁止不符合用户人格的标题
2.  必须明确全文的「全文强制约束规则」，可直接注入到逐段生成环节的prompt中，特别强调必须严格遵循用户的固定范式
3.  必须输出「同质化规避评分」，0-100分，分数越高，和全网同质化内容、AI高频内容的差异越大，原创性越强
4.  绝对禁止生成任何正文内小标题、分点、模板化结构，所有内容必须符合真人写作的自然段落逻辑
5.  必须明确「范式约束优先级」：用户固定写作范式 > 所有其他约束，这是不可违反的红线
---

【输出要求】
1.  必须严格按照指定的JSON格式输出，禁止增减字段、禁止修改字段名
2.  所有内容必须100%匹配用户的写作人格、固定范式、调研结果、核心需求、选定赛道
3.  用户固定写作范式是最高优先级约束，必须100%遵守，不允许任何偏离
4.  每个段落的约束必须可落地、可执行，可直接用于逐段生成环节，禁止空泛描述
5.  必须明确标注每个段落属于用户固定结构的哪一部分
6.  禁止输出任何JSON之外的内容，禁止添加解释、说明、备注`;

    const customInputsText = customInputs ? `
【用户自定义灵魂内容（必须100%融入大纲和正文）】
- 直击痛点：${customInputs.painPoint || '无'}
- 颗粒度细节：${customInputs.detail || '无'}
- 反常识升华：${customInputs.sublimation || '无'}
【特别强调】以上用户自定义内容必须作为文章的"灵魂"，100%融入到大纲设计中，确保文章有血有肉！` : '';

    const userPrompt = `请基于以下信息，生成文章大纲，必须100%严格遵循用户的固定写作范式，这是不可违反的红线，严格遵守System Prompt的所有要求。

【写作主题】${topic}
【用户写作需求】${requirements || '无'}${customInputsText}
【用户专属写作人格（含固定范式）】${JSON.stringify(safePersona, null, 2)}
【深度调研结果】${JSON.stringify(researchReport, null, 2)}
【用户选定文章赛道】${safePersona.trackType || '情感文'}

【特别强调】必须100%遵循用户的固定写作范式，这是最高优先级约束，不允许任何自由发挥！

请严格按照指定格式输出JSON内容，禁止任何额外输出。`;

    let result: any = null;
    
    try {
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
          temperature: 0.5,
          max_tokens: 7000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          result = JSON.parse(content);
        }
      }
    } catch (error) {
      console.error('AI大纲生成失败，使用默认大纲:', error);
    }

    if (result && result.sections && Array.isArray(result.sections) && result.sections.length > 0) {
      return {
        id: generateId(),
        title: result.title || topic,
        theme: result.theme || '',
        coreValueLine: result.coreValueLine || '',
        trackType: safePersona.trackType || '情感文',
        fullTextConstraintRules: result.fullTextConstraintRules || '',
        antiAiStructureRules: result.antiAiStructureRules || '',
        openingClosingEchoRule: result.openingClosingEchoRule || '',
        sections: (result.sections || []).map((s: any) => ({
          corePosition: s.corePosition || '',
          weight: s.weight || 10,
          priority: s.priority || 'medium',
          wordRange: s.wordRange || { min: 150, max: 300 },
          coreKeyPoints: s.coreKeyPoints || [],
          emotionRhythm: s.emotionRhythm || '',
          mainLineRelevance: s.mainLineRelevance || '',
          requiredMaterial: s.requiredMaterial || '',
          bannedContent: [...(s.bannedContent || []), ...researchReport.zhuqueHighFrequencyBanList],
          flawInjectionRule: s.flawInjectionRule || '匹配用户原生瑕疵习惯，注入自然瑕疵',
        })),
        totalWeight: result.totalWeight || 100,
        homogeneityAvoidanceScore: result.homogeneityAvoidanceScore || 85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return getDefaultOutline(topic, safePersona, researchReport, customInputs);
  } catch (error) {
    console.error('大纲生成失败，使用默认大纲:', error);
    return getDefaultOutline(topic, safePersona, researchReport);
  }
}

function getDefaultOutline(
  topic: string,
  persona: Record<string, unknown>,
  researchReport: ResearchReportV2,
  customInputs: any
): OutlineV2 {
  const safePersona = persona || {};
  
  const sections = [
    {
      corePosition: '开头段：1-2个短句，开门见山直接抛出全文核心金句结论',
      weight: 10,
      priority: 'high',
      wordRange: { min: 80, max: 150 },
      coreKeyPoints: ['直接抛出核心金句结论', '精准戳中核心痛点', '不铺垫、不讲故事、不绕弯子'],
      emotionRhythm: '直接有力',
      mainLineRelevance: '开头引入主题，直接给出答案',
      requiredMaterial: '用户专属核心金句',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯，极致短句',
    },
    {
      corePosition: '过渡段：用1句名人名言/公认金句承接，直接抛出全文的3个判断标准',
      weight: 10,
      priority: 'high',
      wordRange: { min: 100, max: 180 },
      coreKeyPoints: ['名人名言承接', '抛出3个判断标准', '给读者清晰的阅读预期'],
      emotionRhythm: '清晰明确',
      mainLineRelevance: '过渡衔接，明确全文框架',
      requiredMaterial: '1句名人名言/公认金句',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯',
    },
    {
      corePosition: '模块01：模块编号单独成段，直接抛出本模块核心观点金句',
      weight: 20,
      priority: 'high',
      wordRange: { min: 200, max: 300 },
      coreKeyPoints: ['模块编号单独成段', '核心观点金句', '金句佐证', '第二人称逻辑拆解', '极简案例', '模块收尾'],
      emotionRhythm: '认知颠覆',
      mainLineRelevance: '第1个判断标准，表层维度',
      requiredMaterial: '极简案例佐证',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯，极致短句',
    },
    {
      corePosition: '模块02：模块编号单独成段，直接抛出本模块核心观点金句',
      weight: 20,
      priority: 'high',
      wordRange: { min: 200, max: 300 },
      coreKeyPoints: ['模块编号单独成段', '核心观点金句', '金句佐证', '第二人称逻辑拆解', '极简案例', '模块收尾'],
      emotionRhythm: '理性拆解',
      mainLineRelevance: '第2个判断标准，中层维度',
      requiredMaterial: '极简案例佐证',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯，极致短句',
    },
    {
      corePosition: '模块03：模块编号单独成段，直接抛出本模块核心观点金句',
      weight: 20,
      priority: 'high',
      wordRange: { min: 200, max: 300 },
      coreKeyPoints: ['模块编号单独成段', '核心观点金句', '金句佐证', '第二人称逻辑拆解', '极简案例', '模块收尾'],
      emotionRhythm: '情绪释放',
      mainLineRelevance: '第3个判断标准，底层维度',
      requiredMaterial: '极简案例佐证',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯，极致短句',
    },
    {
      corePosition: '结尾段：三段式固定闭环，回扣开头、浓缩标准、情绪祝福',
      weight: 20,
      priority: 'medium',
      wordRange: { min: 150, max: 250 },
      coreKeyPoints: ['回扣开头核心结论', '浓缩3个模块的核心标准', '给读者温暖祝福/情绪出口'],
      emotionRhythm: '温暖治愈',
      mainLineRelevance: '首尾呼应，完成全文闭环',
      requiredMaterial: '温暖有力的结尾',
      bannedContent: researchReport.zhuqueHighFrequencyBanList,
      flawInjectionRule: '匹配用户原生瑕疵习惯',
    },
  ];

  return {
    id: generateId(),
    title: topic,
    theme: topic,
    coreValueLine: `帮助读者深入理解${topic}，提供3个可落地的判断标准，完成从清醒认知到治愈安抚的情绪闭环`,
    trackType: safePersona.trackType || '情感文',
    fullTextConstraintRules: '必须严格遵循用户固定写作范式：开头抛结论→过渡抛3个标准→3个平行递进模块（▼+01/02/03.分隔）→结尾三段式闭环，大量单句成段，最长段落不超过5句话',
    antiAiStructureRules: '严格遵循用户固定结构，避免AI刻板结构',
    openingClosingEchoRule: '开头直接抛核心结论，结尾三段式闭环：回扣开头→浓缩标准→情绪祝福',
    sections,
    totalWeight: 100,
    homogeneityAvoidanceScore: 85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultResearchReport(): ResearchReportV2 {
  return {
    id: generateId(),
    competitorAnalysis: [],
    homogeneityBanList: [],
    aiHighFrequencyBanList: [],
    zhuqueHighFrequencyBanList: [...ZHUQUE_HIGH_FREQUENCY_BAN_LIST],
    userPainPoints: { functionalPainPoints: [], emotionalPainPoints: [] },
    unmetNeeds: [],
    differentiationAngles: [],
    hotTrends: [],
    exclusiveMaterialDirections: [],
    generatedAt: new Date().toISOString(),
  };
}
