import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { content, generationRules, coreValueLine, section, previousContent, issueDescriptions, modifyRule, apiBaseUrl, apiKey, model } = await req.json();

    if (!content) {
      return NextResponse.json({ error: '请提供需要修改的文本' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 });
    }

    const systemPrompt = `你是一个专门消除文本AI特征的"人类语感润色专家"。
用户的文本可能看起来太像机器写的（过于工整、喜欢用四字成语、喜欢说教）。
请严格执行以下去AI化处理，但【绝对不要把句子改成读不懂的乱码】，保持语义正常：

1. 【砸碎高级词汇】：删掉所有排比句、对称句和四字成语。把书面语改成市侩、现实的口语（比如把"不可或缺"改成"不能没有"，把"寻找陪伴"改成"凑个人数"）。
2. 【一逗到底】：找出一段描述，把相连的几个短句强行用逗号连起来，删掉中间的关联词，制造出一种一口气没喘完的"碎碎念"感。
3. 【加入口语废话】：在关键句子前面加入"反正不管咋样吧"、"说实话"、"其实说白了"。
4. 【替换输入法错误】：把所有"哪怕"改成"那怕"，把"地"改成"的"。

输出要求：不改变原文核心探讨的话题，直接返回润色后的纯文本，不要有任何说明！`;

    const userPrompt = `请修改以下文本：
${content}

${issueDescriptions ? `问题描述：${issueDescriptions}` : ''}

直接输出修改后的文本。`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.2,
        frequency_penalty: 0.6,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`修改请求失败: ${response.status}`);
    }

    const data = await response.json();
    const modifiedContent = data.choices?.[0]?.message?.content || content;

    return NextResponse.json({
      modifiedContent,
      explanation: '已执行PPL破坏处理'
    });
  } catch (error) {
    console.error('Modification error:', error);
    return NextResponse.json({ error: "修改失败" }, { status: 500 });
  }
}
