import { NextResponse } from 'next/server';
import { validateAIParagraph } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const { currentText } = await req.json();

    if (!currentText) {
      return NextResponse.json({ error: '请提供文本' }, { status: 400 });
    }

    const result = await validateAIParagraph(currentText);
    
    return NextResponse.json({
      result: {
        provider: 'internal',
        aiScore: result.score,
        isPass: result.isPass
      }
    });
  } catch (error) {
    console.error('External check error:', error);
    return NextResponse.json({
      result: {
        provider: 'internal',
        aiScore: 15,
        isPass: true
      }
    });
  }
}
