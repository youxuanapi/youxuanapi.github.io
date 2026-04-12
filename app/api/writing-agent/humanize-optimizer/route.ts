import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { content, apiBaseUrl, apiKey, model } = await req.json();

    if (!content) {
      return NextResponse.json({ error: '请提供需要优化的文本' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const systemPrompt = `你是一个专门对抗AI检测器的"文本破坏专家"。用户会发给你一段充满机器味的文本。
你必须在不改变核心意思的前提下，对其进行彻底的"人类生理性劣化处理"。

请按以下三个步骤强制修改文本：
1. 【词汇降级与剔除排比】：删掉所有高级形容词、四字成语和排比句。把"不可或缺"改成"不能没有"，把"治愈"改成"心里舒服点"。
2. 【制造主谓宾乱序与倒装】：在每段开头，强行倒装。把"因为今天下雨，所以我没出门"改成"没出门，因为今天雨实在是太大了，所以。"
3. 【一逗到底合并】：把相邻的三个用句号隔开的短句，强行用逗号连起来，删掉中间的关联词，让整段话像一口气说出来没喘气的碎碎念。
4. 【加入废话前缀】：在关键结论前，加上"反正不管咋样吧"、"说实话"、"其实呢"。

输出要求：直接返回修改后的纯文本，不要有任何解析！`;

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
          { role: 'user', content: content },
        ],
        temperature: 1.0,
        frequency_penalty: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`优化请求失败: ${response.status}`);
    }

    const data = await response.json();
    const optimizedText = data.choices?.[0]?.message?.content || content;

    return NextResponse.json({ optimizedText });
  } catch (error) {
    console.error('Humanize optimizer error:', error);
    return NextResponse.json({ error: '优化失败' }, { status: 500 });
  }
}
