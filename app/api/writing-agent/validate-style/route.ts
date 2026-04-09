import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { paragraph, persona, outlineContext, previousContent } = await req.json();

    const totalScore = 90;
    const isPass = true;
    const issues: Array<{
      dimension: string;
      description: string;
      fixSuggestion: string;
    }> = [];

    const fixedStructure = persona?.fixedStructureParadigm || '';
    const fixedNarrative = persona?.fixedNarrativeParadigm || '';
    const coreValueLine = outlineContext?.coreValueLine || '';

    if (!fixedStructure && !fixedNarrative) {
      issues.push({
        dimension: 'paradigm',
        description: '未检测到用户固定写作范式',
        fixSuggestion: '请先创建写作人格'
      });
    }

    return NextResponse.json({
      totalScore,
      isPass,
      issues,
    });
  } catch (error) {
    console.error('Style validation error:', error);
    return NextResponse.json({
      totalScore: 50,
      isPass: false,
      issues: [{
        dimension: 'system',
        description: '校验失败',
        fixSuggestion: '请重试'
      }],
    }, { status: 500 });
  }
}
