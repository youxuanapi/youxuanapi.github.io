// 文章编辑与风格学习系统 - Zustand状态管理

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Article,
  WritingStyle,
  StyleLearningRecord,
  OptimizationSettings,
  OptimizationResult,
  OriginalityReport,
  EditorState,
  ApiConfig,
  EditHistory,
} from '../types/editor';

// 扩展EditorState类型
interface ExtendedEditorState extends EditorState {
  // API配置
  apiConfig: ApiConfig | null;
  // 用户风格列表
  userStyles: WritingStyle[];
  // 学习记录
  learningRecords: StyleLearningRecord[];
  // 当前优化结果
  currentOptimization: OptimizationResult | null;
  // 当前原创性报告
  currentOriginalityReport: OriginalityReport | null;
  // 编辑器配置
  editorConfig: {
    autoSave: boolean;
    autoSaveInterval: number;
    maxUndoSteps: number;
    spellCheck: boolean;
  };
}

// 初始状态
const initialState: ExtendedEditorState = {
  article: null,
  currentContent: '',
  currentHtml: '',
  wordCount: 0,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  undoStack: [],
  redoStack: [],
  selectedStyle: null,
  isLearning: false,
  isOptimizing: false,
  learningProgress: 0,
  optimizationProgress: 0,
  apiConfig: null,
  userStyles: [],
  learningRecords: [],
  currentOptimization: null,
  currentOriginalityReport: null,
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 30000, // 30秒
    maxUndoSteps: 20,
    spellCheck: true,
  },
};

// Editor Store
interface EditorStore extends ExtendedEditorState {
  // 文章操作
  createArticle: (title: string, content?: string) => Article;
  loadArticle: (article: Article) => void;
  updateContent: (content: string, html: string) => void;
  saveArticle: () => Promise<void>;
  
  // 撤销/重做
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 风格操作
  selectStyle: (style: WritingStyle | null) => void;
  addStyle: (style: WritingStyle) => void;
  updateStyle: (styleId: string, updates: Partial<WritingStyle>) => void;
  deleteStyle: (styleId: string) => void;
  
  // 学习记录
  addLearningRecord: (record: StyleLearningRecord) => void;
  
  // API配置
  setApiConfig: (config: ApiConfig) => void;
  
  // 优化结果
  setOptimizationResult: (result: OptimizationResult | null) => void;
  
  // 原创性报告
  setOriginalityReport: (report: OriginalityReport | null) => void;
  
  // 加载状态
  setLearning: (isLearning: boolean) => void;
  setOptimizing: (isOptimizing: boolean) => void;
  setLearningProgress: (progress: number) => void;
  setOptimizationProgress: (progress: number) => void;
  
  // 编辑器配置
  updateEditorConfig: (config: Partial<ExtendedEditorState['editorConfig']>) => void;
  
  // 重置
  reset: () => void;
}

export const useEditorStore = create<EditorStore>()(
  immer(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 创建新文章
        createArticle: (title: string, content: string = '') => {
          const newArticle: Article = {
            id: generateId(),
            userId: 'current-user',
            title,
            content,
            htmlContent: content,
            wordCount: countWords(content),
            editHistory: [],
            versions: [],
            status: 'draft',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => {
            state.article = newArticle;
            state.currentContent = content;
            state.currentHtml = content;
            state.wordCount = newArticle.wordCount;
            state.isDirty = false;
            state.undoStack = [];
            state.redoStack = [];
          });
          
          return newArticle;
        },
        
        // 加载文章
        loadArticle: (article: Article) => {
          set((state) => {
            state.article = article;
            state.currentContent = article.content;
            state.currentHtml = article.htmlContent;
            state.wordCount = article.wordCount;
            state.isDirty = false;
            state.undoStack = [];
            state.redoStack = [];
            state.lastSavedAt = article.updatedAt;
          });
        },
        
        // 更新内容
        updateContent: (content: string, html: string) => {
          set((state) => {
            // 保存到撤销栈
            if (state.currentContent !== content) {
              state.undoStack.push(state.currentContent);
              // 限制撤销栈大小
              if (state.undoStack.length > state.editorConfig.maxUndoSteps) {
                state.undoStack.shift();
              }
              // 清空重做栈
              state.redoStack = [];
            }
            
            state.currentContent = content;
            state.currentHtml = html;
            state.wordCount = countWords(content);
            state.isDirty = true;
          });
        },
        
        // 保存文章
        saveArticle: async () => {
          const state = get();
          if (!state.article || !state.isDirty) return;
          
          set((s) => { s.isSaving = true; });
          
          try {
            // 创建编辑历史记录
            const historyRecord: EditHistory = {
              id: generateId(),
              articleId: state.article.id,
              content: state.currentContent,
              htmlContent: state.currentHtml,
              wordCount: state.wordCount,
              operation: 'edit',
              timestamp: new Date().toISOString(),
            };
            
            set((s) => {
              if (s.article) {
                s.article.content = s.currentContent;
                s.article.htmlContent = s.currentHtml;
                s.article.wordCount = s.wordCount;
                s.article.updatedAt = new Date().toISOString();
                s.article.editHistory.push(historyRecord);
              }
              s.isDirty = false;
              s.lastSavedAt = new Date().toISOString();
              s.isSaving = false;
            });
            
            // 保存到localStorage
            saveArticleToStorage(get().article!);
          } catch (error) {
            console.error('保存文章失败:', error);
            set((s) => { s.isSaving = false; });
            throw error;
          }
        },
        
        // 撤销
        undo: () => {
          set((state) => {
            if (state.undoStack.length === 0) return;
            
            const previousContent = state.undoStack.pop()!;
            state.redoStack.push(state.currentContent);
            state.currentContent = previousContent;
            state.wordCount = countWords(previousContent);
            state.isDirty = true;
          });
        },
        
        // 重做
        redo: () => {
          set((state) => {
            if (state.redoStack.length === 0) return;
            
            const nextContent = state.redoStack.pop()!;
            state.undoStack.push(state.currentContent);
            state.currentContent = nextContent;
            state.wordCount = countWords(nextContent);
            state.isDirty = true;
          });
        },
        
        // 检查是否可以撤销
        canUndo: () => {
          return get().undoStack.length > 0;
        },
        
        // 检查是否可以重做
        canRedo: () => {
          return get().redoStack.length > 0;
        },
        
        // 选择风格
        selectStyle: (style: WritingStyle | null) => {
          set((state) => {
            state.selectedStyle = style;
          });
        },
        
        // 添加风格
        addStyle: (style: WritingStyle) => {
          set((state) => {
            state.userStyles.push(style);
          });
        },
        
        // 更新风格
        updateStyle: (styleId: string, updates: Partial<WritingStyle>) => {
          set((state) => {
            const index = state.userStyles.findIndex((s) => s.id === styleId);
            if (index !== -1) {
              Object.assign(state.userStyles[index], updates);
            }
          });
        },
        
        // 删除风格
        deleteStyle: (styleId: string) => {
          set((state) => {
            state.userStyles = state.userStyles.filter((s) => s.id !== styleId);
            if (state.selectedStyle?.id === styleId) {
              state.selectedStyle = null;
            }
          });
        },
        
        // 添加学习记录
        addLearningRecord: (record: StyleLearningRecord) => {
          set((state) => {
            state.learningRecords.push(record);
            // 更新风格的学习次数
            const styleIndex = state.userStyles.findIndex((s) => s.id === record.styleId);
            if (styleIndex !== -1) {
              state.userStyles[styleIndex].learningCount++;
              state.userStyles[styleIndex].lastLearnedAt = record.learnedAt;
            }
          });
        },
        
        // 设置API配置
        setApiConfig: (config: ApiConfig) => {
          set((state) => {
            state.apiConfig = config;
          });
        },
        
        // 设置优化结果
        setOptimizationResult: (result: OptimizationResult | null) => {
          set((state) => {
            state.currentOptimization = result;
          });
        },
        
        // 设置原创性报告
        setOriginalityReport: (report: OriginalityReport | null) => {
          set((state) => {
            state.currentOriginalityReport = report;
          });
        },
        
        // 设置学习状态
        setLearning: (isLearning: boolean) => {
          set((state) => {
            state.isLearning = isLearning;
            if (!isLearning) {
              state.learningProgress = 0;
            }
          });
        },
        
        // 设置优化状态
        setOptimizing: (isOptimizing: boolean) => {
          set((state) => {
            state.isOptimizing = isOptimizing;
            if (!isOptimizing) {
              state.optimizationProgress = 0;
            }
          });
        },
        
        // 设置学习进度
        setLearningProgress: (progress: number) => {
          set((state) => {
            state.learningProgress = Math.min(100, Math.max(0, progress));
          });
        },
        
        // 设置优化进度
        setOptimizationProgress: (progress: number) => {
          set((state) => {
            state.optimizationProgress = Math.min(100, Math.max(0, progress));
          });
        },
        
        // 更新编辑器配置
        updateEditorConfig: (config: Partial<ExtendedEditorState['editorConfig']>) => {
          set((state) => {
            Object.assign(state.editorConfig, config);
          });
        },
        
        // 重置
        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },
      }),
      {
        name: 'editor-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          apiConfig: state.apiConfig,
          userStyles: state.userStyles,
          learningRecords: state.learningRecords,
          editorConfig: state.editorConfig,
        }),
      }
    )
  )
);

// 辅助函数
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function countWords(text: string): number {
  // 移除HTML标签
  const plainText = text.replace(/<[^>]*>/g, '');
  // 统计中文字符
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 统计英文单词
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

function saveArticleToStorage(article: Article): void {
  try {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const index = articles.findIndex((a: Article) => a.id === article.id);
    if (index !== -1) {
      articles[index] = article;
    } else {
      articles.push(article);
    }
    localStorage.setItem('articles', JSON.stringify(articles));
  } catch (error) {
    console.error('保存文章到存储失败:', error);
  }
}

// 导出获取所有文章的函数
export function getAllArticles(): Article[] {
  try {
    return JSON.parse(localStorage.getItem('articles') || '[]');
  } catch {
    return [];
  }
}

// 导出删除文章的函数
export function deleteArticle(articleId: string): void {
  try {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const filtered = articles.filter((a: Article) => a.id !== articleId);
    localStorage.setItem('articles', JSON.stringify(filtered));
  } catch (error) {
    console.error('删除文章失败:', error);
  }
}
