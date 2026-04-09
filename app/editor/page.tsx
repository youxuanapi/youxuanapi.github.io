'use client';

import { useEffect, useState } from 'react';
import { useEditorStore, getAllArticles } from '../store/editorStore';
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { StyleLearningPanel } from '../components/editor/StyleLearningPanel';
import { StyleOptimizationPanel } from '../components/editor/StyleOptimizationPanel';
import { ArticleList } from '../components/editor/ArticleList';
import { FileText, Save, Plus, Settings, ChevronLeft, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Article } from '../types/editor';

export default function EditorPage() {
  const {
    article,
    currentContent,
    isDirty,
    isSaving,
    apiConfig,
    createArticle,
    loadArticle,
    saveArticle,
    setApiConfig,
  } = useEditorStore();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState(article?.title || '未命名文章');
  const [autoOpenStyleLearning, setAutoOpenStyleLearning] = useState(false);

  // 加载文章列表
  useEffect(() => {
    setArticles(getAllArticles());
    
    // 检查是否有从主页面导入的文章
    const importTitle = localStorage.getItem('editor-import-title');
    const importContent = localStorage.getItem('editor-import-content');
    const openStyleLearning = localStorage.getItem('editor-open-style-learning');
    
    if (importTitle && importContent) {
      const newArticle = createArticle(importTitle, importContent);
      setArticles(prev => [newArticle, ...prev]);
      setTitle(importTitle);
      // 清除导入数据
      localStorage.removeItem('editor-import-title');
      localStorage.removeItem('editor-import-content');
      
      // 检查是否需要自动打开风格学习
      if (openStyleLearning === 'true') {
        setAutoOpenStyleLearning(true);
        localStorage.removeItem('editor-open-style-learning');
      }
    }
  }, []);

  // 同步标题
  useEffect(() => {
    if (article) {
      setTitle(article.title);
    }
  }, [article?.id]);

  // 自动保存
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && article) {
        saveArticle();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isDirty, article]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          saveArticle();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewArticle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty]);

  const handleNewArticle = () => {
    const newArticle = createArticle('未命名文章');
    setArticles([newArticle, ...articles]);
    setTitle(newArticle.title);
  };

  const handleLoadArticle = (article: Article) => {
    loadArticle(article);
    setTitle(article.title);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (article) {
      article.title = newTitle;
    }
  };

  const handleSave = async () => {
    if (article) {
      article.title = title;
      await saveArticle();
      setArticles(getAllArticles());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'bg-white border-r transition-all duration-300 flex flex-col',
          showSidebar ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              文章管理
            </h1>
            <button
              onClick={handleNewArticle}
              className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              title="新建文章 (Ctrl+N)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ArticleList
            articles={articles}
            currentArticle={article}
            onSelect={handleLoadArticle}
          />
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => setShowApiConfig(true)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            API配置
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="文章标题"
              className="text-lg font-semibold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs text-amber-500">未保存</span>
            )}
            {isSaving && (
              <span className="text-xs text-indigo-500">保存中...</span>
            )}
            {!isDirty && !isSaving && article && (
              <span className="text-xs text-green-500">已保存</span>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isDirty && !isSaving
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </header>

        {/* 编辑区域 */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            <TiptapEditor className="h-full" />
          </div>

          {/* 右侧功能面板 */}
          <aside className="w-80 bg-white border-l p-4 overflow-y-auto space-y-4">
            {!apiConfig && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700">
                  请先配置API密钥以使用风格学习和优化功能
                </p>
                <button
                  onClick={() => setShowApiConfig(true)}
                  className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  去配置 →
                </button>
              </div>
            )}

            <StyleLearningPanel autoOpen={autoOpenStyleLearning} />
            <StyleOptimizationPanel />
          </aside>
        </div>
      </main>

      {/* API配置弹窗 */}
      {showApiConfig && (
        <ApiConfigModal
          config={apiConfig}
          onSave={(config) => {
            setApiConfig(config);
            setShowApiConfig(false);
          }}
          onClose={() => setShowApiConfig(false)}
        />
      )}
    </div>
  );
}

function ApiConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: { apiBaseUrl: string; apiKey: string; model: string } | null;
  onSave: (config: { apiBaseUrl: string; apiKey: string; model: string }) => void;
  onClose: () => void;
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(config?.apiBaseUrl || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [model, setModel] = useState(config?.model || 'gpt-4');

  const handleSave = () => {
    if (!apiBaseUrl || !apiKey || !model) {
      alert('请填写所有必填项');
      return;
    }
    onSave({ apiBaseUrl, apiKey, model });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">API配置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API基础URL
            </label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API密钥
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              模型
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
