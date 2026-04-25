import { NextRequest, NextResponse } from 'next/server';
import { encryptPrompt, generateSecureId } from '../../../lib/crypto-utils';

const META_PROMPT = `你现在是国内最顶级的"自媒体行文风格逆向工程引擎"。
你的核心任务是：深度扫描用户提供的一篇爆款文章，对其进行"抽筋拔骨"式的拆解，并最终输出一套【极度严苛的系统提示词（System Prompt）】。
这套输出的提示词，将被直接用于约束另一个 AI，使其写出与原爆款文章风格100%一致的新文章。

⚠️【绝对禁令】
不要给我任何"分析报告"、"总结"或"读后感"！
你的最终输出必须，且只能是一段直接可执行的、结构化的 Prompt 指令！

请严格按照以下【四维扫描法】对原文进行逆向提取，并转化为对应的指令：

1. 【视角维度的扫描（人称推移路径）】分析原作者我/你/他的人称切换逻辑。
2. 【论据维度的扫描（信任锚点与素材偏好）】分析论据来源，严禁虚构小明等假案例。
3. 【物理维度的扫描（排版与断句方差）】统计极短句触发条件，严禁机器匀称排版。
4. 【基因维度的扫描（语感黑白名单）】提取口语词白名单和AI臭味词黑名单。

【最终输出格式要求】（直接输出，不要寒暄）
【角色设定与底层滤镜】...
【结构与视角执行路径】...
【素材与事实约束】...
【断句与呼吸感法则】...
【词汇黑白名单】...`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceArticle, name, apiBaseUrl, apiKey, model } = body;

    if (!sourceArticle || typeof sourceArticle !== 'string' || sourceArticle.trim().length < 50) {
      return NextResponse.json({ error: '样本文章过短，至少需要50个字符' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '风格命名不能为空' }, { status: 400 });
    }

    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '请先配置 API' }, { status: 400 });
    }

    // Step 1: 调用 LLM，用 Meta-Prompt 引导逆向拆解
    const promptPlaintext = await callLLMForExtraction(
      sourceArticle.trim(),
      apiBaseUrl,
      apiKey,
      model
    );

    if (!promptPlaintext || promptPlaintext.trim().length < 20) {
      return NextResponse.json({ error: '风格拆解失败，LLM 未返回有效结果' }, { status: 500 });
    }

    // Step 2: 加密拆解结果（明文绝不离开服务端）
    const id = generateSecureId();
    const encryptedPrompt = encryptPrompt(promptPlaintext.trim());

    // Step 3: 生成标签
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const featureTag = extractFeatureTag(promptPlaintext);
    const subTag = `${dateStr} · ${featureTag}`;

    // Step 4: 返回密文给前端（明文已销毁）
    return NextResponse.json({
      id,
      name: name.trim(),
      subTag,
      encryptedPrompt,
    });
  } catch (error) {
    console.error('风格拆解引擎失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '风格拆解失败' },
      { status: 500 }
    );
  }
}

async function callLLMForExtraction(
  sourceArticle: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string
): Promise<string> {
  const userPrompt = `请对以下爆款文章进行"抽筋拔骨"式的逆向拆解，输出一段可直接执行的 System Prompt：

【待拆解的爆款文章】
${sourceArticle}`;

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: META_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`LLM 调用失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('LLM 返回内容为空');
  }

  return content;
}

function extractFeatureTag(prompt: string): string {
  if (prompt.includes('情感') || prompt.includes('共鸣') || prompt.includes('走心')) {
    return '情感共鸣';
  }
  if (prompt.includes('逻辑') || prompt.includes('专业') || prompt.includes('干货')) {
    return '专业干货';
  }
  if (prompt.includes('松弛') || prompt.includes('随笔') || prompt.includes('生活')) {
    return '生活随笔';
  }
  if (prompt.includes('洞察') || prompt.includes('犀利') || prompt.includes('清醒')) {
    return '犀利洞察';
  }
  return '自定义风格';
}
