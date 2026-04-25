import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  WritingTask,
  TaskStatus,
  ParagraphStatus,
  Outline,
  Paragraph,
  WritingPersona,
  MaterialLibrary,
  ResearchReport,
  TokenBudget,
  ValidationResult,
  TaskProgress,
} from '../types/writing-agent';

interface WritingAgentState {
  currentTask: WritingTask | null;
  persona: WritingPersona | null;
  personas: WritingPersona[];
  taskHistory: WritingTask[];
  isRunning: boolean;
  progress: TaskProgress | null;
  error: string | null;
}

const initialState: WritingAgentState = {
  currentTask: null,
  persona: null,
  personas: [],
  taskHistory: [],
  isRunning: false,
  progress: null,
  error: null,
};

interface WritingAgentStore extends WritingAgentState {
  createTask: (topic: string, requirements?: string, styleId?: string) => WritingTask;
  setTaskStatus: (status: TaskStatus) => void;
  setOutline: (outline: Outline) => void;
  updateParagraph: (paragraphId: string, updates: Partial<Paragraph>) => void;
  setParagraphValidation: (paragraphId: string, result: ValidationResult) => void;
  setResearchReport: (report: ResearchReport) => void;
  setMaterialLibrary: (library: MaterialLibrary) => void;
  setPersona: (persona: WritingPersona | null) => void;
  addPersona: (persona: WritingPersona) => void;
  updatePersona: (personaId: string, updates: Partial<WritingPersona>) => void;
  deletePersona: (personaId: string) => void;
  setRunning: (isRunning: boolean) => void;
  setProgress: (progress: TaskProgress | null) => void;
  setError: (error: string | null) => void;
  setFinalDraft: (draft: string) => void;
  cancelTask: () => void;
  reset: () => void;
  getTokenBudget: () => TokenBudget;
  loadLocalPersonas: () => Promise<void>;
}

function createInitialTask(
  topic: string,
  requirements: string = '',
  styleId?: string
): WritingTask {
  return {
    id: generateId(),
    userId: 'current-user',
    status: 'pending',
    topic,
    requirements,
    styleId,
    paragraphs: [],
    error: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createInitialTokenBudget(): TokenBudget {
  return {
    total: 128000,
    systemPrompt: 38400,
    context: 51200,
    userRequest: 12800,
    generation: 12800,
    remaining: 128000,
  };
}

export const useWritingAgentStore = create<WritingAgentStore>()(
  immer(
    persist(
      (set, get) => ({
        ...initialState,

        loadLocalPersonas: async () => {
          try {
            const response = await fetch('/api/writing-agent/local-personas');
            if (response.ok) {
              const data = await response.json();
              set((state) => {
                state.personas = data.personas || [];
              });
            }
          } catch (err) {
            console.error('加载本地人格失败:', err);
          }
        },

        createTask: (topic: string, requirements?: string, styleId?: string) => {
          const task = createInitialTask(topic, requirements, styleId);
          set((state) => {
            state.currentTask = task;
            state.error = null;
          });
          return task;
        },

        setTaskStatus: (status: TaskStatus) => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.status = status;
              state.currentTask.updatedAt = new Date().toISOString();
              if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                state.currentTask.completedAt = new Date().toISOString();
                if (state.currentTask) {
                  state.taskHistory.unshift({ ...state.currentTask });
                }
              }
            }
          });
        },

        setOutline: (outline: Outline) => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.outline = outline;
              const sections = outline.sections || [];
              state.currentTask.paragraphs = sections.map((section, index) => ({
                id: generateId(),
                sectionId: section.id,
                index,
                status: 'pending' as ParagraphStatus,
                retryCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        updateParagraph: (paragraphId: string, updates: Partial<Paragraph>) => {
          set((state) => {
            if (state.currentTask) {
              const paragraph = state.currentTask.paragraphs.find(p => p.id === paragraphId);
              if (paragraph) {
                Object.assign(paragraph, updates);
                paragraph.updatedAt = new Date().toISOString();
              }
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        setParagraphValidation: (paragraphId: string, result: ValidationResult) => {
          set((state) => {
            if (state.currentTask) {
              const paragraph = state.currentTask.paragraphs.find(p => p.id === paragraphId);
              if (paragraph) {
                paragraph.validationResult = result;
              }
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        setResearchReport: (report: ResearchReport) => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.researchReport = report;
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        setMaterialLibrary: (library: MaterialLibrary) => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.materialLibrary = library;
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        setPersona: (persona: WritingPersona | null) => {
          set((state) => {
            state.persona = persona;
          });
        },

        addPersona: async (persona: WritingPersona) => {
          try {
            await fetch('/api/writing-agent/local-personas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(persona),
            });
          } catch (err) {
            console.error('保存人格到本地失败:', err);
          }
          set((state) => {
            state.personas.push(persona);
          });
        },

        updatePersona: async (personaId: string, updates: Partial<WritingPersona>) => {
          try {
            await fetch('/api/writing-agent/local-personas', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId, updates }),
            });
          } catch (err) {
            console.error('更新人格到本地失败:', err);
          }
          set((state) => {
            const persona = state.personas.find(p => p.id === personaId);
            if (persona) {
              Object.assign(persona, updates);
            }
          });
        },

        deletePersona: async (personaId: string) => {
          try {
            await fetch('/api/writing-agent/local-personas', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId }),
            });
          } catch (err) {
            console.error('删除本地人格失败:', err);
          }
          set((state) => {
            state.personas = state.personas.filter(p => p.id !== personaId);
            if (state.persona?.id === personaId) {
              state.persona = null;
            }
          });
        },

        setRunning: (isRunning: boolean) => {
          set((state) => {
            state.isRunning = isRunning;
          });
        },

        setProgress: (progress: TaskProgress | null) => {
          set((state) => {
            state.progress = progress;
          });
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
            if (state.currentTask && error) {
              state.currentTask.error = error;
            }
          });
        },

        setFinalDraft: (draft: string) => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.finalDraft = draft;
              state.currentTask.updatedAt = new Date().toISOString();
            }
          });
        },

        cancelTask: () => {
          set((state) => {
            if (state.currentTask) {
              state.currentTask.status = 'cancelled';
              state.currentTask.updatedAt = new Date().toISOString();
              state.currentTask.completedAt = new Date().toISOString();
            }
            state.isRunning = false;
          });
        },

        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },

        getTokenBudget: () => {
          return createInitialTokenBudget();
        },
      }),
      {
        name: 'writing-agent-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          taskHistory: state.taskHistory.slice(0, 50),
          personas: state.personas,
        }),
      }
    )
  )
);
