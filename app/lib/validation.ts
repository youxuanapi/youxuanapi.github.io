const BASE_BLACKLIST = [
  '首先', '其次', '此外', '总之', '综上所述', '毫无疑问', '显而易见',
  '烟火气', '仪式感', '治愈', '时光', '岁月', '抽离', '馈赠', '不可复制',
  '底层逻辑', '赋能', '共鸣', '探索和努力', '不辜负当下', '岁月静好',
  '松弛感', '情绪价值', '总而言之', '深刻体会', '不可或缺', '不可避免',
  '在这个瞬息万变的时代', '就像是一面镜子'
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

export function checkHumanFlaws(paragraph: string) {
  const hasBaZiError = paragraph.includes('把') && 
    (paragraph.includes('把杯子') || paragraph.includes('把这件事') || paragraph.match(/把[^。！？]{1,10}[^动宾]/));
  
  const hasNaPaError = paragraph.includes('那怕');
  
  const hasDeError = paragraph.includes('的') && paragraph.match(/(慢慢的|快速的|认真的|仔细的)/);
  
  const hasLongCommaSentence = (paragraph.match(/，/g) || []).length >= 6;
  
  const hasNoPronouns = !paragraph.includes('它') && !paragraph.includes('它们');
  
  const hasReverseLogic = paragraph.includes('倒不是') || paragraph.includes('其实也没啥');

  return {
    hasBaZiError,
    hasNaPaError,
    hasDeError,
    hasLongCommaSentence,
    hasNoPronouns,
    hasReverseLogic,
    allPass: hasBaZiError && hasLongCommaSentence && hasNoPronouns && (hasNaPaError || hasDeError)
  };
}

export async function validateAIParagraph(
  paragraph: string,
  exemptions: string[] = []
) {
  const metrics = computeMetrics(paragraph);
  const humanFlaws = checkHumanFlaws(paragraph);
  
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

  if (!humanFlaws.hasBaZiError) {
    score += 25;
    isPass = false;
    risks.push({
      type: 'no_ba_error',
      originalText: paragraph.slice(0, 50),
      suggestion: '必须包含动宾搭配错误的把字句'
    });
  }

  if (!humanFlaws.hasLongCommaSentence) {
    score += 20;
    isPass = false;
    risks.push({
      type: 'no_long_comma',
      originalText: paragraph.slice(0, 50),
      suggestion: '必须包含至少6个逗号的超长句'
    });
  }

  if (!humanFlaws.hasNoPronouns) {
    score += 15;
    isPass = false;
    risks.push({
      type: 'has_pronouns',
      originalText: paragraph.slice(0, 50),
      suggestion: '禁止使用代词"它"或"它们"'
    });
  }

  if (!humanFlaws.hasNaPaError && !humanFlaws.hasDeError) {
    score += 15;
    isPass = false;
    risks.push({
      type: 'no_input_error',
      originalText: paragraph.slice(0, 50),
      suggestion: '必须包含"那怕"错别字或"的地"误用'
    });
  }

  score = Math.min(100, score);
  score = Math.max(0, score);

  return {
    score,
    isPass,
    risks,
    humanFlaws,
  };
}
