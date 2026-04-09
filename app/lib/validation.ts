const BASE_BLACKLIST = [
  '首先', '其次', '此外', '总之', '综上所述', '你有没有发现',
  '你知道吗', '相关研究表明', '根据数据显示', '家人们谁懂啊',
  '宝子们', '家人们', '值得注意的是', '毫无疑问', '显而易见'
];

function splitChineseSentences(text: string) {
  return text.match(/[^。！？；…\n]+[。！？；…\n]?/g) || [text];
}

export function computeMetrics(text: string) {
  const sentences = splitChineseSentences(text);
  const lengths = sentences.map(s => s.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length || 0;
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const burstiness = avgLength > 0 ? ((maxLen - minLen) / avgLength) * 100 : 0;
  
  const blacklistHits = BASE_BLACKLIST.filter(word => 
    new RegExp(`\\b${word}\\b|${word}[。！？；]`).test(text)
  ).length;
  
  const hasShortSentence = lengths.some(l => l < 5);
  const hasLongSentence = lengths.some(l => l > 30);

  return {
    sentenceCount: sentences.length,
    avgLength: Math.round(avgLength),
    burstiness: Math.round(burstiness),
    blacklistHits,
    hasShortSentence,
    hasLongSentence,
  };
}

export async function validateAIParagraph(
  paragraph: string,
  exemptions: string[] = []
) {
  const metrics = computeMetrics(paragraph);
  
  let score = 50;
  const risks: Array<{
    type: string;
    originalText: string;
    position?: string;
    snippet?: string;
    suggestion: string;
  }> = [];
  let isPass = true;

  if (metrics.blacklistHits > 0) {
    score += 30;
    isPass = false;
    risks.push({
      type: 'cliche',
      originalText: paragraph.slice(0, 50),
      suggestion: '删除AI高频套话'
    });
  }

  if (!metrics.hasShortSentence) {
    score += 15;
    isPass = false;
    risks.push({
      type: 'burstiness',
      originalText: paragraph.slice(0, 50),
      suggestion: '增加5字以下的短句'
    });
  }

  if (!metrics.hasLongSentence) {
    score += 10;
    isPass = false;
    risks.push({
      type: 'burstiness',
      originalText: paragraph.slice(0, 50),
      suggestion: '增加30字以上的长句'
    });
  }

  if (metrics.burstiness < 50) {
    score += 15;
    isPass = false;
    risks.push({
      type: 'burstiness',
      originalText: paragraph.slice(0, 50),
      suggestion: '增加句长爆发性，人类写作通常>50%'
    });
  }

  score = Math.min(100, score);
  score = Math.max(0, score);
  isPass = score <= 10;

  return {
    score,
    isPass,
    risks,
  };
}
