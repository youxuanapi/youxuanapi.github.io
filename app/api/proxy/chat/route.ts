import { NextRequest, NextResponse } from 'next/server';

// 将常见的 API 错误信息翻译成中文
function translateApiError(message: string): string {
  const errorMap: Record<string, string> = {
    'The API key doesn\'t exist': 'API 密钥不存在，请检查密钥是否正确',
    'Invalid API key': 'API 密钥无效',
    'does not exist or you do not have access to it': '模型不存在或您无权访问',
    'insufficient_quota': '配额不足，请检查账户余额',
    'rate_limit_exceeded': '请求频率超限，请稍后再试',
    'context_length_exceeded': '输入内容过长，超出模型处理限制',
    'invalid_request_error': '请求参数错误',
    'authentication_error': '认证失败，请检查 API 密钥',
    'permission_denied': '权限不足',
    'not_found': '资源不存在',
    'service_unavailable': '服务暂时不可用',
  };
  
  // 查找匹配的错误信息
  for (const [key, translation] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }
  
  // 如果没有匹配，返回原始消息或默认翻译
  return message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiBaseUrl, apiKey, model, messages, temperature = 0.7, maxTokens = 2000 } = body;

    if (!apiBaseUrl || !apiKey || !model || !messages) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json(
        { error: 'API Key 格式不正确' },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息格式不正确' },
        { status: 400 }
      );
    }

    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json(
        { error: 'API Base URL 格式不正确' },
        { status: 400 }
      );
    }

    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: Math.min(Math.max(temperature, 0), 2),
        max_tokens: Math.min(Math.max(maxTokens, 1), 100000),
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `API 请求失败：${response.status}`;
      
      // 将常见的英文错误信息翻译成中文
      const translatedError = translateApiError(errorMessage);
      
      return NextResponse.json(
        { error: translatedError },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API代理错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
