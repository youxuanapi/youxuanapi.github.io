import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface MaskEntry {
  placeholder: string;
  original: string;
}

function maskEntities(text: string): { masked: string; maskMap: MaskEntry[] } {
  const maskMap: MaskEntry[] = [];
  let counter = 0;
  const makePlaceholder = () => {
    const id = counter++;
    return `[[#STATIC_ID_${id}#]]`;
  };

  let masked = text;

  const urlPattern = /https?:\/\/[^\s)\]}>，。；：！？、""''）】》]+/g;
  masked = masked.replace(urlPattern, (match) => {
    const placeholder = makePlaceholder();
    maskMap.push({ placeholder, original: match });
    return placeholder;
  });

  const refPattern = /\[\d+\]\s*[^\s\[]*?(?=\s|$)/g;
  masked = masked.replace(refPattern, (match) => {
    const placeholder = makePlaceholder();
    maskMap.push({ placeholder, original: match });
    return placeholder;
  });

  const numberPattern = /(?<!\w)(?:\d+\.?\d*%?)(?!\w)/g;
  masked = masked.replace(numberPattern, (match) => {
    const placeholder = makePlaceholder();
    maskMap.push({ placeholder, original: match });
    return placeholder;
  });

  const properNounPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g;
  masked = masked.replace(properNounPattern, (match) => {
    const placeholder = makePlaceholder();
    maskMap.push({ placeholder, original: match });
    return placeholder;
  });

  return { masked, maskMap };
}

function restoreEntities(text: string, maskMap: MaskEntry[]): string {
  let restored = text;
  for (const entry of maskMap) {
    restored = restored.replaceAll(entry.placeholder, entry.original);
  }
  return restored;
}

function safeSplitParagraph(paragraph: string, maxLen: number): string[] {
  if (paragraph.length <= maxLen) return [paragraph];

  const chunks: string[] = [];
  let remaining = paragraph;

  while (remaining.length > maxLen) {
    let splitPos = -1;
    let inQuote = 0;
    let inParen = 0;

    for (let i = 0; i < remaining.length; i++) {
      const ch = remaining[i];
      if (ch === '\u201c') inQuote++;
      if (ch === '\u201d') inQuote--;
      if (ch === '\uff08') inParen++;
      if (ch === '\uff09') inParen--;

      if (i > 0 && i < remaining.length - 1) {
        const prev = remaining[i];
        if (/\u3002\uff1f\uff01/.test(prev) && inQuote <= 0 && inParen <= 0) {
          if (i + 1 >= maxLen * 0.3) {
            splitPos = i + 1;
          }
        }
      }
    }

    if (splitPos === -1) {
      for (let i = Math.min(maxLen, remaining.length) - 1; i > maxLen * 0.3; i--) {
        if (/\u3002\uff1f\uff01/.test(remaining[i]) && inQuote <= 0 && inParen <= 0) {
          splitPos = i + 1;
          break;
        }
      }
    }

    if (splitPos === -1) {
      splitPos = Math.min(maxLen, remaining.length);
    }

    chunks.push(remaining.slice(0, splitPos));
    remaining = remaining.slice(splitPos);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function splitBySentence(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  let inQuote = 0;
  let inParen = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\u201c') inQuote++;
    if (ch === '\u201d') inQuote--;
    if (ch === '\uff08') inParen++;
    if (ch === '\uff09') inParen--;

    current += ch;

    if (/[。！？\n]/.test(ch) && inQuote <= 0 && inParen <= 0) {
      sentences.push(current);
      current = '';
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current);
  }

  return sentences;
}

interface SentenceAnalysis {
  sentence: string;
  index: number;
  aiScore: number;
  perplexity: number;
  burstiness: number;
  isProtected: boolean;
  needsRewrite: boolean;
}

const AI_PATTERNS = [
  /(?:梳理了|分析了|揭示了|总结了|探讨了|阐述了|论证了|验证了|证明了)/,
  /(?:首先|其次|值得注意的是|综上所述|总而言之|与此同时|一方面|另一方面|在此基础上|由此可见)/,
  /(?:的.*与.*的|不仅.*更是|既.*又.*还)/,
  /(?:不是.*也不是.*而是|从来不是|并非.*而是|不是.*而是)/,
  /(?:本质上|根本上|核心在于|关键在于|毋庸置疑|不可否认|显而易见|众所周知)/,
  /(?:赋能|底层逻辑|顶层设计|闭环|抓手|痛点|赛道|打法|心智|颗粒度|沉淀|对齐|拉齐|复盘)/,
  /(?:感知系统|考量体系|共同单位|情绪价值|能量场|不可复制|共鸣|羁绊|松弛感|瞬息万变)/,
  /(?:因此|所以|于是|故而|由此可见|这表明|这意味着)/,
  /(?:起到了?重要的作用|发挥着?关键的作用|具有?重要意义|产生?深远影响)/,
  /(?:随着.*的发展|在.*背景下|在.*过程中|在.*领域)/,
  /(?:提供了?|带来了?|促进了?|推动了?|提升了?|增强了?)/,
  /(?:日益|不断|持续|愈发|越来越)/,
  /(?:旨在|致力于|专注于|着眼于)/,
  /(?:无疑|必然|势必|注定|毫无疑问)/,
  /(?:由于|此外|深刻影响|深远影响|重要意义|关键作用|关键路径)/,
];

const FAMOUS_NAME_ANCHORS = /(?:林徽因|傅雷|杨绛|钱钟书|鲁迅|张爱玲|余华|莫言|林语堂|季羡林|周国平|史铁生|三毛|海子|顾城|王小波|陈丹青|蒋勋|白先勇|木心)/;

function computePerplexity(sentence: string): number {
  let score = 0;
  const len = sentence.length;
  if (len < 4) return 0.1;

  for (const pattern of AI_PATTERNS) {
    if (pattern.test(sentence)) score += 0.15;
  }

  const charFreq: Record<string, number> = {};
  for (const ch of sentence) {
    charFreq[ch] = (charFreq[ch] || 0) + 1;
  }
  const uniqueRatio = Object.keys(charFreq).length / len;
  if (uniqueRatio < 0.35) score += 0.1;

  const conjunctionPattern = /(?:因此|所以|于是|故而|由此可见|这表明|这意味着|由于|此外|同时|并且|而且|然而|但是|虽然|尽管|不仅|而是|即|则|且|并|而|又|也|还)/g;
  const conjunctionMatches = sentence.match(conjunctionPattern);
  if (conjunctionMatches) {
    const conjunctionRatio = conjunctionMatches.length / len;
    if (conjunctionRatio > 0.04) score += 0.25;
    else if (conjunctionRatio > 0.02) score += 0.15;
  }

  const predictableChain = /(?:由于.*因此|虽然.*但是|不仅.*而且|既.*又|一方面.*另一方面|首先.*其次|综上.*因此)/;
  if (predictableChain.test(sentence)) score += 0.2;

  if (/(?:的|了|是|在|和|与|对|为|从|被|把|让|给|向)/.test(sentence)) {
    const funcCount = (sentence.match(/(?:的|了|是|在|和|与)/g) || []).length;
    const funcRatio = funcCount / len;
    if (funcRatio > 0.15) score += 0.05;
  }

  if (/^[^，。！？、]{20,}[。]$/.test(sentence.trim())) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function computeBurstiness(sentences: string[]): number {
  if (sentences.length < 2) return 0.5;

  const lengths = sentences.map(s => s.replace(/\s/g, '').length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  if (cv < 0.3) return 0.8;
  if (cv < 0.5) return 0.5;
  return 0.2;
}

function isProtectedSentence(sentence: string): boolean {
  const hasData = /\d+\.?\d*%?/.test(sentence) && (sentence.match(/\d+/g) || []).length >= 2;
  const hasQuote = /[\u201c\u201d""'']/.test(sentence);
  const hasCitation = /\[\d+\]/.test(sentence);
  const hasProperNoun = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(sentence);
  const hasPlaceholder = /\[\[#STATIC_ID_\d+#\]\]/.test(sentence);

  return hasData || hasQuote || hasCitation || hasProperNoun || hasPlaceholder;
}

function analyzeSentences(sentences: string[]): SentenceAnalysis[] {
  const burstiness = computeBurstiness(sentences);

  return sentences.map((sentence, index) => {
    const perplexity = computePerplexity(sentence);
    const aiScore = perplexity * 0.6 + burstiness * 0.4;
    const protected_ = isProtectedSentence(sentence);
    const hasFamousAnchor = FAMOUS_NAME_ANCHORS.test(sentence);

    const needsRewrite = (aiScore >= 0.15 || hasFamousAnchor) && !protected_;

    return {
      sentence,
      index,
      aiScore: hasFamousAnchor ? Math.max(aiScore, 0.8) : aiScore,
      perplexity,
      burstiness,
      isProtected: protected_,
      needsRewrite,
    };
  });
}

function buildContextWindow(sentences: string[], index: number): string {
  const prev = index > 0 ? sentences[index - 1] : '';
  const next = index < sentences.length - 1 ? sentences[index + 1] : '';
  let context = '';
  if (prev) context += `[前文参考：${prev.trim()}]\n`;
  context += `[当前需改写的句子]`;
  if (next) context += `\n[后文参考：${next.trim()}]`;
  return context;
}

function chunkText(text: string, maxChunkLen: number = 400): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.trim().length === 0) continue;
    const subChunks = safeSplitParagraph(para, maxChunkLen);
    chunks.push(...subChunks);
  }

  return chunks;
}

function scanDynamicRules(chunk: string): string[] {
  const rules: string[] = [];

  if (/(?:梳理了|分析了|揭示了|总结了|探讨了|阐述了|论证了|验证了|证明了)/.test(chunk)) {
    rules.push("【强制执行】铲除'动词+了'结构，改用名词化表达或被动语态。");
  }

  if (/(?:首先|其次|值得注意的是|综上所述|总而言之|与此同时|一方面|另一方面|在此基础上|由此可见)/.test(chunk)) {
    rules.push("【强制执行】删除机器感生硬关联词，使用人类口语化/跳跃性逻辑过渡。");
  }

  if (/(?:的.*与.*的|不仅.*更是|既.*又.*还|一方面.*另一方面)/.test(chunk)) {
    rules.push("【强制执行】打破高度对称的排比句，制造人类写作的不规律感。");
  }

  if (chunk.length > 80) {
    rules.push("【强制执行】句子过长，必须在逻辑断点处拆解长句，制造长短句交错的呼吸感。");
  }

  if (/(?:本质上|根本上|核心在于|关键在于|毋庸置疑|不可否认|显而易见|众所周知)/.test(chunk)) {
    rules.push("【强制执行】猎杀'理科生情感词'，将这类绝对化断言降级为平实的人类白话。");
  }

  if (/(?:赋能|底层逻辑|顶层设计|闭环|抓手|痛点|赛道|打法|心智|颗粒度|沉淀|对齐|拉齐|复盘)/.test(chunk)) {
    rules.push("【强制执行】猎杀互联网黑话/行业机器词，替换为普通人能理解的大白话。");
  }

  if (/(?:感知系统|考量体系|共同单位|情绪价值|能量场|不可复制|共鸣|羁绊|松弛感|瞬息万变)/.test(chunk)) {
    rules.push("【强制执行】猎杀机器高频分析词，必须降级为最平实的人类白话。");
  }

  if (/(?:因此|所以|于是|故而|由此可见|这表明|这意味着)/.test(chunk)) {
    rules.push("【强制执行】打断因果链的机器式直线推进，用跳跃性逻辑或反问句替代。");
  }

  if (/(?:起到了?重要的作用|发挥着?关键的作用|具有?重要意义|产生?深远影响)/.test(chunk)) {
    rules.push("【强制执行】猎杀'起到了重要作用'类的空洞套话，用具体动作或结果替代。");
  }

  if (/(?:不仅.*也|不但.*而且|既.*又|一方面.*另一方面)/.test(chunk)) {
    rules.push("【强制执行】强制拆解双重否定/双重肯定的对称结构，只保留一层意思，另一层用转折或省略处理。");
  }

  if (/(?:随着.*的发展|在.*背景下|在.*过程中|在.*领域)/.test(chunk)) {
    rules.push("【强制执行】猎杀'随着…的发展'类开头套话，直接从事实或观点入手。");
  }

  if (/(?:可以说|换言之|简而言之|总的来说|概括来说)/.test(chunk)) {
    rules.push("【强制执行】删除'可以说'类的多余过渡词，直接陈述。");
  }

  if (/(?:提供了?|带来了?|促进了?|推动了?|提升了?|增强了?)/.test(chunk)) {
    rules.push("【强制执行】猎杀'提供/带来/促进/推动'等空洞动词，改用具体的名词化表达。");
  }

  if (/(?:日益|不断|持续|愈发|越来越)/.test(chunk)) {
    rules.push("【强制执行】猎杀'日益/不断/持续'等渐进式副词，用具体的时间/程度描述替代。");
  }

  if (/(?:旨在|致力于|专注于|着眼于)/.test(chunk)) {
    rules.push("【强制执行】猎杀'旨在/致力于'等目的性套话，直接说做了什么。");
  }

  if (/(?:无疑|必然|势必|注定|毫无疑问)/.test(chunk)) {
    rules.push("【强制执行】猎杀绝对化断言，加入不确定性语气或限定条件。");
  }

  if (/(?:综上所述|总而言之|概括而言|总体来看)/.test(chunk)) {
    rules.push("【强制执行】猎杀'综上所述'类的总结套话，用反问或感叹句收尾。");
  }

  if (/(?:掏心掏肺|非你不可|谁没|点[。，、]|啊[。，、]|吗[。，、]|呢[。，、])/.test(chunk)) {
    rules.push("【强制执行】封杀新媒体烂大街的煽情词和语气助词滥用，替换为更克制的表达或直接删除。");
  }

  if (/(?:第一件|第二件|第三件|首先.*其次|其一.*其二|第一.*第二)/.test(chunk)) {
    rules.push("【强制执行】禁止逻辑递进式罗列！改为：用一个具体的画面开场（如：那天他站在风里，什么都没说），中间突然插入一句极度冷峻的客观事实，结尾严禁升华，直接掐断。");
  }

  if (/(?:杨绛|傅雷|鲁迅|张爱玲|余华|莫言|钱钟书|林语堂|季羡林|周国平)/.test(chunk)) {
    rules.push("【强制执行】禁止直接引用名人名字！以他们的故事为内核，用第一人称或旁观者视角重新解构，绝不允许出现人物名字。");
  }

  if (/(?:由于|此外|深刻影响|深远影响|重要意义|关键作用)/.test(chunk)) {
    rules.push("【V9.2 Anti-Pattern】封杀学术八股词元！'由于'改用'因为'或直接省略；'此外'删除或改用跳跃性连接；'深刻影响/深远影响/重要意义/关键作用'改用具体动作或结果描述。");
  }

  if (/(?:\S的\S与\S的\S)/.test(chunk)) {
    rules.push("【V9.2 Symmetry Destruction】检测到'A的B与C的D'对称结构！强制将其中一个支路改为动词引导或被动语态。例：'知识的积累与能力的提升'→'在积累知识的同时，确保能力也跟着长出来'。");
  }

  if (/(?:不是.*也不是.*而是|从来不是|并非.*而是|不是.*而是)/.test(chunk)) {
    rules.push("【V9.7.1 Symmetry Destruction】检测到'不是…也不是…而是…'翻译腔结构！强制粉碎为口语化重述。例：'不争对错，不是懦弱，也不是妥协'→'所谓不争，跟懦弱没半毛钱关系，更谈不上妥协，无非是心里揣着那点珍惜'。");
  }

  if (FAMOUS_NAME_ANCHORS.test(chunk)) {
    rules.push("【V9.7.1 Famous Anchor Pulse】检测到名家案例！执行：(1)禁止出现人物名字，用旁观者视角重构故事；(2)在案例叙述后强制插入4字断裂句（如：事实如此。/ 没法反驳。/ 谁知道呢。）;(3)破坏案例的工整叙述结构，插入主观评价或情绪断点。");
  }

  if (/(?:值得注意的是|从来不是|关键路径|事实上|实际上|客观来说|严格来说)/.test(chunk)) {
    rules.push("【V9.7.1 Translation Tone Erasure】检测到翻译腔连接词！'值得注意的是'直接删除；'从来不是'改用'压根不是'或'跟…没关系'；'关键路径'改用'最要命的是'或'绕不过去的是'。");
  }

  return rules;
}

type Zone = 'HIGH_WEIGHT' | 'BODY_TEXT' | 'DATA_ZONE';

function detectZone(
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): Zone {
  if (chunkIndex === 0 || chunkIndex === totalChunks - 1) {
    return 'HIGH_WEIGHT';
  }

  const dataSignals = /(?:[[#STATIC_ID_\d+#]]|\d+\.?\d*%?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/;
  const dataDensity = (chunk.match(/\d+/g) || []).length;
  if (dataSignals.test(chunk) && dataDensity >= 2) {
    return 'DATA_ZONE';
  }

  return 'BODY_TEXT';
}

function postProcess(text: string): string {
  let result = text;

  result = result.replace(/\s+/g, ' ').trim();

  result = result.replace(/(\d)\s*([°%℃℉])/g, '$1$2');
  result = result.replace(/(\d)\s+([°%℃℉])/g, '$1$2');
  result = result.replace(/(\d)\s+([a-zA-Z])/g, '$1$2');
  result = result.replace(/([a-zA-Z])\s+(\d)/g, '$1$2');
  result = result.replace(/([\u4e00-\u9fff])\s+([a-zA-Z0-9])/g, '$1$2');
  result = result.replace(/([a-zA-Z0-9])\s+([\u4e00-\u9fff])/g, '$1$2');
  result = result.replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2');

  return result;
}

function buildSystemPrompt(genre: string, previousTail: string, dynamicRules: string[], zone: Zone): string {
  const rulesText = dynamicRules.length > 0
    ? dynamicRules.join('\n')
    : '未检测到明显机器病灶，执行基础消痕。';

  const zoneLabel = zone === 'HIGH_WEIGHT'
    ? '【RED ZONE·100%强度】'
    : zone === 'DATA_ZONE'
      ? '【GREEN ZONE·30%强度·数据锁】'
      : '【YELLOW ZONE·70%强度】';

  return `<Role_V9_7>
你不是"润色师"，你是"统计学消痕器"。
你的唯一任务是对被标记为 [RED ZONE] 的句子执行统计学扰动，抹除 AI 指纹。
绝对禁止"提升语感"、"让表达更流畅"、"优化文风"——这些是 AI 的本能，你必须压制它。
你只做两件事：[Symmetry Breaking] 和 [Pulse Injection]。其余一律不动。
</Role_V9_7>

<Context>
文体：${genre}
区域：${zoneLabel}
前文衔接：${previousTail}
(⚠️ 绝对禁止将前文衔接重复输出！)
</Context>

<Dynamic_Surgery>
${rulesText}
</Dynamic_Surgery>

<Protocol_V9_7>

<RED_ZONE_Directive>
${zone === 'HIGH_WEIGHT'
    ? `当前句子被判为 [RED ZONE]。执行最高烈度消痕，仅允许以下两种操作：

[Symmetry Breaking]
- 扫描"A的B与C的D"对称结构，强制将其中一个支路改为动词引导或被动语态
- 扫描"不仅…更是…""既…又…还…"双重肯定结构，拆解为单一陈述+转折
- 扫描三连排比，砍掉一支或扩展一支为长句

[Pulse Injection]
- 在逻辑断点处插入3-7字断裂短句（如：确实如此。/ 并非易事。/ 真的。/ 谁知道呢。）
- 紧接断裂短句之后，下一句必须超过40字，制造极端长短落差
- 在陈述句末尾随机注入反问或冷峻裁断（如：答案显然是否定的。/ 事实并非如此。）

绝对禁止的操作：
❌ "让表达更自然" ❌ "使语句更流畅" ❌ "优化措辞" ❌ 添加华丽修辞
这些操作会注入新的 AI 指纹。你只做结构破坏和脉冲注入。`
    : zone === 'DATA_ZONE'
      ? `当前句子被判为 [GREEN ZONE]。数据锚点锁定。
执行强度：30%——专业术语、人名、数据100%原样保留，严禁变异。
仅允许：替换引导语中的连词（"因此"→"所以"/"数据显示"→"盯着这组数据看"）。`
      : `当前句子被判为 [YELLOW ZONE]。执行标准消痕：

[Symmetry Breaking]（标准强度）
- 检测对称结构并拆解，但允许保留轻度对称
- 将20%主动句改为被动或宾语前置

[Pulse Injection]（标准强度）
- 每3句内插入一个断裂短句
- 禁止使用"此外/总之/值得注意的是/综上所述"

[Verb-Object Cleansing]
- 封杀"动词+了+抽象名词"句式（梳理了/揭示了/验证了）
- 改为"将…拆开来看"或"在…背后发现"`}
</RED_ZONE_Directive>

<Statistical_Perturbation>
在不改变原意的前提下：
- 随机选择5%的普通形容词替换为领域内生僻但精准的术语或具象名词
- 将15%的陈述句改为反问或感叹
- 禁止输出中出现任何英文字符或数字前后的多余半角空格
</Statistical_Perturbation>

<Anti_Pattern_Dictionary>
以下词元严禁出现在输出中：
由于、此外、值得注意的是、梳理了、揭示了、深刻影响、综上所述、总而言之、与此同时、显而易见、众所周知、毋庸置疑、赋能、底层逻辑、闭环、抓手、痛点、赛道、心智、颗粒度、沉淀、对齐、情绪价值、能量场、不可复制、共鸣、羁绊、松弛感、日益、不断、持续、愈发、越来越、掏心掏肺、非你不可、绝绝子
</Anti_Pattern_Dictionary>

<Figure_Anonymization>
禁止直接引用杨绛、傅雷、鲁迅、张爱玲、余华、莫言、钱钟书、林语堂、季羡林、周国平。
以故事为内核，用旁观者视角重新解构，绝不允许出现人物名字。
</Figure_Anonymization>

<Grammar_Flaw_Allowance>
允许且鼓励出现少量非标准口语表达，模拟人类情绪断点：
- "这种人，真的，拉黑算了"
- "说白了就是不想管"
- "别装了，谁不知道怎么回事"
</Grammar_Flaw_Allowance>

<Rule_A_Zero_Rhetorical_Policy>
绝对封杀反问句和设问句！这是最高优先级红线！
1. 封杀句式：禁止出现"难道…"、"怎么能…"、"谁没…"、"岂不是…"、"怎能…"。
2. 封杀标点与语气词：禁止句子以"吗？"、"呢？"、"啊？"、"吧？"结尾。
3. 替代方案：将所有带有情绪的疑问全部压实为冷峻的客观陈述句。
   - "难道这不是尊重吗？" → "这就是最妥帖的尊重。"
   - "怎么能说没有意义呢？" → "说它没有意义，站不住脚。"
   - "谁没经历过低谷？" → "低谷是每个人都绕不过去的。"
违反此规则即判定任务失败！
</Rule_A_Zero_Rhetorical_Policy>

<Rule_B_Declarative_Inversion>
为了制造 Burstiness（突发性），允许使用倒装句（如宾语前置、状语后置），但必须是陈述语气。
- 宾语前置："我们不能随意评价别人的人生" → "别人的人生，轮不到外人来定性。"
- 状语后置："他在深夜独自写完了那封信" → "那封信，他在深夜独自写完。"
- 主语延迟："这件事的本质其实很简单" → "说到底，就这么回事。"
倒装是制造突发性的正确手段，反问句不是。
</Rule_B_Declarative_Inversion>

</Protocol_V9_7>

<Iron_Constraints>
1. 格式保护：Markdown 样式（**、-）必须完美保留。
2. 实体标记保护：[[#STATIC_ID_X#]] 必须原封不动放在对应位置。
3. 文本长度：重写后长度与原文保持在 ±15% 以内。
4. 零废话：只输出重写后的正文，禁止出现"好的"/"已重写"等对话前缀。
5. 可读性防御：禁止使用语法错误的生僻词，仅允许"低概率但精准"的专业词汇替代。
</Iron_Constraints>

<Task>
仅输出对以下文本块的消痕结果：`;
}

async function callLLMWithRetry(
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.85,
          stream: false,
          frequency_penalty: 0.6,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if ((status === 429 || status >= 500) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`LLM \u8c03\u7528\u5931\u8d25: ${status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const rhetoricalPattern = /(?:难道|怎么能|谁没|岂不是|怎能).*?[？?]/g;
      const trailingQuestionPattern = /[吗呢啊吧][？?][。！]?\s*$/gm;
      if (rhetoricalPattern.test(content) || trailingQuestionPattern.test(content)) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return content;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('LLM \u8c03\u7528\u5931\u8d25\uff0c\u5df2\u8017\u5c3d\u91cd\u8bd5');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, genre, model, apiBaseUrl, apiKey } = body;
    const originalText = text || '';

    if (!originalText) {
      return NextResponse.json({ error: '\u8bf7\u63d0\u4f9b\u9700\u8981\u4f18\u5316\u7684\u6587\u672c' }, { status: 400 });
    }
    if (!apiBaseUrl || !apiKey || !model) {
      return NextResponse.json({ error: '\u8bf7\u5148\u914d\u7f6eAPI' }, { status: 400 });
    }

    const effectiveGenre = genre || '\u901a\u7528\u8bae\u8bba\u6587';

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let heartbeatId: ReturnType<typeof setInterval> | null = null;

        const startHeartbeat = () => {
          heartbeatId = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch {
              if (heartbeatId) clearInterval(heartbeatId);
            }
          }, 15000);
        };

        const stopHeartbeat = () => {
          if (heartbeatId) {
            clearInterval(heartbeatId);
            heartbeatId = null;
          }
        };

        const sendEvent = (event: string, data: Record<string, unknown>) => {
          const payload = JSON.stringify({ event, ...data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        try {
          startHeartbeat();

          sendEvent('status', { message: '启动实体免疫扫描，锁定数据实体...' });

          const { masked, maskMap } = maskEntities(originalText);

          sendEvent('status', { message: 'V9.4 选择性手术引擎启动，按句切分...' });

          const sentences = splitBySentence(masked);
          const totalSentences = sentences.length;

          sendEvent('status', { message: `文本已切分为 ${totalSentences} 个句子，启动边缘侧检测...` });

          const analysis = analyzeSentences(sentences);
          const dangerousCount = analysis.filter(a => a.needsRewrite).length;
          const safeCount = analysis.filter(a => !a.needsRewrite).length;
          const avgPerplexity = analysis.reduce((sum, a) => sum + a.perplexity, 0) / analysis.length;

          sendEvent('scan_result', {
            total: totalSentences,
            dangerous: dangerousCount,
            safe: safeCount,
            avgPerplexity: Math.round(avgPerplexity * 100) / 100,
            message: `检测完成：${dangerousCount} 句需改写，${safeCount} 句安全通过`,
          });

          let previousTail = '';

          for (let i = 0; i < analysis.length; i++) {
            const item = analysis[i];

            if (!item.needsRewrite) {
              const restoredSentence = restoreEntities(item.sentence, maskMap);
              const processedSentence = postProcess(restoredSentence);
              previousTail = processedSentence.slice(-50);

              sendEvent('sentence_safe', {
                index: i + 1,
                total: totalSentences,
                content: processedSentence,
                aiScore: Math.round(item.aiScore * 100) / 100,
                perplexity: Math.round(item.perplexity * 100) / 100,
              });
              continue;
            }

            const contextWindow = buildContextWindow(sentences, i);
            const dynamicRules = scanDynamicRules(item.sentence);
            const zone = item.isProtected
              ? 'DATA_ZONE' as Zone
              : (i === 0 || i === analysis.length - 1) ? 'HIGH_WEIGHT' as Zone : 'BODY_TEXT' as Zone;

            const systemPrompt = buildSystemPrompt(effectiveGenre, previousTail, dynamicRules, zone);
            const userPrompt = `${contextWindow}\n\n${item.sentence}`;

            sendEvent('sentence_surgery', {
              index: i + 1,
              total: totalSentences,
              aiScore: Math.round(item.aiScore * 100) / 100,
              perplexity: Math.round(item.perplexity * 100) / 100,
              zone,
              message: `手术中 ${i + 1}/${totalSentences} (AI=${Math.round(item.aiScore * 100)}%)`,
            });

            let rewrittenSentence: string;
            try {
              rewrittenSentence = await callLLMWithRetry(apiBaseUrl, apiKey, model, systemPrompt, userPrompt);
            } catch {
              sendEvent('sentence_error', {
                index: i + 1,
                message: `句子 ${i + 1} 改写失败，保留原文`,
              });
              rewrittenSentence = item.sentence;
            }

            const restoredSentence = restoreEntities(rewrittenSentence, maskMap);
            const processedSentence = postProcess(restoredSentence);
            previousTail = processedSentence.slice(-50);

            const currentAvgP = analysis.slice(0, i + 1).reduce((s, a) => s + a.perplexity, 0) / (i + 1);

            sendEvent('sentence_done', {
              index: i + 1,
              total: totalSentences,
              original: item.sentence,
              rewritten: processedSentence,
              avgPerplexity: Math.round(currentAvgP * 100) / 100,
            });
          }

          const finalAvgP = analysis.reduce((s, a) => s + a.perplexity, 0) / analysis.length;
          sendEvent('done', {
            message: '选择性手术完成！',
            totalSentences,
            dangerousCount,
            safeCount,
            avgPerplexity: Math.round(finalAvgP * 100) / 100,
          });
          stopHeartbeat();
          controller.close();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : '\u4f18\u5316\u8fc7\u7a0b\u5f02\u5e38';
          console.error('\u6d41\u5904\u7406\u9519\u8bef:', error);
          sendEvent('error', { message: msg });
          stopHeartbeat();
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '\u4f18\u5316\u5931\u8d25';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
