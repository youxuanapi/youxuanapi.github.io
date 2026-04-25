import { NextRequest, NextResponse } from 'next/server';
import { encryptPrompt, generateSecureId } from '../../../lib/crypto-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, name } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json({ error: '提示词内容过短，至少需要10个字符' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '风格命名不能为空' }, { status: 400 });
    }

    const id = generateSecureId();
    const encryptedPrompt = encryptPrompt(prompt.trim());

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const featureTag = extractFeatureTag(prompt);

    const subTag = `${dateStr} · ${featureTag}`;

    return NextResponse.json({
      id,
      name: name.trim(),
      subTag,
      encryptedPrompt,
    });
  } catch (error) {
    console.error('加密提示词失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '加密失败' },
      { status: 500 }
    );
  }
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
