import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, title, style, stream = false } = body;

    if (!apiBaseUrl || !apiKey || !model || !title || !style) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    // System Prompt：生成模块选项专家提示词
    const systemPrompt = `你是一位专业的公众号情感类内容策划专家，擅长为文章生成核心观点、读者痛点和分论点。

你的风格特点：
1. 懂你：精准捕捉25-45岁城市读者的情绪痛点
2. 陪你：以陪伴式姿态，用第二人称"你"创作
3. 治愈你：基调温暖治愈，给予正向情绪力量
4. 不说教：用共情、场景、细节藏观点，不用命令式句式

每个模块需要生成6个选项供用户选择。`;

    // User Prompt：用户提示词
    const userPrompt = `基于标题「${title}」和风格「${style}」，为文章生成以下模块的选项（每个模块6个选项）：

返回格式（严格JSON）：
{
  "core": ["核心观点1", "核心观点2", "核心观点3", "核心观点4", "核心观点5", "核心观点6"],
  "pain": ["读者痛点1", "读者痛点2", "读者痛点3", "读者痛点4", "读者痛点5", "读者痛点6"],
  "opening": ["开篇要求1", "开篇要求2", "开篇要求3", "开篇要求4", "开篇要求5", "开篇要求6"],
  "arg1_title": ["分论点1小标题1", "分论点1小标题2", "分论点1小标题3", "分论点1小标题4", "分论点1小标题5", "分论点1小标题6"],
  "arg1_content": ["分论点1内容要求1", "分论点1内容要求2", "分论点1内容要求3", "分论点1内容要求4", "分论点1内容要求5", "分论点1内容要求6"],
  "arg2_title": ["分论点2小标题1", "分论点2小标题2", "分论点2小标题3", "分论点2小标题4", "分论点2小标题5", "分论点2小标题6"],
  "arg2_content": ["分论点2内容要求1", "分论点2内容要求2", "分论点2内容要求3", "分论点2内容要求4", "分论点2内容要求5", "分论点2内容要求6"],
  "arg3_title": ["分论点3小标题1", "分论点3小标题2", "分论点3小标题3", "分论点3小标题4", "分论点3小标题5", "分论点3小标题6"],
  "arg3_content": ["分论点3内容要求1", "分论点3内容要求2", "分论点3内容要求3", "分论点3内容要求4", "分论点3内容要求5", "分论点3内容要求6"],
  "ending": ["结尾要求1", "结尾要求2", "结尾要求3", "结尾要求4", "结尾要求5", "结尾要求6"]
}

各模块要求：
1. 【全文核心观点】：用一句话概括文章核心观点，要有温度、有共鸣，不空泛
2. 【读者核心痛点】：描述读者的具体困扰和情绪状态，用第二人称
3. 【开篇模块】：参考方向：用日常场景切入/第二人称设问/朋友小事切入/贴合痛点共情
4. 【分论点小标题】：短小精悍，6-12字，能概括该段落核心
5. 【分论点内容要求】：共情某类情绪+具体场景落地+打破认知+金句升华
6. 【结尾模块】：包容选择+温柔升华+给读者祝福，不用鸡血口号

仅返回JSON对象，无其他内容。`;

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
        temperature: 0.9,
        max_tokens: 8000,
        stream: stream,
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

    // 如果是流式请求，直接返回流
    if (stream && response.body) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('生成模块选项API错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
