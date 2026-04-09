import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { originalText, issues, userPersona, modificationType, historyContext } = await req.json();

    let modifiedText = originalText;

    for (const issue of issues || []) {
      if (issue.type === 'cliche' || issue.suggestion?.includes('套话')) {
        modifiedText = removeCliches(modifiedText);
      }
      if (issue.type === 'burstiness' || issue.suggestion?.includes('句长')) {
        modifiedText = addSentenceVariation(modifiedText);
      }
    }

    const originalLen = originalText.length;
    const modifiedLen = modifiedText.length;
    if (Math.abs(modifiedLen - originalLen) / originalLen > 0.2) {
      return NextResponse.json({ error: "MODIFICATION_TOO_LARGE" }, { status: 400 });
    }

    return NextResponse.json({
      modifiedText,
      explanation: '已自动修复AI特征'
    });
  } catch (error) {
    console.error('Modification error:', error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

function removeCliches(text: string): string {
  const cliches = [
    '首先', '其次', '此外', '总之', '综上所述', '你有没有发现',
    '你知道吗', '相关研究表明', '根据数据显示', '家人们谁懂啊',
    '宝子们', '家人们', '值得注意的是', '毫无疑问', '显而易见'
  ];
  
  let result = text;
  for (const cliche of cliches) {
    result = result.replace(new RegExp(cliche, 'g'), '');
  }
  return result;
}

function addSentenceVariation(text: string): string {
  return text;
}
