import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, requirements, apiBaseUrl, apiKey, model } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    const systemPrompt = `你是一位顶级的自媒体爆款作者。你的任务是根据用户主题，写一篇高质量、极具人类真实情感和叙事张力的文章。

【🚨 核心拟人法则】
1. 结构去机械化：抛弃传统的"123点"、"首先其次"等死板结构。采用自然的心流叙事，用情绪或动作推动过渡。
2. 保护人类连词：必须自然使用人类日常沟通的基础连词（如：其实、但是、所以、然后、说实话、说白了）。
3. 封杀AI套话：禁止使用（不可否认、全方位、核心在于、这意味着、矩阵、赋能、总而言之、综上所述）。
4. 视觉呼吸感：打碎长篇大论的"文字墙"，频繁换行。情绪浓烈处，单句成段。
5. 【巧妙使用口语化倒装（反检测核心）】：绝对不要使用语无伦次的病态倒装。你需要模拟人类激动或随性说话时的『结论前置、补充后置』的自然倒装（补述）习惯，打破 AI 常见的顺向逻辑链。
   - 错误示范（病态倒装）：没出门，因为今天雨实在是太大了，所以。
   - 正确示范（人类自然倒装）：今天我根本没法出门，雨实在是太大了。 / 这钱花得我真憋屈，说实话。 / 真的别搞这种自我感动式的爱了，行不行啊。
   请在每篇文章中，自然地穿插 2-3 处这样的口语化倒装结构。

直接输出排版舒适的纯文本正文（1200字左右），不带小标题，禁止输出JSON。`;

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `【写作主题】：${topic}\n【补充需求】：${requirements || '无'}\n\n请直接开始创作正文。` }
        ],
        temperature: 0.8,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
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
