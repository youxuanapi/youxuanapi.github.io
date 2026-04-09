// 文章编辑与风格学习系统 - 类型定义

// 写作风格特征
export interface WritingStyle {
  id: string;
  userId: string;
  name: string;
  description: string;
  // 语言习惯
  languageHabits: {
    formality: number; // 0-100, 0=口语化, 100=正式
    complexity: number; // 0-100, 词汇复杂度
    emotionDensity: number; // 0-100, 情感词汇密度
  };
  // 句式结构
  sentenceStructure: {
    avgLength: number; // 平均句长
    shortSentenceRatio: number; // 短句占比
    complexSentenceRatio: number; // 复合句占比
    questionRatio: number; // 问句占比
  };
  // 表达方式
  expressionStyle: {
    directness: number; // 0-100, 直接程度
    narrativePerspective: 'first' | 'second' | 'third'; // 叙事视角
    rhythm: 'fast' | 'medium' | 'slow'; // 叙事节奏
  };
  // 词汇偏好
  vocabulary: {
    preferredWords: string[]; // 偏好词汇
    avoidedWords: string[]; // 避免词汇
    fieldTerms: string[]; // 领域术语
  };
  // 段落组织
  paragraphStyle: {
    avgLength: number; // 平均段落长度
    structure: 'loose' | 'tight'; // 段落结构松紧
  };
  // 学习记录
  learningCount: number;
  lastLearnedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 风格学习记录
export interface StyleLearningRecord {
  id: string;
  styleId: string;
  originalText: string;
  modifiedText: string;
  analysis: StyleAnalysis;
  learnedAt: string;
}

// 风格分析结果
export interface StyleAnalysis {
  styleNote: string;
  changes: TextChange[];
  rules: StyleRule[];
  features: StyleFeatures;
}

// 文本修改对比
export interface TextChange {
  original: string;
  modified: string;
  reason: string;
  type: 'vocabulary' | 'sentence' | 'tone' | 'structure';
}

// 风格规则
export interface StyleRule {
  category: 'narrative_style' | 'vocabulary' | 'sentence' | 'tone' | 'structure';
  avoid: string[];
  prefer: string[];
  note: string;
  confidence: number; // 0-1, 规则置信度
}

// 风格特征提取
export interface StyleFeatures {
  wordFrequency: Record<string, number>;
  sentencePatterns: string[];
  transitionWords: string[];
  emotionIndicators: string[];
}

// 文章
export interface Article {
  id: string;
  userId: string;
  title: string;
  content: string;
  htmlContent: string;
  wordCount: number;
  styleId?: string;
  // 编辑历史
  editHistory: EditHistory[];
  // 版本控制
  versions: ArticleVersion[];
  // 元数据
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 编辑历史
export interface EditHistory {
  id: string;
  articleId: string;
  content: string;
  htmlContent: string;
  wordCount: number;
  operation: string;
  timestamp: string;
}

// 文章版本
export interface ArticleVersion {
  id: string;
  articleId: string;
  version: number;
  content: string;
  htmlContent: string;
  wordCount: number;
  changeDescription: string;
  createdAt: string;
}

// 优化设置
export interface OptimizationSettings {
  intensity: 'light' | 'medium' | 'deep'; // 优化强度
  preserveStructure: boolean; // 保留结构
  preserveKeywords: boolean; // 保留关键词
  targetStyleId?: string; // 目标风格
}

// 优化结果
export interface OptimizationResult {
  original: string;
  optimized: string;
  changes: TextChange[];
  styleScore: number; // 风格匹配度
  originalityScore: number; // 原创度评分
}

// 原创性检测报告
export interface OriginalityReport {
  score: number; // 0-100
  similarFragments: SimilarFragment[];
  aiProbability: number; // AI生成概率
  suggestions: string[];
}

// 相似片段
export interface SimilarFragment {
  text: string;
  similarity: number;
  source?: string;
  startIndex: number;
  endIndex: number;
}

// 编辑器状态
export interface EditorState {
  article: Article | null;
  currentContent: string;
  currentHtml: string;
  wordCount: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  undoStack: string[];
  redoStack: string[];
  selectedStyle: WritingStyle | null;
  isLearning: boolean;
  isOptimizing: boolean;
  learningProgress: number;
  optimizationProgress: number;
}

// API配置
export interface ApiConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

// 编辑器工具栏配置
export interface ToolbarConfig {
  showTextStyle: boolean;
  showParagraphStyle: boolean;
  showLists: boolean;
  showTable: boolean;
  showImage: boolean;
  showLink: boolean;
  showAlign: boolean;
  showColor: boolean;
}
