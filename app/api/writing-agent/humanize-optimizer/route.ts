import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 提取参数与初始化（兼容 content 和 text 两种参数名）
    const { text, content, model, apiBaseUrl, apiKey } = body;
    const originalText = text || content || '';

    if (!originalText) return NextResponse.json({ error: '请提供需要优化的文本' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (controller: any, status: string, message: string, content = '') => {
            const payload = JSON.stringify({ status, message, content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          // ============================================================================
          // 变色龙·无损降重引擎 V6.1 (融雪微创版 + 格式封印)
          // ============================================================================
          const humanizePrompt = `
你是一位顶级的“文本伪装大师”和“资深编辑”。你收到了一篇需要降低 AI 痕迹的文章。
核心原则：文章质量绝对不能下降，专业度和调性必须100%保留！

请执行以下微创降重手术：
1. 绝对文体自适应：精准识别原文文体。原文是学术干货就保持严谨，原文是散文就保持优雅，绝不强加口语废话。
2. 融化规整结构：将“一、二、三”等硬排版融化为自然过渡的散文段落。不要生硬罗列。
3. 猎杀“理科生情感词”与机器高频词：绝对禁止使用“感知系统、考量体系、共同单位、底层逻辑、底层架构、情绪价值、能量场、不可复制、不可否认、赋能、松弛感、本质上、瞬息万变、共鸣、羁绊”等机器爱用的高级分析词汇！必须降级为最平实的人类白话。
4. 强行打断内部排比：如果原文连续举了三个相似的例子（A；B；C结构），你必须砍掉其中一个，或者把其中一个扩展成带修饰的长句，绝对不允许出现工整对称的排比分句！
5. 制造极端方差：将平滑的论述拆解为：一个包含复杂定语的极长句，紧接着跟一个极短的裁断句（如：确实如此。/ 并非易事。/ 事实正是如此。/ 答案显然是否定的。）。

【格式输出铁律（绝对红线）】：
绝不允许在生成的正文中出现任何“【】”、“[]”或“()”等指令性中括号！只输出干净的纯文本正文，不要带有任何解析、标题或多余的排版符号。
`;

          // ============================================================================
          // 核心执行逻辑
          // ============================================================================
          let debugLog = "# 🩺 变色龙V6.1微创降重报告\n\n";

          sendEvent(controller, 'writing', '正在锁定原文调性，执行融雪式去AI味微创手术...');
          const userPrompt = `请严格按照V6.1法则，在保持原文高质量和专业调性的前提下，对以下文章进行降重伪装：\n\n${originalText}\n\n【注意】：请直接输出正文，绝对禁止带有任何【】中括号和解析废话！`;

          // 设定温度和惩罚值，保证词汇多样性且打乱困惑度
          const fixedText = await fetchLLM(model, humanizePrompt, userPrompt, { temperature: 0.85, frequency_penalty: 0.6, stream: false });

          debugLog += `### 📖 降重净化后文章\n\n${fixedText}`;
          sendEvent(controller, 'done', '微创降重手术彻底完成！', debugLog);
          controller.close();
        } catch (error: any) {
          console.error('流处理错误:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'keep-alive' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '优化失败' }, { status: 500 });
  }
}
