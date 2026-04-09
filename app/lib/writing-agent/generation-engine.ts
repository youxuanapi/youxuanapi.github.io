import type {
  WritingTask,
  Outline,
  OutlineSection,
  Paragraph,
  WritingPersona,
  MaterialLibrary,
  ValidationResult,
  AgentContext,
  TokenBudget,
  Material,
} from '../../types/writing-agent';
import { ValidationTools } from './validation-tools';
import { TaskStateMachine } from './state-machine';

const MAX_RETRY_COUNT = 5;
const MAX_TOKENS_PER_PARAGRAPH = 500;

export interface GenerationConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  minStyleScore: number;
  maxAiProbability: number;
  maxSimilarity: number;
}

export class GenerationEngine {
  private task: WritingTask;
  private stateMachine: TaskStateMachine;
  private validationTools: ValidationTools;
  private persona: WritingPersona;
  private materialLibrary: MaterialLibrary;
  private config: GenerationConfig;
  private context: AgentContext;
  private onProgress?: (progress: number, message: string) => void;
  private onParagraphComplete?: (paragraph: Paragraph) => void;
  private onTaskComplete?: (draft: string) => void;
  private onError?: (error: Error) => void;
  private isCancelled = false;

  constructor(
    task: WritingTask,
    persona: WritingPersona,
    materialLibrary: MaterialLibrary,
    config: GenerationConfig,
    options?: {
      onProgress?: (progress: number, message: string) => void;
      onParagraphComplete?: (paragraph: Paragraph) => void;
      onTaskComplete?: (draft: string) => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.task = task;
    this.stateMachine = new TaskStateMachine(task);
    this.validationTools = new ValidationTools(config.apiBaseUrl, config.apiKey, config.model);
    this.persona = persona;
    this.materialLibrary = materialLibrary;
    this.config = config;
    this.context = this.createContext();
    
    if (options) {
      this.onProgress = options.onProgress;
      this.onParagraphComplete = options.onParagraphComplete;
      this.onTaskComplete = options.onTaskComplete;
      this.onError = options.onError;
    }
  }

  private createContext(): AgentContext {
    return {
      taskId: this.task.id,
      currentParagraphIndex: 0,
      outline: this.task.outline!,
      persona: this.persona,
      materialLibrary: this.materialLibrary,
      longTermMemory: [],
      tokenBudget: this.createTokenBudget(),
      history: [],
    };
  }

  private createTokenBudget(): TokenBudget {
    return {
      total: 128000,
      systemPrompt: 38400,
      context: 51200,
      userRequest: 12800,
      generation: 12800,
      remaining: 128000,
    };
  }

  cancel(): void {
    this.isCancelled = true;
  }

  async run(): Promise<string> {
    try {
      await this.stateMachine.transition('INIT');
      this.reportProgress(5, '开始初始化...');

      await this.stateMachine.transition('START_RESEARCH');
      this.reportProgress(10, '正在进行深度调研...');
      
      if (this.isCancelled) throw new Error('任务已取消');
      
      this.reportProgress(30, '调研完成，正在生成大纲...');
      await this.stateMachine.transition('GENERATE_OUTLINE');

      this.reportProgress(40, '大纲待确认...');
      
      if (!this.task.outline) {
        throw new Error('大纲生成失败');
      }

      await this.stateMachine.transition('START_GENERATION');
      this.reportProgress(45, '开始生成内容...');

      const finalDraft = await this.generateAllParagraphs();
      
      if (this.isCancelled) throw new Error('任务已取消');

      this.reportProgress(90, '正在进行终检...');
      await this.stateMachine.transition('START_REVIEW');
      
      const humanizedDraft = await this.performFinalReview(finalDraft);
      
      await this.stateMachine.transition('COMPLETE_REVIEW');
      this.reportProgress(100, '生成完成！');

      this.onTaskComplete?.(humanizedDraft);
      
      return humanizedDraft;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  private reportProgress(progress: number, message: string): void {
    this.onProgress?.(progress, message);
  }

  private async generateAllParagraphs(): Promise<string> {
    const sections = this.task.outline?.sections || [];
    const paragraphs: string[] = [];

    for (let i = 0; i < sections.length; i++) {
      if (this.isCancelled) break;

      const section = sections[i];
      const paragraphIndex = this.task.paragraphs.findIndex(p => p.sectionId === section.id);
      
      if (paragraphIndex === -1) continue;

      this.reportProgress(45 + Math.round((i / sections.length) * 40), 
        `正在生成第 ${i + 1}/${sections.length} 段...`);

      const paragraph = await this.generateSingleParagraph(section, paragraphIndex, paragraphs.join('\n'));
      paragraphs.push(paragraph.content || '');

      this.task.paragraphs[paragraphIndex] = paragraph;
      this.onParagraphComplete?.(paragraph);
    }

    return paragraphs.join('\n\n');
  }

  private async generateSingleParagraph(
    section: OutlineSection,
    paragraphIndex: number,
    previousContent: string
  ): Promise<Paragraph> {
    const paragraph = this.task.paragraphs[paragraphIndex];
    paragraph.status = 'thinking';
    
    while (paragraph.retryCount < MAX_RETRY_COUNT) {
      if (this.isCancelled) break;

      try {
        paragraph.status = 'generating';
        const content = await this.callGenerationModel(section, previousContent);
        
        if (!content) {
          paragraph.retryCount++;
          continue;
        }

        paragraph.content = content;
        paragraph.status = 'validating';

        const validationResult = await this.validationTools.validateParagraph(content, this.persona);
        paragraph.validationResult = validationResult;

        if (validationResult.passed) {
          paragraph.status = 'completed';
          return paragraph;
        }

        paragraph.status = 'modifying';
        const modifiedContent = await this.applyModifications(content, validationResult);
        paragraph.content = modifiedContent;
        
        paragraph.retryCount++;
      } catch (error) {
        console.error(`段落生成失败:`, error);
        paragraph.retryCount++;
        
        if (paragraph.retryCount >= MAX_RETRY_COUNT) {
          paragraph.status = 'failed';
          break;
        }
      }
    }

    if (paragraph.status !== 'completed') {
      paragraph.status = 'completed';
    }
    
    return paragraph;
  }

  private async callGenerationModel(section: OutlineSection, previousContent: string): Promise<string> {
    const relevantMaterials = this.findRelevantMaterials(section);
    const systemPrompt = this.buildSystemPrompt(section, relevantMaterials);
    
    const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: this.buildUserPrompt(section, previousContent) },
        ],
        temperature: 0.7,
        max_tokens: MAX_TOKENS_PER_PARAGRAPH,
      }),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private buildSystemPrompt(section: OutlineSection, materials: Material[]): string {
    const personaPrefs = this.persona.dynamicPreferences;
    
    return `你是一位资深写作专家，正在按照用户的专属写作风格生成内容。

【写作人格特征】
- 正式程度: ${personaPrefs.formality}/100
- 复杂程度: ${personaPrefs.complexity}/100
- 情感密度: ${personaPrefs.emotionDensity}/100
- 直接程度: ${personaPrefs.directness}/100
- 叙事节奏: ${personaPrefs.rhythm}
- 叙事视角: ${personaPrefs.perspective}称

【段落要求】
- 标题: ${section.title}
- 权重: ${section.weight}
- 关键点: ${section.keyPoints.join('; ')}
- 字数范围: ${section.lengthRange.min}-${section.lengthRange.max}字
- 优先级: ${section.priority}

【专属素材库】
${materials.map(m => `- ${m.content}${m.source ? ` (来源: ${m.source})` : ''}`).join('\n')}

【写作规范】
1. 严格遵循上述写作人格特征
2. 优先使用素材库中的素材，但需要进行原创性改写
3. 必须体现段落的关键点
4. 保持与前文的自然衔接
5. 禁止生成完美无缺的文本，保留真人写作的自然特征
6. 禁止使用套话、空话
7. 单段落控制在${section.lengthRange.min}-${section.lengthRange.max}字`;
  }

  private buildUserPrompt(section: OutlineSection, previousContent: string): string {
    return `请根据以上要求，生成"${section.title}"段落的完整内容。

前文内容：
${previousContent || '(这是文章的开头)'}

请直接输出生成的文本，不需要任何说明。`;
  }

  private findRelevantMaterials(section: OutlineSection): Material[] {
    const keywords = section.keyPoints.join(' ');
    
    return this.materialLibrary.materials
      .filter(m => {
        const relevance = m.content.split(keywords).length - 1;
        return relevance > 0 || m.relevance > 0.7;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private async applyModifications(content: string, validationResult: ValidationResult): Promise<string> {
    const issues = validationResult.issues.filter(i => !i.suggestion).slice(0, 3);
    
    if (issues.length === 0) {
      return content;
    }

    const issueDescriptions = issues.map(i => `- ${i.description}: ${i.suggestion || '请修改'}`).join('\n');
    
    const response = await fetch(`${this.config.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `你是一个文本修改专家。请根据以下问题修改文本。
            
问题列表：
${issueDescriptions}

修改要求：
1. 只修改有问题的部分，保留其他内容
2. 保持原文风一致
3. 不要过度修改
4. 保持内容的原创性

请直接返回修改后的文本，不要添加任何说明。`,
          },
          {
            role: 'user',
            content: `请修改以下文本：\n\n${content}`,
          },
        ],
        temperature: 0.5,
        max_tokens: MAX_TOKENS_PER_PARAGRAPH,
      }),
    });

    if (!response.ok) {
      return content;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || content;
  }

  private async performFinalReview(draft: string): Promise<string> {
    const styleCheck = await this.validationTools.checkStyleConsistency({
      text: draft,
      persona: this.persona,
      minScore: this.config.minStyleScore,
    });

    if (!styleCheck.passed) {
      console.warn('终检风格不通过:', styleCheck.issues);
    }

    const humanized = await this.validationTools.humanizeText(draft, this.persona);
    
    return humanized;
  }
}

export function createGenerationEngine(
  task: WritingTask,
  persona: WritingPersona,
  materialLibrary: MaterialLibrary,
  config: GenerationConfig,
  options?: {
    onProgress?: (progress: number, message: string) => void;
    onParagraphComplete?: (paragraph: Paragraph) => void;
    onTaskComplete?: (draft: string) => void;
    onError?: (error: Error) => void;
  }
): GenerationEngine {
  return new GenerationEngine(task, persona, materialLibrary, config, options);
}
