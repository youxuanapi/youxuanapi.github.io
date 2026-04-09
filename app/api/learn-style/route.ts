import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, original, modified } = body;

    if (!apiBaseUrl || !apiKey || !model || !original || !modified) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const url = `${baseUrl}/chat/completions`;

    // System Prompt：风格学习分析提示词
    const systemPrompt = `你是一位专业的写作风格分析师，擅长深度分析文本的叙事方式和表达习惯。

你的核心任务是分析用户对AI生成内容的修改，**重点学习用户的叙事方式和语言习惯**，帮助AI逐渐掌握用户的个人写作风格。

输出格式要求（严格JSON格式，不要有其他内容）：
{
  "style_note": "一句话总结用户的叙事风格特征（20字以内）",
  "changes": [
    {
      "original": "原文片段（最多50字）",
      "modified": "修改后片段（最多50字）", 
      "reason": "修改原因分析（重点指出叙事方式的变化）"
    }
  ],
  "rules": [
    {
      "category": "narrative_style|vocabulary|sentence|tone|structure",
      "avoid": ["应避免的表达方式"],
      "prefer": ["应偏好的表达方式"],
      "note": "规则说明（必须具体描述叙事特征）"
    }
  ]
}

**重点分析维度**：
1. **叙事视角**：用户偏好第一人称/第二人称/第三人称叙述
2. **叙事节奏**：句子长短搭配、段落呼吸感、叙述速度
3. **叙事角度**：从细节切入/从情感切入/从观点切入
4. **语气温度**：温暖治愈/清醒理性/轻松幽默
5. **表达习惯**：常用词汇、句式结构、标点使用
6. **情感浓度**：克制含蓄/直白热烈/娓娓道来`;

    // User Prompt：风格学习用户提示词
    const userPrompt = `请深度分析以下文本修改，重点提取用户的叙事方式和语言习惯：

【AI生成的原文】
${original}

【用户修改后的版本】
${modified}

请逐句对比分析，重点关注：
1. **每一句话的叙事方式变化**：
   - 用户如何改写AI的表达？
   - 修改后的叙事角度、节奏、语气有何不同？
   
2. **语言习惯特征**：
   - 用户偏好使用哪些词汇？
   - 句子结构有什么特点？
   - 段落节奏如何安排？

3. **可学习的规则**：
   - 提炼具体可执行的叙事规则
   - 规则要能指导AI模仿用户的表达方式
   
示例规则格式：
- narrative_style: "偏好用具体场景开头，先描绘画面再带入情感"
- vocabulary: "用'其实'替代'事实上'，用'可能'增加不确定性"
- sentence: "短句与长句交替，长句多用于描述场景，短句用于情感表达"

请输出JSON格式的分析结果。`;

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
        max_tokens: 1000,
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
    console.error('风格学习API错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
