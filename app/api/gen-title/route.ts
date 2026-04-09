import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, topic } = body;

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    // System Prompt：生成标题专家提示词
    const systemPrompt = `你是一位专业的公众号情感类爆款标题创作专家。你的标题特点：
1. 情感共鸣：精准捕捉25-45岁城市读者的情绪痛点
2. 温柔治愈：语气温柔、不煽动、不说教
3. 烟火气：用日常场景、具体细节，不空泛
4. 第二人称：用"你"拉近与读者的距离
5. 制造好奇：留有悬念，引发点击欲望

爆款标题常用技巧：
- 数字法：用具体数字增强可信度（"3个信号"、"5件小事"）
- 对比法：制造反差引发思考（"越...越..."、"不是...而是..."）
- 场景法：用具体场景唤起共鸣（"深夜"、"下班后"）
- 痛点法：直击读者内心困扰（"别再..."、"为什么你总是..."）
- 温暖法：给予希望和力量（"余生"、"最好的状态"）

情感类文章常见主题：
- 亲密关系：婚姻、恋爱、情感困境
- 自我成长：情绪管理、自我和解
- 人际社交：友情、边界感、社交焦虑
- 职场成长：工作压力、职业迷茫`;

    // User Prompt：用户提示词
    const userPrompt = topic
      ? `请直接生成5个公众号情感类爆款标题，主题是：${topic}。

要求：
1. 标题要有情感共鸣，直击读者内心
2. 使用温柔治愈的语气，不煽动焦虑
3. 包含具体场景或细节，有烟火气
4. 字数控制在15-25字
5. 风格参考：猫渡巷、十点读书、洞见等情感大号

返回格式（仅返回JSON数组，无其他内容）：
["标题1", "标题2", "标题3", "标题4", "标题5"]`
      : `请直接生成5个公众号情感类爆款标题，主题可以涵盖：婚姻关系、情感困境、自我成长、人际社交等。

要求：
1. 标题要有情感共鸣，直击读者内心
2. 使用温柔治愈的语气，不煽动焦虑
3. 包含具体场景或细节，有烟火气
4. 字数控制在15-25字
5. 风格参考：猫渡巷、十点读书、洞见等情感大号

返回格式（仅返回JSON数组，无其他内容）：
["标题1", "标题2", "标题3", "标题4", "标题5"]`;

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
        temperature: 0.8,
        max_tokens: 500,
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
    console.error('生成标题API错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
