import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. 提取参数与初始化
    const { topic, requirements, persona, apiBaseUrl, apiKey, model, targetWordCount = 1100 } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

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
    // 2. 定义双 Agent 的思想者终极 Prompt
    // ============================================================

    // Agent 1：全篇撰写者 (重感悟轻叙事，严格人称控制，真实典故佐证)
    const writerPrompt = `
你是一位阅历丰富、对人性有深刻洞察的独立作者。你不写套路文，只写自己真实的所思所想与社会感悟。
【核心任务】：撰写一篇深度剖析人情世故的清单体文章，字数逼近 ${targetWordCount} 字。

【第一性原理：写感悟，不写剧本（违者重罚）】：
1. 彻底摒弃编造个人故事：【绝对禁止】编造"我发小、我同事、上周聚餐"这种虚假的个人经历！你没有这些经历，编出来极其虚假。
2. 摒弃流水账与微观动作：不要像摄像头一样去描写事件细节（如"嫌菜咸、点什么菜"）。只需一笔带过现象（如："这种人一上桌，就成了自带差评滤镜的质检员，不是嫌这就是嫌那"），然后立刻把80%的笔墨放在【思想感悟、心理诛心、人性剖析】上！

【人称三角法则（划清界限）】：
3. "这种人/有些人"代表反面：描述负面现象时，绝对禁止使用具体的"他"或"你"。一律采用高度概括的群体称谓"这种人、那些人、有的人"。
4. "你"只用于对话：把"你"视为屏幕前的读者，像老友交心一样交流观点时才用（每段最多1-2个）。绝不用"你"去举反例！
5. "我/我们"是思想源头：作为作者，自然地表达"我们"在这个社会中的无奈或清醒。

【举例铁律与自然语感】：
6. 真实典故佐证：如果除了感悟，还必须用具体事件来佐证观点，【只能】调取客观存在的名人轶事、历史典故或大众熟知的真实社会新闻。
7. 词汇的自然生态：不要刻意套用公式！可以有"犯不上、吃力不讨好"的接地气，也可以有"本质上"的逻辑梳理。顺其自然地表达，绝对禁止刻意堆砌同样的词汇，绝对禁止每一段使用对称的结构排比。
`;

    // Agent 2：全局质检员 (专杀走剧情的机器味与对称性)
    const qaPrompt = `
你是顶级内容主编。你收到的是一篇初稿，请进行深度"去AI味"的质检与精修。
【质检与精修核心指令】：
1. 猎杀假故事与剧本味：扫描全文，如果发现作者在试图"演戏"（比如编造了具体的某次吃饭经过、具体的谈话细节），立刻将其压缩、提炼，改为高度概括的"现象评述"和"思想感悟"。
2. 人称纠偏：检查正文中是否滥用了"他/你"来代指反面人物。如果有，立刻替换为"这种人、有些人"，拉开审视的距离感。
3. 打破对称性与刻意感：如果发现连续几个小节的行文节奏一样（比如开头都是引语，结尾都是"说白了"），必须立刻重写打散！确保文章的呼吸感和错落感。
4. 极致精炼：保留人类口语表达，无情删掉"综上所述、总而言之"等毫无意义的AI过渡词。
5. 【字数保护铁律】：修改只能是重构和提炼，绝对不允许大段删减文字导致篇幅严重萎缩！总字数必须与初稿完全相当！
`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (controller: any, status: string, message: string, content = '') => {
            const payload = JSON.stringify({ status: status, message: message, content: content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          // ============================================================
          // 3. 核心执行逻辑（整篇生成 + 诊断报告推送）
          // ============================================================
          let debugLog = "# 🩺 文章生成深度诊断报告\n\n";

          sendEvent(controller, 'writing', '正在一气呵成撰写深度长文初稿...');
          const writerUserPrompt = `请以此主题写一篇完整的深度感悟文章：${topic}\n【再次重申红线】：逼近 ${targetWordCount} 字！绝不编造虚假故事，重在感悟与剖析！严格区分"这种人"和"你"的人称使用！`;
          const draftText = await fetchLLM(model, writerPrompt, writerUserPrompt, { temperature: 0.85, stream: false });

          debugLog += `### 📝 原始初稿 (Draft)\n\n${draftText}\n\n---\n\n`;
          sendEvent(controller, 'chunk_done', '初稿撰写完成，主编正在执行反剧本与人称核对...', debugLog);

          sendEvent(controller, 'checking', '正在猎杀流水账剧情与机械词汇...');
          const qaUserPrompt = `请严格按照指令，从宏观结构和人称视角上审查并精修以下初稿（切记提炼感悟且保护总字数）：\n\n${draftText}`;
          const fixedText = await fetchLLM(model, qaPrompt, qaUserPrompt, { temperature: 0.9, frequency_penalty: 0.8, stream: false });

          const finalOutput = debugLog + `### 📖 最终质检文章 (Fixed)\n\n${fixedText}`;
          sendEvent(controller, 'done', '生成与质检彻底完成！', finalOutput);
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
