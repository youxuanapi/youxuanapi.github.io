import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { paragraphs } = await req.json();

    if (!paragraphs || paragraphs.length < 3) {
      return NextResponse.json({
        passed: true,
        riskType: null,
        details: {
          p1Signature: '',
          p2Signature: '',
          p3Signature: '',
          isP3Repetitive: false,
          reason: '段落数量不足3段'
        }
      });
    }

    const p1Ending = paragraphs[0].slice(-100);
    const p2Ending = paragraphs[1].slice(-100);
    const p3Ending = paragraphs[2].slice(-100);

    const isP3Repetitive = checkRepetition(p1Ending, p2Ending, p3Ending);

    return NextResponse.json({
      passed: !isP3Repetitive,
      riskType: isP3Repetitive ? "structure_repetition" : null,
      details: {
        p1Signature: p1Ending,
        p2Signature: p2Ending,
        p3Signature: p3Ending,
        isP3Repetitive,
        reason: isP3Repetitive ? '检测到段落结尾结构重复' : '未检测到重复'
      }
    });
  } catch (error) {
    console.error('Global window validation error:', error);
    return NextResponse.json({
      passed: true,
      riskType: null,
      details: {
        p1Signature: '',
        p2Signature: '',
        p3Signature: '',
        isP3Repetitive: false,
        reason: '校验失败'
      }
    }, { status: 500 });
  }
}

function checkRepetition(p1: string, p2: string, p3: string): boolean {
  const simpleFeatures1 = extractSimpleFeatures(p1);
  const simpleFeatures2 = extractSimpleFeatures(p2);
  const simpleFeatures3 = extractSimpleFeatures(p3);
  
  return simpleFeatures1 === simpleFeatures2 && simpleFeatures2 === simpleFeatures3;
}

function extractSimpleFeatures(text: string): string {
  const hasQuestion = text.includes('？');
  const hasExclamation = text.includes('！');
  const hasPeriod = text.includes('。');
  const lastChar = text.slice(-1);
  
  return `${hasQuestion}-${hasExclamation}-${hasPeriod}-${lastChar}`;
}
