// 写作Agent系统 V2.0 - 完整类型定义
// 基于「专属写作Agent系统」全模块完整重构修改方案 V2.0

export type TaskStatus = 
  | 'pending'           // 待初始化
  | 'researching'       // 调研中
  | 'outline_pending'   // 大纲待确认
  | 'generating'         // 生成中
  | 'validating'         // 校验中
  | 'modifying'          // 修改中
  | 'final_reviewing'    // 终检中
  | 'completed'         // 已完成
  | 'failed'            // 已失败
  | 'cancelled'         // 已取消
  | 'paused';           // 已暂停

export type ParagraphStatus = 
  | 'pending'
  | 'generating'
  | 'validating_style'
  | 'validating_originality'
  | 'validating_ai'
  | 'validating_mainline'
  | 'modifying'
  | 'completed'
  | 'failed';

// ==================== 模块1：写作人格包类型 ====================
export interface WritingPersonaV2 {
  id: string;
  userId: string;
  name: string;
  description: string;
  trackType: string;
  
  quantitativeFeatures: {
    avgSentenceLength: number;
    sentenceLengthMin: number;
    sentenceLengthMax: number;
    sentenceJumpFrequency: number;
    avgParagraphSentenceCount: number;
    paragraphSentenceMin: number;
    paragraphSentenceMax: number;
    singleSentenceParagraphRatio: number;
    avgLineBreakWordCount: number;
    commaFrequencyPer100Words: number;
    periodFrequencyPer100Words: number;
    questionMarkFrequencyPer100Words: number;
    exclamationMarkFrequencyPer100Words: number;
    functionWordFrequency?: {
      dePer100Words: number;
      lePer100Words: number;
      zhePer100Words: number;
      guoPer100Words: number;
      modalParticlePer100Words: number;
      functionWordVariance: number;
    };
  };

  styleMetrics: {
    formality: number;
    complexity: number;
    emotionDensity: number;
    directness: number;
    dialogueSense: number;
    oralLevel: number;
    naturalFlawRate: number;
    storyTendency: number;
    thinkingJumpFrequency: number;
    semanticJumpFrequency?: number;
  };

  vocabularyFeatures: {
    favoriteWords: string[];
    avoidedWords: string[];
    transitionWords: string[];
    sentencePatterns: string[];
    metaphorPatterns: string[];
    modalParticleHabits: string[];
    aiHighFrequencyBanList: string[];
  };

  narrativeFeatures: {
    articleStructurePreference: string;
    paragraphConnectionMode: string;
    argumentHabits: string;
    openingParadigm: string;
    endingParadigm: string;
    coreValueOutputMode: string;
    paragraphEndingHabits: string;
  };

  cognitionFeatures: {
    viewTendency: string;
    perspectivePreference: 'first' | 'second' | 'third';
    emotionScale: string;
    userStanding: string;
    coreCognition: string[];
    emotionCurveHabits: string;
  };

  naturalFlawLibrary: {
    flawTypes: string[];
    flawFrequency: number;
    flawScenes: string[];
  };

  antiAiExemptList: {
    exemptSentencePatterns: string[];
    exemptStructurePatterns: string[];
    exemptEndingHabits: string[];
  };

  generationRules: {
    sentenceLengthRule: string;
    paragraphRule: string;
    vocabularyRule: string;
    narrativeRule: string;
    structureRule: string;
    realismRule: string;
    exemptRule: string;
  };

  exclusiveLibrary: {
    exclusiveCases: string[];
    coreViewpoints: string[];
    sceneDetails: string[];
  };

  fixedStructureParadigm: {
    fullTextStructure: string;
    moduleInnerStructure: string;
    typesettingRules: string;
    viewProgressiveRule: string;
  };

  fixedNarrativeParadigm: {
    corePersona: string;
    narrativeCore: string;
    empathyLogic: string;
    firstPersonRule: string;
    dialoguePosture: string;
  };

  fixedExpressionRules: {
    avgSentenceLength: number;
    maxParagraphSentenceCount: number;
    invalidExpressionBan: string[];
    goldenSentenceRule: string;
    quoteRule: string;
  };

  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

// ==================== 模块2：深度调研类型 ====================
export interface ResearchReportV2 {
  id: string;

  competitorAnalysis: {
    source: string;
    coreViewpoints: string[];
    userApprovedHighlights: string[];
    contentWeaknesses: string[];
    userComplaints: string[];
  }[];

  homogeneityBanList: string[];
  aiHighFrequencyBanList: string[];
  zhuqueHighFrequencyBanList: string[];

  userPainPoints: {
    functionalPainPoints: string[];
    emotionalPainPoints: string[];
  };

  unmetNeeds: string[];

  differentiationAngles: {
    angleName: string;
    corePositioning: string;
    differenceFromCompetitors: string;
    userValue: string;
    contentImplementationPath: string;
    exclusiveMaterialDirection: string;
  }[];

  hotTrends: string[];
  exclusiveMaterialDirections: string[];

  generatedAt: string;
}

// ==================== 模块3：大纲类型 ====================
export interface OutlineV2 {
  id: string;
  title: string;
  theme: string;
  coreValueLine: string;
  trackType: string;
  fullTextConstraintRules: string;
  antiAiStructureRules: string;
  openingClosingEchoRule: string;

  sections: {
    corePosition: string;
    weight: number;
    priority: 'high' | 'medium' | 'low';
    wordRange: { min: number; max: number };
    coreKeyPoints: string[];
    emotionRhythm: string;
    mainLineRelevance: string;
    requiredMaterial: string;
    bannedContent: string[];
    flawInjectionRule: string;
  }[];

  totalWeight: number;
  homogeneityAvoidanceScore: number;

  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 模块4：段落类型 ====================
export interface ParagraphV2 {
  id: string;
  sectionIndex: number;
  status: ParagraphStatus;
  content?: string;
  validationResults?: ValidationResultsV2;
  retryCount: number;
  modifyCount: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== 模块5-8：校验结果类型 ====================
export interface ParadigmValidationResult {
  isPass: boolean;
  totalScore: number;
  structureMatchScore: number;
  personaMatchScore: number;
  narrativeMatchScore: number;
  expressionMatchScore: number;
  issues: {
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    suggestion: string;
  }[];
  modifySuggestions: string;
}

export interface ValidationResultsV2 {
  paradigmValidation?: ParadigmValidationResult;
  styleValidation?: StyleValidationResult;
  originalityValidation?: OriginalityValidationResult;
  aiValidation?: AIValidationResult;
  mainLineValidation?: MainLineValidationResult;
  isAllPassed: boolean;
  issues: {
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    location?: { start: number; end: number };
    originalText?: string;
    suggestion: string;
  }[];
}

export interface StyleValidationResult {
  totalScore: number;
  dimensionScores: {
    basicWritingFeatureScore: number;
    vocabularyExpressionScore: number;
    narrativeFeatureScore: number;
    logicStructureScore: number;
    cognitionFeatureScore: number;
    mainLineConsistencyScore: number;
    bannedContentComplianceScore: number;
    realismFeatureScore: number;
  };
  isPass: boolean;
  exemptContent: string[];
  issues: ValidationIssueV2[];
  modifyRule: string;
}

export interface OriginalityValidationResult {
  totalDuplicationRate: number;
  paragraphDuplicationRate: number;
  aiHighFrequencyDuplicationRate: number;
  isPass: boolean;
  duplicationDetails: {
    duplicateText: string;
    source: string;
    duplicationRate: number;
    location: { start: number; end: number };
    suggestion: string;
  }[];
  modifyRule: string;
}

export interface AIValidationResult {
  comprehensiveAiScore: number;
  isPass: boolean;
  exemptContent: string[];
  issues: ValidationIssueV2[];
  modifyRule: string;
}

export interface MainLineValidationResult {
  totalScore: number;
  keyPointCoverage: number;
  mainLineRelevanceScore: number;
  contextConnectionScore: number;
  isPass: boolean;
  issues: ValidationIssueV2[];
  modifyRule: string;
}

export interface ValidationIssueV2 {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location: { start: number; end: number };
  originalText: string;
  suggestion: string;
}

// ==================== 模块10：写作任务类型 ====================
export interface WritingTaskV2 {
  id: string;
  userId: string;
  status: TaskStatus;
  topic: string;
  requirements: string;
  persona?: WritingPersonaV2;
  personaId?: string;
  researchReport?: ResearchReportV2;
  outline?: OutlineV2;
  paragraphs: ParagraphV2[];
  finalDraft?: string;
  modificationLog: {
    timestamp: string;
    paragraphId: string;
    originalContent: string;
    modifiedContent: string;
    issues: ValidationIssueV2[];
  }[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ==================== API 请求/响应类型 ====================
export interface CreatePersonaRequestV2 {
  samples: string[];
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  userId?: string;
}

export interface CreatePersonaResponseV2 {
  persona: WritingPersonaV2;
  analysis: Record<string, unknown>;
}

export interface CreateTaskRequestV2 {
  topic: string;
  requirements?: string;
  persona?: WritingPersonaV2;
  personaId?: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface CreateTaskResponseV2 {
  taskId: string;
  status: TaskStatus;
  outline?: OutlineV2;
  researchReport?: ResearchReportV2;
}

export interface GenerateParagraphRequestV2 {
  taskId: string;
  paragraphIndex: number;
  section: OutlineV2['sections'][0];
  previousContent: string;
  persona: WritingPersonaV2;
  outline: OutlineV2;
  researchReport: ResearchReportV2;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface GenerateParagraphResponseV2 {
  paragraphId: string;
  content: string;
  validationResults: ValidationResultsV2;
  status: ParagraphStatus;
}

export interface ValidateParagraphRequestV2 {
  text: string;
  persona: WritingPersonaV2;
  coreValueLine: string;
  section: OutlineV2['sections'][0];
  homogeneityBanList: string[];
  previousContent: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface ValidateParagraphResponseV2 {
  validationResults: ValidationResultsV2;
}

export interface ModifyParagraphRequestV2 {
  content: string;
  generationRules: string;
  coreValueLine: string;
  section: OutlineV2['sections'][0];
  previousContent: string;
  issueDescriptions: string;
  modifyRule: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface ModifyParagraphResponseV2 {
  modifiedContent: string;
}

export interface FinalReviewRequestV2 {
  taskId: string;
  finalDraft: string;
  persona: WritingPersonaV2;
  outline: OutlineV2;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface FinalReviewResponseV2 {
  isPassed: boolean;
  reviewReport: {
    styleScore: number;
    originalityScore: number;
    aiScore: number;
    mainLineScore: number;
    complianceScore: number;
    issues: string[];
  };
  finalDraft?: string;
}
