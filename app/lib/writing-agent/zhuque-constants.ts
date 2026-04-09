// 朱雀AI检测专属硬阈值配置
// 这些阈值必须硬编码锁定，不可修改

export const ZHUQUE_THRESHOLDS = {
  // 单段落朱雀预校验综合AI分数
  SINGLE_PARAGRAPH_AI_SCORE_MAX: 3,
  
  // 全文本朱雀终检综合AI分数
  FULL_TEXT_AI_SCORE_MAX: 10,
  
  // 中文虚词使用频率与用户人格偏差率
  FUNCTION_WORD_DEVIATION_MAX: 5,
  
  // 标点使用频率与用户人格偏差率
  PUNCTUATION_DEVIATION_MAX: 5,
  
  // 朱雀AI高频N-gram短语出现次数
  ZHUQUE_HIGH_FREQUENCY_PHRASE_MAX_COUNT: 0,
  
  // 用户专属独家内容占比
  EXCLUSIVE_CONTENT_RATIO_MIN: 30,
  
  // 全文句长变化幅度
  SENTENCE_LENGTH_VARIATION_MIN: 40,
  
  // 跨段落句式/结构重复出现次数
  CROSS_PARAGRAPH_REPETITION_MAX: 2,
  
  // 文风一致性校验总分
  STYLE_VALIDATION_SCORE_MIN: 90,
  
  // 核心主线一致性校验总分
  MAINLINE_VALIDATION_SCORE_MIN: 90,
  
  // 核心关键点覆盖率
  KEY_POINT_COVERAGE_MIN: 100,
  
  // 全文重复度
  FULL_TEXT_DUPLICATION_MAX: 3,
  
  // 单段落重复度
  PARAGRAPH_DUPLICATION_MAX: 5,
  
  // AI高频内容重复度
  AI_HIGH_FREQUENCY_DUPLICATION_MAX: 2,
} as const;

// 朱雀AI高频N-gram短语禁用清单（基础版）
export const ZHUQUE_HIGH_FREQUENCY_BAN_LIST = [
  "家人们谁懂啊",
  "总而言之",
  "综上所述",
  "你有没有发现",
  "家人们",
  "宝子们",
  "家人们好",
  "今天给大家分享",
  "首先",
  "其次",
  "最后",
  "第一",
  "第二",
  "第三",
  "第四",
  "第五",
  "一方面",
  "另一方面",
  "值得一提的是",
  "不得不说",
  "说真的",
  "说实话",
  "其实",
  "然而",
  "但是",
  "因此",
  "所以",
  "于是",
  "接着",
  "然后",
  "随后",
  "紧接着",
  "随之而来",
  "综上所述",
  "总而言之",
  "概括来说",
  "简而言之",
  "长话短说",
  "一句话总结",
  "总的来说",
  "整体而言",
  "从整体来看",
  "从某种意义上说",
  "在某种程度上",
  "可以这么说",
  "换个角度看",
  "从另一个角度来看",
  "客观来说",
  "主观来讲",
  "个人认为",
  "我觉得",
  "我认为",
  "在我看来",
  "依我之见",
  "据我所知",
  "据了解",
  "据悉",
  "据报道",
  "根据调查",
  "根据数据",
  "研究表明",
  "数据显示",
  "统计结果表明",
  "专家指出",
  "相关人士表示",
  "业内人士认为",
  "有消息称",
  "有分析认为",
  "有观点认为",
  "有专家表示",
  "有业内人士指出",
] as const;

// 赛道化规则配置
export const TRACK_CONFIGS = {
  "情感文": {
    name: "情感文/故事文/生活随笔",
    aiScoreMax: 5,
    naturalFlawRateMin: 30,
    allowHardTransition: true,
  },
  "职场干货": {
    name: "职场干货/自媒体干货文",
    aiScoreMax: 8,
    naturalFlawRateMin: 15,
    allowHardTransition: false,
  },
  "申论": {
    name: "申论/机关公文/学术论文",
    aiScoreMax: 15,
    naturalFlawRateMin: 0,
    allowHardTransition: false,
  },
  "财经分析": {
    name: "财经分析/行业研究/专业内容",
    aiScoreMax: 10,
    naturalFlawRateMin: 5,
    allowHardTransition: false,
  },
  "短视频文案": {
    name: "短视频文案/口播稿",
    aiScoreMax: 5,
    naturalFlawRateMin: 35,
    allowHardTransition: true,
  },
} as const;

export type TrackType = keyof typeof TRACK_CONFIGS;
