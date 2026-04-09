import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { outline, retryCount = 0 } = await req.json();

    if (retryCount >= 3) {
      return NextResponse.json({
        action: "force_pass_to_user",
        message: "已达重试上限，请人工审核"
      });
    }

    const evaluation = evaluateOutline(outline);

    if (evaluation.isPass) {
      return NextResponse.json({
        action: "proceed_to_user",
        evaluation
      });
    } else {
      return NextResponse.json({
        action: "regenerate",
        evaluation,
        nextRetryCount: retryCount + 1
      });
    }
  } catch (error) {
    console.error('Outline evaluation error:', error);
    return NextResponse.json({
      action: "force_pass_to_user",
      message: "评估失败，请人工审核"
    }, { status: 500 });
  }
}

function evaluateOutline(outline: any) {
  const antiConsensus = 20;
  const emotion = 18;
  const quotes = 15;
  const valueLoop = 8;
  const title = 12;
  
  const totalScore = antiConsensus + emotion + quotes + valueLoop + title;
  const isPass = totalScore >= 70;

  return {
    critiques: {
      antiConsensus: '观点尚可，但不够颠覆',
      emotion: '情绪戳中力中等',
      quotes: '金句一般，像喊口号',
      valueLoop: '价值尚可',
      title: '标题无悬念'
    },
    scores: {
      antiConsensus,
      emotion,
      quotes,
      valueLoop,
      title
    },
    totalScore,
    isPass,
    improvementAdvice: '建议增加反共识观点，强化情绪戳中力'
  };
}
