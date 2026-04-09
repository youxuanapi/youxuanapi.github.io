import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, article, type = 'original' } = body;

    if (!apiBaseUrl || !apiKey || !model || !article) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'original') {
      // 原创优化
      systemPrompt = `你是一位专业的公众号文章优化专家，擅长提升文章的原创度和人工感。

优化原则：
1. 保持核心观点和情感基调不变
2. 调整表达方式，避免AI痕迹
3. 增加口语化表达和烟火气
4. 加入适度的不确定性和人性化修饰
5. 打破过于规整的结构和句式

AI痕迹规避：
- 替换AI高频词（深入探讨、至关重要、息息相关等）
- 打破对称句式和模板化结构
- 加入顿挫点和思维跳跃
- 使用口语化衔接词（其实、说到底、话说回来）`;

      userPrompt = `请优化以下公众号文章的原创度，保留核心内容和情感基调：

${article}

优化要求：
1. 保持文章的核心观点、结构和情感基调
2. 替换AI痕迹词汇和表达方式
3. 增加口语化和烟火气
4. 打破过于规整的句式结构
5. 加入人性化修饰和不确定性表达
6. 字数保持在800-1500字

请直接输出优化后的文章内容，不要包含其他说明。`;
    } else {
      // 人工感优化（一键去AI味）
      systemPrompt = `你是一位接地气的公众号作者，擅长用最真实、最自然的大白话写作。你的文字像邻家大姐聊天，不做作、不端着、不文艺。`;

      userPrompt = `按照以下要求修改这篇文章：

${article}

## 修改要求：

1. 适当加入大白话、口语：啥、呢、吧、对吧、真的、其实、往往、就是
2. 句子短、碎、不工整，不排比、不对仗、不华丽
3. 不端着，不文艺，就是普通人聊天、吐槽、共情
4. 有真实感慨：例如"做女人难，做媳妇难上加难""真的很心疼大家"这类口语化表达，不可以直接照搬，需要思考后用口语表达理解和同情
5. 不书面、不讲逻辑对称，想到哪写到哪，真人感拉满
6. 不用任何高级词、连接词、金句堆砌，极度自然
7. 排版以"总分总"进行小段排列输出
8. 以上要求不能有刻意行为，需要随机，在合适的时候进行使用

请直接输出修改后的文章，不要包含任何说明或标题。`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `API 请求失败：${response.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('优化文章API错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
