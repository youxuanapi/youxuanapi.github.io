import { NextRequest, NextResponse } from 'next/server';
import { getOfficialPrompt, isOfficialStyle } from '../../../lib/official-prompts';
import { decryptPrompt } from '../../../lib/crypto-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. 提取参数与初始化
    const { topic, requirements, persona, apiBaseUrl, apiKey, model, targetWordCount = 1100, template, encryptedPrompt } = body;

    if (!topic) return NextResponse.json({ error: '请输入写作主题' }, { status: 400 });
    if (!apiBaseUrl || !apiKey || !model) return NextResponse.json({ error: '请先配置API' }, { status: 400 });

    // ============================================================================
    // 2. 提示词安全解析（黑盒化核心逻辑）
    // ============================================================================
    let writerPrompt: string;

    if (template && isOfficialStyle(template)) {
      // 官方模板：从后端字典安全提取
      const officialPrompt = getOfficialPrompt(template);
      if (!officialPrompt) {
        return NextResponse.json({ error: '无效的官方风格模板' }, { status: 400 });
      }
      writerPrompt = officialPrompt.replace('{{targetWordCount}}', String(targetWordCount));
    } else if (encryptedPrompt) {
      // 用户自定义：解密加密后的提示词
      try {
        writerPrompt = decryptPrompt(encryptedPrompt);
      } catch (err) {
        console.error('解密自定义提示词失败:', err);
        return NextResponse.json({ error: '自定义风格解密失败，请重新提取' }, { status: 400 });
      }
    } else {
      // 默认回退到 insight 风格
      const fallbackPrompt = getOfficialPrompt('insight');
      if (!fallbackPrompt) {
        return NextResponse.json({ error: '系统默认风格加载失败' }, { status: 500 });
      }
      writerPrompt = fallbackPrompt.replace('{{targetWordCount}}', String(targetWordCount));
    }

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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (controller: any, status: string, message: string, content = '') => {
            const payload = JSON.stringify({ status: status, message: message, content: content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          // ============================================================================
          // 核心执行逻辑
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
