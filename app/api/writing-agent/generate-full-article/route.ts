import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, requirements, painPoint, detail, sublimation, wordCount, persona, apiBaseUrl, apiKey, model } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    // 1. 动态构建人格特征
    const personaDesc = persona ? `
【专属写作人格注入】
- 风格名称：${persona.name}
- 核心特征：情感密度(${persona.dynamicPreferences?.emotionDensity || 0.5}/100), 直接程度(${persona.dynamicPreferences?.directness || 0.5}/100)
- 叙事视角：${persona.dynamicPreferences?.perspective === 'first' ? '第一人称「我」' : '第三人称「她们/他」'}
- 语言偏好：优先使用 [${persona.vocabulary?.preferred?.join('、') || '自然口语'}]，严格规避 [${persona.vocabulary?.avoided?.join('、') || '说教词汇'}]
` : '使用通用拟人音色。';

    // ================= 动态基因库构建 =================
    const ANCHORS = [
      "【走心独白风】：有时候我在想，人这一辈子到底在图什么。看着手机里那个永远不会再亮起的头像，突然觉得，那些曾经以为过不去的坎，其实也就那么回事。说实话，挺可笑的。",
      "【犀利吐槽风】：别再搞什么自我感动了，行不行？你以为你在牺牲，在别人眼里你就是个毫无底线的讨好型人格。每次看到那种为了别人委屈自己的人，我都想冲过去摇醒她。太憋屈了。",
      "【克制叙事风】：那天的雨下得很大。她站在站牌底下，没有打伞，手里紧紧捏着一张揉皱的体检报告。她没有哭，甚至没有表情。但你能感觉到，她心里的某座大厦，正在无声无息地轰然倒塌。"
    ];

    const RHYTHMS = [
      "【节奏A：极端长短句】：用极其绵长、细节极多（超过50字）的复杂长句铺陈画面，然后突然用一个极短句（少于5字，如：‘很痛。’）单句成段，形成视觉断崖。",
      "【节奏B：碎碎念递进】：大量使用半截话和自我推翻。写一段话后，下一段用‘其实也不全对’、‘或者说’来反驳自己，模仿人类思考时的纠结感。",
      "【节奏C：对话式推进】：文章中要频繁穿插假想的对话或自言自语（可以带括号吐槽），就像坐在读者对面聊天一样，打破传统的论述结构。"
    ];

    // 随机抽取本次生成的基因
    const selectedAnchor = ANCHORS[Math.floor(Math.random() * ANCHORS.length)];
    const selectedRhythm = RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)];

    // ================= XML 结构化提示词 =================
    const systemPrompt = `
<Role>
你是一位拥有顶级共情力、深谙人性的散文作家。你极其厌恶八股文和说教，擅长用充满毛边感和烟火气的语言直击人心。
</Role>

<Context>
${personaDesc}
</Context>

<Mutation_Directives>
本次创作，你必须【强制】采用以下随机抽取的语感和节奏，这将彻底改变你的行文骨架，确保每次生成的文章绝不重样：
1. 语感锚定（请模仿这种腔调）：${selectedAnchor}
2. 叙事节奏（请严格执行）：${selectedRhythm}
</Mutation_Directives>

<Execution_Rules>
  1. 【绝对禁止对称节奏与一逗到底（生死红线）】：你必须打破排版的周期规律！绝对不要形成“长段落-极短段落-长段落-极短段落”的循环公式。段落长度必须是混沌、不规则的（例如：中-短-长-中-极短）。此外，长段落中必须正常使用句号（。）进行断句，绝对禁止写出超过80字没有句号的“一逗到底”病态长句！
  2. 【反击预测模型】：不要匀速输出。你必须用具体的物品、微小的动作（如：檐角滴下来的冰碴子化在羽绒服领口）来替代“非常难过、极度焦虑”等干瘪的形容词。
  3. 【口语化倒装与去格式化】：在情绪高潮处自然使用倒装句（如：“这日子没法过了，说真的。”）。带数字小标题下方必须直接讲故事或场景，禁止使用“定义+解释”的机器结构。
</Execution_Rules>

<Format>
1. 全文规模控制在 ${wordCount || 1500} 字左右。
2. 结尾绝不总结，用一句通透的感慨或无声的留白收尾。
3. 直接输出纯文本正文，不输出任何 XML 标签。
</Format>`;

    // 3. 动态构建用户提示词（注入深度逻辑）
    const userPrompt = `
【写作主题】：${topic}
【补充需求】：${requirements || '无'}
${painPoint ? `【核心痛点】：${painPoint}` : ''}
${detail ? `【细节要求】：${detail}` : ''}
${sublimation ? `【结尾升华建议】：${sublimation}` : ''}

请基于以上深度逻辑直接开始创作。`;

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,           // 进一步拉高，注入极强的人类随机性和发散性
        top_p: 0.9,                 // 扩大词汇采样池，拒绝平庸词汇
        frequency_penalty: 0.8,     // 强力惩罚重复词汇，打破AI的习惯性用语
        presence_penalty: 0.5,      // 鼓励跳跃到新话题
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`生成请求失败: ${response.status}`);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  const delta = data.choices?.[0]?.delta?.content;
                  if (delta) controller.enqueue(encoder.encode(delta));
                } catch (e) {}
              }
            }
          }
        } finally { controller.close(); reader.releaseLock(); }
      }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
