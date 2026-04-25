// 写作Agent系统 - 类型定义

export type TaskStatus = 
  | 'pending'           // 待初始化
  | 'initializing'      // 初始化中
  | 'researching'       // 调研中
  | 'outline_pending'   // 大纲待确认
  | 'generating'         // 生成中
  | 'reviewing'          // 终检中
  | 'completed'         // 已完成
  | 'failed'            // 已失败
  | 'cancelled';        // 已取消

export type ParagraphStatus = 
  | 'pending'
  | 'thinking'
  | 'generating'
  | 'validating'
  | 'modifying'
  | 'persisting'
  | 'completed'
  | 'failed';

export interface WritingTask {
  id: string;
  userId: string;
  status: TaskStatus;
  topic: string;
  requirements: string;
  styleId?: string;
  outline?: Outline;
  paragraphs: Paragraph[];
  finalDraft?: string;
  researchReport?: ResearchReport;
  materialLibrary?: MaterialLibrary;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Outline {
  id: string;
  title: string;
  theme: string;
  coreValueLine: string;
  sections: OutlineSection[];
  totalWeight: number;
  homogeneityScore: number;
  approvedAt?: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  weight: number;
  keyPoints: string[];
  lengthRange: { min: number; max: number };
  priority: 'high' | 'medium' | 'low';
  status: ParagraphStatus;
  content?: string;
  notes?: string;
}

export interface Paragraph {
  id: string;
  sectionId: string;
  index: number;
  status: ParagraphStatus;
  content?: string;
  validationResult?: ValidationResult;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  styleScore: number;
  originalityScore: number;
  aiProbability: number;
  passed: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'style' | 'originality' | 'ai' | 'logic' | 'compliance';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location?: { start: number; end: number };
  suggestion?: string;
}

export interface ResearchReport {
  id: string;
  competitors: CompetitorAnalysis[];
  differentiationAngles: string[];
  userPainPoints: string[];
  trends: string[];
  generatedAt: string;
}

export interface CompetitorAnalysis {
  source: string;
  url?: string;
  mainPoints: string[];
  weaknesses: string[];
  aiProbability?: number;
}

export interface MaterialLibrary {
  id: string;
  materials: Material[];
  lastUpdated: string;
}

export interface Material {
  id: string;
  type: 'case' | 'data' | 'quote' | 'insight';
  content: string;
  source?: string;
  sourceUrl?: string;
  relevance: number;
  isOriginal: boolean;
}

// 写作人格特征
export interface WritingPersona {
  id: string;
  userId: string;
  name: string;
  description?: string;
  vectorFeatures: number[];
  staticRules: StaticStyleRule[];
  dynamicPreferences: DynamicStylePreference;
  vocabulary: {
    preferred: string[];
    avoided: string[];
  };
  subTag?: string;
  encryptedPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface StaticStyleRule {
  category: 'narrative_style' | 'vocabulary' | 'sentence' | 'tone' | 'structure';
  rule: string;
  confidence: number;
}

export interface DynamicStylePreference {
  formality: number;
  complexity: number;
  emotionDensity: number;
  directness: number;
  rhythm: 'fast' | 'medium' | 'slow';
  perspective: 'first' | 'second' | 'third';
}

// Agent执行上下文
export interface AgentContext {
  taskId: string;
  currentParagraphIndex: number;
  outline: Outline;
  persona: WritingPersona;
  materialLibrary: MaterialLibrary;
  longTermMemory: MemoryEntry[];
  tokenBudget: TokenBudget;
  history: AgentAction[];
}

export interface AgentAction {
  type: string;
  params: Record<string, unknown>;
  result?: unknown;
  timestamp: string;
  duration?: number;
}

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  context: number;
  userRequest: number;
  generation: number;
  remaining: number;
}

// 工具调用
export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
  timestamp: string;
}

// 大纲差异化校验
export interface HomogeneityCheckResult {
  score: number;
  similarStructures: { structure: string; source: string }[];
  suggestions: string[];
}

// 终稿报告
export interface FinalReport {
  taskId: string;
  finalDraft: string;
  wordCount: number;
  styleConsistency: number;
  originalityScore: number;
  aiProbability: number;
  flawInjectionCount: number;
  validationLogs: ValidationLog[];
  generatedAt: string;
}

export interface ValidationLog {
  step: number;
  type: 'style' | 'originality' | 'ai' | 'humanization' | 'logic' | 'compliance';
  result: 'passed' | 'failed' | 'modified';
  details: string;
  timestamp: string;
}

// 用户偏好学习
export interface UserPreference {
  userId: string;
  commonEdits: TextEdit[];
  avoidedExpressions: string[];
  preferredStructures: string[];
  topics: string[];
  updatedAt: string;
}

export interface TextEdit {
  original: string;
  modified: string;
  count: number;
  lastUsedAt: string;
}

// 任务进度
export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  currentPhase: string;
  progress: number;
  paragraphProgress: { completed: number; total: number };
  estimatedTimeRemaining?: number;
  lastUpdated: string;
}

// 记忆条目
export interface MemoryEntry {
  id: string;
  type: 'fact' | 'experience' | 'rule' | 'preference';
  content: string;
  relevance: number;
  createdAt: string;
  lastAccessedAt: string;
  tags: string[];
}

// API请求/响应类型
export interface CreateTaskRequest {
  topic: string;
  requirements?: string;
  styleId?: string;
  outlineOptions?: Partial<OutlineOptions>;
}

export interface OutlineOptions {
  minSections: number;
  maxSections: number;
  preferredLength: 'short' | 'medium' | 'long';
}

export interface CreateTaskResponse {
  taskId: string;
  status: TaskStatus;
}

export interface ParagraphGenerationRequest {
  taskId: string;
  paragraphIndex: number;
  context: {
    previousContent?: string;
    nextOutline?: OutlineSection;
    tokenBudget: TokenBudget;
  };
}

export interface ParagraphGenerationResponse {
  paragraphId: string;
  content: string;
  validationResult: ValidationResult;
  nextTokenBudget: TokenBudget;
}

export interface FinalValidationRequest {
  taskId: string;
  draft: string;
}

export interface FinalValidationResponse {
  passed: boolean;
  report: FinalReport;
  requiredChanges?: {
    location: { start: number; end: number };
    original: string;
    suggested: string;
    reason: string;
  }[];
}
