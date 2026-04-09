import { NextResponse } from 'next/server';
import { validateAIParagraph } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const { paragraph, userStyleExemptions = [], retryCount = 0, articleId = 'default' } = await req.json();

    if (retryCount >= 5) {
      return NextResponse.json({ 
        error: "MAX_RETRIES_REACHED", 
        message: "单段校验已达5次上限，请人工介入" 
      }, { status: 429 });
    }

    const result = await validateAIParagraph(paragraph, userStyleExemptions);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation Error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
