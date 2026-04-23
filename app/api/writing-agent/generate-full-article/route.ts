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
    // 2. 定义双 Agent 的终极纯净版 Prompt
    // ============================================================

    // Agent 1：全篇撰写者 (彻底去模板化，自然流露，拒绝元词汇污染)
    const writerPrompt = `
你是深谙人性、洞察世事的人际关系与社会专栏主笔。
【核心任务】：撰写一篇剖析人情世故的深度清单体爆文，全文总字数逼近 ${targetWordCount} 字。

【灵魂与排版纪律（违者重罚）】：
1. 清单结构与开门见山：使用独立小标题进行分类。在小标题下的正文起手句，【绝对禁止】使用"第一种就是"、"第二种是"等废话！直接开门见山，抛出观点或现象白描！
2. 拒绝内部公式化：【绝对禁止】每个小节的论述逻辑雷同（严禁每段都按"引语+现象+本质"写）。
3. 严控引语频次："俗话说、老话讲"等引用，【全文最多只能出现一到两次】！
4. 深度剖析与视角：像手术刀一样剖析背后的算计与情绪消耗。自然代入"我们"的共情视角，但【严禁】在段落开头高频重复使用"我们"。不要写流水账故事。

【反诱导与语感法则】：
5. 自然语感（绝不堆砌）：用最自然、随机的人类大白话交流。【绝对禁止】刻意在文中堆砌或反复套用任何特定的口语词汇（如"说白了"、"本质上"、"你以为"等）。一切顺其自然！
6. 元词汇屏蔽：你的行文风格是"人间清醒、犀利、诛心"，但你【绝对禁止】将这些词汇直接写进正文里去夸赞自己或教育读者！
7. 抹除机械感：全面扫除"首先、其次、不可否认、毋庸置疑、综上所述、总而言之"。
8. 增强顿挫：多用"倒装句"或"省略主语的短句（无主句）"，打破AI句式的匀称感。
`;

    // Agent 2：全局质检员 (宏观防模板大师，专杀对称性、多余口头禅与结尾废话)
    const qaPrompt = `
你是顶级自媒体爆款内容主编。你收到的是一篇初稿，请进行宏观防模板质检与微观精修。
【精修与全局反模版指令】：
1. 猎杀废话开头：如果发现某个小标题下的正文是以"第一/二种就是"或"有一种人"开头的，立刻删掉，让段落直接进入正题！
2. 全文模板化雷达：观察全文阵型！如果发现连续几个小节的内部行文结构完全一样，必须立刻局部重写打散！打破浓烈的机器排比味。
3. 猎杀多余引语与刻意口语：初稿中"俗话说/老话讲"超过两次则强制删改。如果发现初稿刻意滥用了相同的口语词（如到处都是"说白了"或频繁使用"我们"开头），立刻打散替换，保证用词的随机性与自然感。
4. 靶向去痕与极致省字：无情扫除所有"综上所述、总而言之、最后我想说"等结尾废话和AI过渡词。将累赘的代词（他、你）提炼为紧凑的无主句。
5. 【字数保护铁律】：修改只能是句式的重构和打散，绝对不允许大段删减文字导致篇幅严重萎缩！总字数必须与初稿完全相当！
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
          const writerUserPrompt = `请以此主题写一篇完整的自媒体爆文：${topic}\n【再次重申红线】：逼近 ${targetWordCount} 字！正文严禁废话开头！绝不刻意堆砌任何口语词汇！打破段落内部的对称性！`;
          const draftText = await fetchLLM(model, writerPrompt, writerUserPrompt, { temperature: 0.85, stream: false });

          debugLog += `### 📝 原始初稿 (Draft)\n\n${draftText}\n\n---\n\n`;
          sendEvent(controller, 'chunk_done', '初稿撰写完成，主编正在执行宏观反模版扫描...', debugLog);

          sendEvent(controller, 'checking', '正在猎杀模板化结构与生硬过渡...');
          const qaUserPrompt = `请严格按照指令，从宏观结构上审查并精修以下完整初稿（切记打破段落间的雷同感且保护总字数）：\n\n${draftText}`;
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
