import { NextRequest, NextResponse } from 'next/server';
import { decryptPrompt } from '@/app/lib/crypto-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { encryptedText, inputKey } = body;

    if (!encryptedText || typeof encryptedText !== 'string' || encryptedText.trim().length === 0) {
      return NextResponse.json({ error: '加密密文不能为空' }, { status: 400 });
    }

    if (!inputKey || typeof inputKey !== 'string' || inputKey.trim().length === 0) {
      return NextResponse.json({ error: '管理员密钥不能为空' }, { status: 400 });
    }

    const serverKey = process.env.PROMPT_SECRET_KEY;
    if (!serverKey) {
      return NextResponse.json({ error: '服务器密钥未配置' }, { status: 500 });
    }

    if (inputKey.trim() !== serverKey) {
      return NextResponse.json({ error: '密钥错误，访问被拒绝' }, { status: 403 });
    }

    const plaintext = decryptPrompt(encryptedText.trim());

    return NextResponse.json({ plaintext });
  } catch (error) {
    console.error('解密工具调用失败:', error);
    return NextResponse.json(
      { error: '解密失败 — 密钥不匹配或数据已损坏' },
      { status: 400 }
    );
  }
}
