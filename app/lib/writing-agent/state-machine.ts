import type {
  WritingTask,
  TaskStatus,
  Outline,
  OutlineSection,
  Paragraph,
  ValidationResult,
  AgentContext,
  TokenBudget,
} from '../types/writing-agent';

export type TransitionType = 
  | 'INIT'
  | 'START_RESEARCH'
  | 'COMPLETE_RESEARCH'
  | 'GENERATE_OUTLINE'
  | 'APPROVE_OUTLINE'
  | 'START_GENERATION'
  | 'GENERATE_PARAGRAPH'
  | 'VALIDATE_PARAGRAPH'
  | 'MODIFY_PARAGRAPH'
  | 'COMPLETE_PARAGRAPH'
  | 'COMPLETE_GENERATION'
  | 'START_REVIEW'
  | 'COMPLETE_REVIEW'
  | 'FAIL'
  | 'CANCEL';

interface StateTransition {
  from: TaskStatus;
  to: TaskStatus;
  type: TransitionType;
  action?: () => Promise<void>;
  condition?: (task: WritingTask) => boolean;
}

const STATE_TRANSITIONS: StateTransition[] = [
  { from: 'pending', to: 'initializing', type: 'INIT' },
  { from: 'initializing', to: 'researching', type: 'START_RESEARCH' },
  { from: 'researching', to: 'outline_pending', type: 'COMPLETE_RESEARCH', condition: (t) => !!t.outline },
  { from: 'outline_pending', to: 'generating', type: 'START_GENERATION', condition: (t) => t.paragraphs.some(p => p.status === 'generating') },
  { from: 'generating', to: 'reviewing', type: 'COMPLETE_GENERATION', condition: (t) => t.paragraphs.every(p => p.status === 'completed') },
  { from: 'reviewing', to: 'completed', type: 'COMPLETE_REVIEW' },
];

export class TaskStateMachine {
  private task: WritingTask;
  private context: AgentContext | null = null;
  private listeners: Set<(task: WritingTask) => void> = new Set();

  constructor(task: WritingTask) {
    this.task = task;
  }

  setContext(context: AgentContext): void {
    this.context = context;
  }

  getTask(): WritingTask {
    return this.task;
  }

  getCurrentStatus(): TaskStatus {
    return this.task.status;
  }

  canTransition(type: TransitionType): boolean {
    const transition = this.findTransition(type);
    if (!transition) return false;
    if (transition.from !== this.task.status) return false;
    if (transition.condition && !transition.condition(this.task)) return false;
    return true;
  }

  async transition(type: TransitionType): Promise<boolean> {
    const transition = this.findTransition(type);
    if (!transition) {
      console.error(`Invalid transition: ${type} from ${this.task.status}`);
      return false;
    }

    if (transition.from !== this.task.status) {
      console.error(`Cannot transition from ${transition.from} to ${transition.to} via ${type}`);
      return false;
    }

    if (transition.condition && !transition.condition(this.task)) {
      console.error(`Transition condition not met: ${type}`);
      return false;
    }

    try {
      if (transition.action) {
        await transition.action();
      }
      
      this.task.status = transition.to;
      this.task.updatedAt = new Date().toISOString();
      
      if (transition.to === 'completed' || transition.to === 'failed' || transition.to === 'cancelled') {
        this.task.completedAt = new Date().toISOString();
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error(`Transition action failed: ${type}`, error);
      this.task.status = 'failed';
      this.task.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifyListeners();
      return false;
    }
  }

  private findTransition(type: TransitionType): StateTransition | undefined {
    return STATE_TRANSITIONS.find(t => t.type === type && t.from === this.task.status);
  }

  subscribe(listener: (task: WritingTask) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.task));
  }

  getAvailableTransitions(): TransitionType[] {
    return STATE_TRANSITIONS
      .filter(t => t.from === this.task.status && (!t.condition || t.condition(this.task)))
      .map(t => t.type);
  }

  isTerminalState(): boolean {
    return ['completed', 'failed', 'cancelled'].includes(this.task.status);
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const paragraphs = this.task.paragraphs;
    if (paragraphs.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = paragraphs.filter(p => p.status === 'completed').length;
    const total = paragraphs.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }

  getNextPendingParagraph(): Paragraph | null {
    return this.task.paragraphs.find(p => p.status === 'pending') || null;
  }

  getCurrentParagraph(): Paragraph | null {
    return this.task.paragraphs.find(p => 
      ['thinking', 'generating', 'validating', 'modifying'].includes(p.status)
    ) || null;
  }
}

export function createStateMachine(task: WritingTask): TaskStateMachine {
  return new TaskStateMachine(task);
}

export function getPhaseFromStatus(status: TaskStatus): string {
  const phaseMap: Record<TaskStatus, string> = {
    'pending': '等待初始化',
    'initializing': '初始化中',
    'researching': '深度调研中',
    'outline_pending': '大纲待确认',
    'generating': '内容生成中',
    'reviewing': '终检打磨中',
    'completed': '已完成',
    'failed': '生成失败',
    'cancelled': '已取消',
  };
  return phaseMap[status];
}

export function getStatusColor(status: TaskStatus): string {
  const colorMap: Record<TaskStatus, string> = {
    'pending': 'gray',
    'initializing': 'blue',
    'researching': 'cyan',
    'outline_pending': 'yellow',
    'generating': 'green',
    'reviewing': 'purple',
    'completed': 'green',
    'failed': 'red',
    'cancelled': 'gray',
  };
  return colorMap[status];
}
