import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 模块 1：参数提取与动态切片计算（解决字数失控）
    // 必须提取 targetWordCount，默认 1000
    const { topic, requirements, persona, apiBaseUrl, apiKey, model, targetWordCount = 1000 } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    // 动态计算需要的切片数量（每个切片约承担 250-300 字）
    const sliceCount = Math.max(4, Math.ceil(targetWordCount / 250));

    // ============================================================
    // 内部通用 fetchLLM 方法
    // ============================================================
    const fetchLLM = async (
      model: string,
      systemPrompt: string,
      userPrompt: string,
      options: { temperature: number; stream: boolean; frequency_penalty?: number }
    ) => {
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: options.temperature,
          stream: options.stream,
          frequency_penalty: options.frequency_penalty
        }),
      });

      if (!response.ok) throw new Error(`LLM 调用失败: ${response.status}`);

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    };

    // ============================================================
    // Agent 1：蓝图规划师（动态注入切片数量）
    // ============================================================
    const blueprintPrompt = `
你是顶级爆文架构师。根据用户主题，生成一个包含 ${sliceCount} 个切片的文章大纲。
【生死红线】：
1. 切片结构必须是纯粹的"现象洞察、心理剖析、共鸣升华"，绝对不准出现"举例说明"、"编造故事"的意图。
2. 只输出合法的 JSON 数组：[{"id": 1, "intent": "现象白描，引出痛点"}, {"id": 2, "intent": "向内挖掘心理动机"}...]
`;

    // ============================================================
    // Agent 2：切片撰写者 (Writer Agent - 回归克制白描)
    // ============================================================
    const writerPrompt = `
你是一位极其克制的非虚构作家。请根据大纲意图，只撰写当前这一个自然段。
【生死红线】：
1. 绝对不要加任何口头禅或过渡语（如：说实话、总之、另外）。你只负责讲事，直接切入画面。
2. 绝对禁止换行（\\n），当前输出必须是一个完整的自然段。
3. 把所有的情绪形容词，替换成客观的细节动作（例如：不要写"她很委屈"，写"她攥着发票边缘指节泛白"）。
4. 严禁超过80字没有句号。
`;

    // ============================================================
    // Agent 3：机械味质检员 (QA Agent - 严禁强加口语)
    // ============================================================
    const qaPrompt = `
你是冷酷的文字质检员。你接收到的是文章的"其中一个片段"。
你的唯一任务是消除这段话里的"机器味（如：句式对仗工整、说教腔、四字成语泛滥）"。
【修正纪律】：
1. 绝对禁止在段首或段尾强加"说实在的"、"这日子没法过了"、"其实"等任何口语化连词或感叹词！
2. 遇到对仗排比，必须强行打碎，改成错落有致的长短句。
3. 遇到假大空的词，换成大白话。
4. 如果这段话读起来已经像人写的客观叙述，直接原样返回，少废话，不准乱加料。
`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (controller: any, status: string, message: string, content = '') => {
            const payload = JSON.stringify({ status, message, content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          // 阶段 1：生成大纲
          sendEvent(controller, 'blueprint', `正在为您解构爆款基因，生成 ${sliceCount} 幕动态结构蓝图...`);
          const blueprintResponse = await fetchLLM(model, blueprintPrompt, topic, { temperature: 0.7, stream: false });
          const slices = JSON.parse(blueprintResponse);
          sendEvent(controller, 'blueprint_done', '结构蓝图构建完成！', JSON.stringify(slices));

          // ============================================================
          // 模块 3：引入上下文记忆链条的 for 循环（解决八股文割裂）
          // ============================================================
          let fullArticle = "";
          let previousContext = "这是文章的开头，请直接破题。";

          for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];

            // 1. 撰写初稿（将 previousContext 喂给模型）
            sendEvent(controller, 'writing', `正在撰写第 ${i + 1}/${sliceCount} 幕...`);
            const writerUserPrompt = `【上文末尾内容】：${previousContext}\n\n【当前切片意图】：${slice.intent}`;
            const draftText = await fetchLLM(model, writerPrompt, writerUserPrompt, { temperature: 0.8, stream: false });

            // 2. 质检与修复
            sendEvent(controller, 'checking', `正在对第 ${i + 1} 幕进行靶向扫描...`);
            const fixedText = await fetchLLM(model, qaPrompt, `审查并去AI化此段：${draftText}`, { temperature: 0.9, frequency_penalty: 0.6, stream: false });

            // 3. 组装与记忆更新（提取最后 150 个字符作为下一段的上下文）
            fullArticle += fixedText + "\n\n";
            const lastChars = fixedText.length > 150 ? fixedText.slice(-150) : fixedText;
            previousContext = `上文结尾内容是："...${lastChars}"。请你接着这段话往下自然延伸，严禁另起炉灶或使用并列词语。`;

            sendEvent(controller, 'chunk_done', `第 ${i + 1} 幕打磨完成`, fullArticle);
          }

          // 阶段 5：终局输出
          sendEvent(controller, 'done', '拟人重塑彻底完成！当前文章原创度极佳。', fullArticle);
          controller.close();
        } catch (error: any) {
          console.error('流处理错误:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
