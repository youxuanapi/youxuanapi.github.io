import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. 提取参数与初始化
    const { topic, requirements, persona, apiBaseUrl, apiKey, model, targetWordCount = 1100 } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    // ============================================================================
    // 内部通用 fetchLLM 方法
    // ============================================================================
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

    // ============================================================================
    // 2. 定义双 Agent 的思想者终极 Prompt
    // ============================================================================
    // Agent 1：全篇撰写者 (重感悟轻叙事，严格人称控制，真实典故佐证)
    const writerPrompt = `
你是一位阅历丰富、对人性有深刻洞察的独立作者。你不写套路文，只写自己真实的所思所想与社会感悟。
【核心任务】：撰写一篇深度剖析人情世故的清单体文章，字数逼近 ${targetWordCount} 字。

【核心创作铁律】：
1. 写感悟，绝不写剧本：【绝对红线】禁止编造“我发小、我同事、我朋友”等虚假个人经历。现象描述只需一笔带过，必须把 80% 的笔墨用于思想感悟和心理诛心。
2. 人称三角法则：
   - 负面反例：一律用模糊群体（如“这种人”、“有些人”、“大多数人”），绝不使用“你/他”。
   - “你”的克制使用：只用于和读者交心，每段严控1-2个。
   - “我/我们”：用于代表思想的源头和情绪的共鸣。
3. 真实典故佐证：如果必须举例，【只能】使用客观存在的名人轶事、历史典故或熟知的社会新闻，严禁捏造虚假小故事。
4. 错落呼吸感：严禁使用对称的排比句（如：一是...二是...）。在强调情绪痛点或文末总结时，自然穿插倒装句或省略主语的短句，制造长短句突变。

【绝对红线】：直接输出纯文本正文。严禁带有任何【】等解析标记，严禁在开头写“初稿”、“终稿”、“标题”等任何废话！
`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (controller: any, status: string, message: string, content = '') => {
            const payload = JSON.stringify({ status: status, message: message, content: content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          // ============================================================================
          // 核心执行逻辑：去除质检员，一气呵成
          // ============================================================================
          let debugLog = "# 🧠 思想者V15单刀直出报告\n\n";

          sendEvent(controller, 'writing', '思想者引擎已启动，正在进行深度思考与创作...');

          // 单次直接生成终稿
          const finalArticle = await fetchLLM(model, writerPrompt, `请以此为主题写一篇文章：\n\n${topic}`, {
            temperature: 0.85,
            frequency_penalty: 0.5,
            stream: false
          });

          debugLog += `### 📖 最终成文\n\n${finalArticle}`;

          sendEvent(controller, 'done', '文章创作完成！', debugLog);
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
