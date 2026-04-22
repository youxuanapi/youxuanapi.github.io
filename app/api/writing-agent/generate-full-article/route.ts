import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 模块 1：参数提取与动态切片计算（解决字数失控）
    // 必须提取 targetWordCount，默认 1100
    const { topic, requirements, persona, apiBaseUrl, apiKey, model, targetWordCount = 1100 } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    // 1. 动态切片：按每段大约 200-250 字计算，至少分 4 段保证结构完整
    const sliceCount = Math.max(4, Math.ceil(targetWordCount / 230));
    // 2. 计算基准字数
    const baseWords = Math.ceil(targetWordCount / sliceCount);
    // 3. 设定上下限，给予模型一定弹性
    const minWords = Math.max(100, baseWords - 20);
    const maxWords = baseWords + 60;

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
    // Agent 1：蓝图规划师（拔高立意）
    // ============================================================
    const blueprintPrompt = `
你是 SaaS 文本引擎的架构中枢。请根据主题，生成包含 ${sliceCount} 个环节的文章大纲。
【SaaS 泛用纪律】：
1. 无论什么主题，必须遵循"现象陈述 -> 逻辑深挖 -> 利益/代价拆解 -> 高维认知"的泛用结构。
2. 意图（intent）必须是纯理论、纯逻辑维度的剖析要求。
3. 绝对禁止要求写手编造具体的"场景、故事、案例"或"你我他"的互动。
输出 JSON 数组示例：[{"id":1, "role":"intro", "intent":"引出该主题下最普遍的社会现象，打破大众固有认知"}]
`;

    // ============================================================
    // Agent 2：切片撰写者 (Writer Agent - 动态注入字数红线)
    // ============================================================
    const writerPrompt = `
你是极其理智的社会学专栏作家。
【红线纪律】：
1. 视角锁定：强制使用第三人称（大众、人们、很多时候）。严禁使用第二人称"你"进行爹味说教！
2. 严禁故事：不准编造具体的金额、菜名、人名或狗血剧情。只能进行"现象白描"和"心理推演"。
3. 禁止机械词：严禁使用"首先、其次、总之、第一种"。
`;

    // ============================================================
    // Agent 3：质检员 (QA Agent - 保护字数)
    // ============================================================
    const qaPrompt = `
你是最终审稿人。
【质检与保护指令】：
1. 抹除爹味：看到"你有没有想过"、"我告诉你"等说教句式，立刻改成客观陈述。
2. 抹除八股文：打碎段首高度重复的词汇（如连续用"很多人"开头）。
3. 字数保护红线：在修改时，采用"同义替换"或改为倒装句或"微调"，绝对不允许大段删减文字，以免导致整篇文章字数严重萎缩！
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
          let debugLog = "# 🩺 文章生成深度诊断报告\n\n";
          let finalText = "";
          let previousContext = "这是文章的开头，请直接破题。";

          for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];

            // 1. 撰写初稿（将 previousContext 喂给模型）
            sendEvent(controller, 'writing', `正在撰写第 ${i + 1}/${sliceCount} 幕...`);
            const writerUserPrompt = `【上文结尾】：${previousContext}\n\n【本段意图】：${slice.intent}\n【字数强制指令】：本段字数必须严格控制在 ${minWords} 到 ${maxWords} 字之间！请通过多角度说理和心理白描来扩充篇幅，达到字数立刻收尾！`;
            const draftText = await fetchLLM(model, writerPrompt, writerUserPrompt, { temperature: 0.8, stream: false });

            // 2. 质检与修复
            sendEvent(controller, 'checking', `正在对第 ${i + 1} 幕进行靶向扫描...`);
            const fixedText = await fetchLLM(model, qaPrompt, `审查并去AI化此段：${draftText}`, { temperature: 0.9, frequency_penalty: 0.6, stream: false });

            // 3. 🎯 【新增：拼装诊断日志】
            debugLog += `### 【切片 ${i + 1}】\n\n`;
            debugLog += `**📌 蓝图意图 (Intent)**:\n> ${slice.intent}\n\n`;
            debugLog += `**📝 初稿 (Draft)**:\n${draftText}\n\n`;
            debugLog += `**🔧 质检后 (Fixed)**:\n${fixedText}\n\n`;
            debugLog += `---\n\n`;

            // 4. 拼装最终文章并更新记忆
            finalText += fixedText + "\n\n";
            const lastChars = fixedText.length > 150 ? fixedText.slice(-150) : fixedText;
            previousContext = `上文结尾内容是："...${lastChars}"。请你接着这段话往下自然延伸，严禁另起炉灶或使用并列词语。`;

            // 5. 推送给前端（将诊断日志和最终文章一起推送）
            const outputToFrontend = debugLog + "### 📖 最终合成文章\n\n" + finalText;
            sendEvent(controller, 'chunk_done', `第 ${i + 1} 幕打磨完成`, outputToFrontend);
          }

          // 循环结束后
          const finalOutput = debugLog + "### 📖 最终合成文章\n\n" + finalText;
          sendEvent(controller, 'done', '生成与诊断完成！', finalOutput);
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
