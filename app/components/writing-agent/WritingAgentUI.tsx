'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWritingAgentStore } from '../../store/writing-agent-store';
import { useEditorStore } from '../../store/editorStore';
import type { WritingPersona, Outline, OutlineSection, Paragraph, TaskProgress } from '../../types/writing-agent';
import { cn } from '../../lib/utils';

interface WritingAgentUIProps {
  className?: string;
}

export default function WritingAgentUI({ className }: WritingAgentUIProps) {
  const {
    currentTask,
    persona,
    personas,
    isRunning,
    progress,
    error,
    createTask,
    setTaskStatus,
    setOutline,
    updateParagraph,
    setPersona,
    addPersona,
    deletePersona,
    setRunning,
    setProgress,
    setError,
    setFinalDraft,
    cancelTask,
    reset,
    loadLocalPersonas,
  } = useWritingAgentStore();

  const { apiConfig } = useEditorStore();

  const [topic, setTopic] = useState('');
  const [requirements, setRequirements] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [detail, setDetail] = useState('');
  const [sublimation, setSublimation] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPersonaPanel, setShowPersonaPanel] = useState(false);
  const [sampleTexts, setSampleTexts] = useState<string[]>(['']);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAntiAiMode, setIsAntiAiMode] = useState(false);
  const [referenceSkeleton, setReferenceSkeleton] = useState('');
  const [showSkeletonPanel, setShowSkeletonPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeMode, setActiveMode] = useState<'create' | 'humanize'>('create');
  const [sourceArticle, setSourceArticle] = useState('');
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [isFormatted, setIsFormatted] = useState(false);

  const progressRef = useRef(0);
  const logsRef = useRef<string[]>([]);

  useEffect(() => {
    loadLocalPersonas();
  }, [loadLocalPersonas]);

  useEffect(() => {
    let animationFrameId: number;
    const updateProgress = () => {
      const currentProgress = progress?.progress || 0;
      if (progressRef.current < currentProgress) {
        progressRef.current += (currentProgress - progressRef.current) * 0.1;
        setSmoothProgress(Math.min(100, Math.round(progressRef.current)));
        animationFrameId = requestAnimationFrame(updateProgress);
      } else if (progressRef.current > currentProgress) {
        progressRef.current = currentProgress;
        setSmoothProgress(Math.round(currentProgress));
      }
    };
    updateProgress();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [progress]);

  const handleStartTask = useCallback(async () => {
    if (!apiConfig?.apiKey) {
      setError('请先在 API 配置中填写 API Key');
      return;
    }

    if (activeMode === 'create' && !topic.trim()) {
      setError('请输入写作主题');
      return;
    }

    if (activeMode === 'humanize' && !sourceArticle.trim()) {
      setError('请输入待润色的初稿内容');
      return;
    }

    setError('');
    setStatusLogs([]);
    logsRef.current = [];

    const task = createTask(
      activeMode === 'create' ? topic : sourceArticle,
      requirements,
      selectedPersonaId || undefined
    );
  }, [topic, sourceArticle, requirements, selectedPersonaId, activeMode, createTask, apiConfig, setError]);

  const handleApproveOutline = useCallback(async () => {
    if (currentTask?.outline) {
      setTaskStatus('generating');
    }
  }, [currentTask, setTaskStatus]);

  const handleCopy = useCallback(() => {
    if (currentTask?.finalDraft) {
      navigator.clipboard.writeText(currentTask.finalDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentTask?.finalDraft]);

  const handleCreatePersona = useCallback(async () => {
    if (sampleTexts.some(text => text.trim())) {
      setIsCreatingPersona(true);
      try {
        const newPersona: WritingPersona = {
          id: `persona-${Date.now()}`,
          userId: 'current-user',
          name: '自定义人格',
          description: '基于用户提供的样本创建',
          vectorFeatures: [],
          staticRules: [],
          dynamicPreferences: {
            formality: 0.5,
            complexity: 0.5,
            emotionDensity: 0.5,
            directness: 0.5,
            rhythm: 'medium',
            perspective: 'third'
          },
          vocabulary: {
            preferred: [],
            avoided: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addPersona(newPersona);
        setSelectedPersonaId(newPersona.id);
        setShowPersonaPanel(false);
        setSampleTexts(['']);
      } catch (error) {
        setError('创建人格失败，请重试');
      } finally {
        setIsCreatingPersona(false);
      }
    } else {
      setError('请至少提供一个样本文本');
    }
  }, [sampleTexts, addPersona, setError, setIsCreatingPersona, setSelectedPersonaId, setShowPersonaPanel, setSampleTexts]);

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      queued: { label: '排队中', color: 'bg-slate-500' },
      researching: { label: '深度调研中', color: 'bg-cyan-500' },
      outline_pending: { label: '大纲待确认', color: 'bg-amber-500' },
      generating: { label: '内容生成中', color: 'bg-indigo-500' },
      reviewing: { label: '终检中', color: 'bg-purple-500' },
      completed: { label: '已完成', color: 'bg-indigo-600' },
      failed: { label: '生成失败', color: 'bg-red-500' },
      cancelled: { label: '已取消', color: 'bg-slate-500' },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-slate-500' };
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const isHeading = (line.length < 20 && !line.includes('。')) || line.includes('01') || line.includes('02') || line.includes('03');
      if (isHeading) {
        return (
          <h3
            key={index}
            className="text-lg font-bold text-indigo-600 mb-4 mt-8 border-l-4 border-indigo-500 pl-3 bg-indigo-50/50 py-1"
          >
            {line}
          </h3>
        );
      }
      return (
        <p key={index} className="mb-6 text-justify text-slate-700/80 dark:text-indigo-100/80">
          {line}
        </p>
      );
    });
  };

  const [wordCount, setWordCount] = useState(1500);

  return (
    <div className={cn('w-full flex flex-col space-y-8', className)}>
      
      {/* 核心操作卡片 */}
      <div className="w-full bg-white/80 dark:bg-[#0F0A1E]/80 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_30px_rgba(79,70,229,0.08)] border border-indigo-100/50 dark:border-indigo-500/15 p-8 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-indigo-50 mb-8 transition-colors duration-300">专属原创爆文引擎</h1>

        {/* 双主干入口卡片 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* 左侧卡片 - 一键爆文生成 */}
          <div 
            onClick={() => setActiveMode('create')}
            className={cn(
              'rounded-2xl p-6 shadow-lg cursor-pointer relative overflow-hidden transition-all duration-300',
              activeMode === 'create'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-violet-400/30'
                : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:border-indigo-100 shadow-sm'
            )}
          >
            <div className="text-4xl mb-3">✨</div>
            <h3 className={cn(
              'text-xl font-bold mb-2',
              activeMode === 'create' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
            )}>
              一键爆文生成
            </h3>
            <p className={cn(
              'text-sm',
              activeMode === 'create' ? 'text-white/80' : 'text-slate-500'
            )}>
              输入灵感，内置拟人底层逻辑，直接生成高质量原创长文
            </p>
          </div>

          {/* 右侧卡片 - 去AI味润色 */}
          <div 
            onClick={() => setActiveMode('humanize')}
            className={cn(
              'rounded-2xl p-6 cursor-pointer relative overflow-hidden transition-all duration-300',
              activeMode === 'humanize'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-violet-400/30'
                : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:border-indigo-100 shadow-sm'
            )}
          >
            {/* 卖点标签 */}
            <div className="absolute top-4 right-4">
              <span className="bg-gradient-to-r from-red-500 to-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                🔥 破发核心 / 极力推荐
              </span>
            </div>

            <div className="text-4xl mb-3">🛡️</div>
            <h3 className={cn(
              'text-xl font-bold mb-2',
              activeMode === 'humanize' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
            )}>
              存稿 / 去 AI 痕迹
            </h3>
            <p className={cn(
              'text-sm',
              activeMode === 'humanize' ? 'text-white/80' : 'text-slate-500'
            )}>
              已有草稿？一键洗去 AI 机械感，注入人类真实情绪，深度去AI化改写
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {activeMode === 'create' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-indigo-500 dark:text-indigo-300 mb-2 transition-colors duration-300">
                  写作主题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="请输入文章主题或核心需求..."
                  className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-900 dark:text-indigo-100 text-base transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                  disabled={isRunning}
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm font-medium text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200 flex items-center gap-1 transition-colors"
                >
                  {showAdvanced ? '⬆️ 收起高阶设定' : '✨ 展开高阶爆文设定 (大幅提升文章深度)'}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-5 mt-4 pt-6 border-t border-indigo-100/50 dark:border-indigo-500/15 transition-colors duration-300">
                  <div>
                    <label className="block text-sm font-medium text-indigo-500 dark:text-indigo-300 mb-2 transition-colors duration-300">核心痛点 (选填)</label>
                    <textarea
                      value={painPoint}
                      onChange={(e) => setPainPoint(e.target.value)}
                      placeholder="描述目标人群在这个话题下的核心痛点..."
                      rows={3}
                      className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-900 dark:text-indigo-100 text-base transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-500 dark:text-indigo-300 mb-2 transition-colors duration-300">真实细节描述 (选填)</label>
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="用一个具体的物品或场景来生动证明..."
                      rows={3}
                      className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-900 dark:text-indigo-100 text-base transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-500 dark:text-indigo-300 mb-2 transition-colors duration-300">结尾升华/金句 (选填)</label>
                    <textarea
                      value={sublimation}
                      onChange={(e) => setSublimation(e.target.value)}
                      placeholder="给面临类似困境的人一句点醒他们的建议..."
                      rows={3}
                      className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-900 dark:text-indigo-100 text-base transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-indigo-500 dark:text-indigo-300 mb-2 transition-colors duration-300">
                待润色的初稿内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={sourceArticle}
                onChange={(e) => setSourceArticle(e.target.value)}
                placeholder="请在此粘贴由其他 AI 生成的初始文本。系统将通过自然语言处理引擎进行深度重写与情感注入..."
                rows={12}
                className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-900 dark:text-indigo-100 text-base transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                disabled={isRunning}
              />
            </div>
          )}

          {activeMode === 'create' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-indigo-500 dark:text-indigo-300 transition-colors duration-300">专属写作风格</label>
                <button
                  onClick={() => setShowPersonaPanel(!showPersonaPanel)}
                  className="text-sm font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  {showPersonaPanel ? '收起' : '+ 创建新人格'}
                </button>
              </div>

              {showPersonaPanel ? (
                <div className="border border-indigo-100/50 dark:border-indigo-500/15 rounded-xl p-5 bg-indigo-50/30 dark:bg-[#0F0A1E] space-y-4 transition-colors duration-300">
                  <p className="text-sm text-slate-700/60 dark:text-indigo-300/60 transition-colors duration-300">
                    请上传您希望学习的原创文章样本（至少1篇，每篇100字以上）
                  </p>
                  {sampleTexts.map((text, index) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-slate-700/60 dark:text-indigo-300/60 mb-1 transition-colors duration-300">
                        样本 {index + 1}
                      </label>
                      <textarea
                        value={text}
                        onChange={(e) => {
                          const newTexts = [...sampleTexts];
                          newTexts[index] = e.target.value;
                          setSampleTexts(newTexts);
                        }}
                        placeholder="粘贴原创文章内容..."
                        rows={4}
                        className="w-full px-3 py-2 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-sm text-slate-900 dark:text-indigo-100 transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                        disabled={isRunning}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSampleTexts([...sampleTexts, ''])} className="text-sm text-indigo-600 font-medium transition-colors">
                      + 添加更多样本
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePersona}
                    disabled={isCreatingPersona}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isCreatingPersona ? '正在深度分析提取...' : '分析并提取专属人格'}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedPersonaId || ''}
                    onChange={(e) => setSelectedPersonaId(e.target.value || null)}
                    className="w-full px-4 py-3 bg-indigo-50/30 dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 text-slate-900 dark:text-indigo-100 text-sm transition-colors"
                    disabled={isRunning}
                  >
                    <option value="">默认通用大模型音色</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.description ? p.description.slice(0, 30) + '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 重构后的去AI化引擎卡片 */}
          <div className={`rounded-xl p-5 border transition-all duration-300 ${isAntiAiMode ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/20' : 'border-violet-500/30 bg-violet-500/5'}`}>
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-12 h-6 rounded-full transition-all duration-300 cursor-pointer relative ${isAntiAiMode ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  onClick={() => !isRunning && setIsAntiAiMode(!isAntiAiMode)}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${isAntiAiMode ? 'left-7' : 'left-1'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-indigo-700 dark:text-violet-200 flex items-center gap-2 transition-colors">
                    ✨ 开启『去 AI 痕迹』拟人引擎 (Anti-AI Detection)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-violet-300/80 mt-1 leading-relaxed transition-colors">
                    <strong>功能介绍：</strong>彻底摒弃传统 AI 机械句式。采用真人口语化表达与情绪流递进，实现高度拟人化创作，让文章回归真实质感，轻松获取平台高推荐权重。
                  </p>
                </div>
              </div>
            </div>
            
            {activeMode === 'create' && (
              <div className="mt-4 pt-4 border-t border-violet-200/30 dark:border-violet-400/20">
                <button
                  onClick={() => setShowSkeletonPanel(!showSkeletonPanel)}
                  className="text-sm font-medium text-violet-500 dark:text-violet-300 hover:text-violet-600 dark:hover:text-violet-200 transition-colors"
                >
                  {showSkeletonPanel ? '收起底层骨架设定' : '📥 注入人类底层骨架 (降重利器)'}
                </button>
                
                {showSkeletonPanel && (
                  <div className="mt-3 border border-violet-200/40 dark:border-violet-500/20 rounded-xl p-4 bg-white/50 dark:bg-[#0F0A1E]/50 transition-colors duration-300">
                    <p className="text-xs text-slate-600 dark:text-violet-300/70 mb-3 transition-colors duration-300">
                      贴入一篇结构优秀的人类文章，AI 将提取其"句法节奏"和"排版骨架"为您生成新文。
                    </p>
                    <textarea
                      value={referenceSkeleton}
                      onChange={(e) => setReferenceSkeleton(e.target.value)}
                      placeholder="粘贴参考骨架文本..."
                      rows={4}
                      className="w-full px-3 py-2 bg-violet-50/50 dark:bg-[#0F0A1E] border border-violet-200/50 dark:border-violet-500/20 rounded-lg text-sm text-slate-900 dark:text-violet-100 transition-colors placeholder-slate-400 dark:placeholder-violet-400/40"
                      disabled={isRunning}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium transition-colors duration-300">
              ⚠️ {error}
            </div>
          )}

          {activeMode === 'create' && (
            <div className="mt-6 p-5 bg-indigo-50/50 dark:bg-[#0F0A1E]/50 rounded-xl border border-indigo-100/50 dark:border-indigo-500/15 transition-colors duration-300">
              <h2 className="text-sm font-semibold text-indigo-500 dark:text-indigo-300 mb-4 flex items-center gap-2 transition-colors duration-300">
                🎯 目标输出字数控制
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="300"
                    max="3000"
                    step="100"
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    className="w-full h-2 bg-indigo-100 dark:bg-[#0F0A1E] rounded-lg appearance-none cursor-pointer accent-indigo-400 dark:accent-indigo-400 transition-colors [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer dark:[&::-webkit-slider-thumb]:bg-indigo-400 dark:[&::-moz-range-thumb]:bg-indigo-400"
                    disabled={isRunning}
                  />
                </div>
                <div className="text-lg font-bold text-indigo-500 dark:text-indigo-300 min-w-[80px] text-right transition-colors duration-300">
                  {wordCount} 字
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮组：满宽 */}
          <div className="flex gap-4 pt-4 border-t border-indigo-100/50 dark:border-indigo-500/15 transition-colors duration-300">
            {!currentTask && !isRunning && (
              <button
                onClick={handleStartTask}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-400/30 dark:shadow-violet-400/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {activeMode === 'create' ? '🚀 启动爆文引擎' : '🛡️ 开始拟人重塑'}
                </span>
                <div className="absolute bottom-0 left-0 h-1 bg-white/50 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>
              </button>
            )}

            {activeMode === 'create' && currentTask?.status === 'outline_pending' && !isRunning && (
              <div className="flex w-full gap-4">
                <button
                  onClick={handleApproveOutline}
                  className="flex-1 py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/30 hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    ✅ 确认大纲，开始生成正文
                  </span>
                  <div className="absolute bottom-0 left-0 h-1 bg-white/50 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all"
                >
                  重新生成
                </button>
              </div>
            )}

            {isRunning && (
              <button
                onClick={cancelTask}
                className="w-full py-3.5 bg-slate-500 dark:bg-[#1A1528] text-white dark:text-indigo-300 rounded-xl font-bold shadow-lg hover:bg-slate-600 dark:hover:bg-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  中止任务
                  <span className="text-xs bg-white/20 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full">
                    {smoothProgress}%
                  </span>
                </span>
                <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 dark:bg-indigo-400 transition-all duration-500 ease-out" style={{ width: `${smoothProgress}%` }}></div>
              </button>
            )}

            {currentTask?.finalDraft && (
              <button
                onClick={reset}
                className="w-full py-3.5 bg-indigo-500 dark:bg-indigo-500 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 dark:hover:bg-indigo-400 transition-all"
              >
                ✨ 开启新的创作
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 生成进度与结果卡片 */}
      {currentTask && (
        <div className="w-full bg-white/80 dark:bg-[#0F0A1E]/80 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_30px_rgba(79,70,229,0.08)] border border-indigo-100/50 dark:border-indigo-500/15 p-8 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-indigo-50 transition-colors duration-300">{currentTask.topic}</h2>
              <p className="text-sm text-slate-700/60 dark:text-indigo-300/60 mt-1 font-medium transition-colors duration-300">
                {getStatusDisplay(currentTask.status).label}
              </p>
            </div>
            <div className={cn('w-3 h-3 rounded-full animate-pulse', getStatusDisplay(currentTask.status).color)} />
          </div>

          <div className="space-y-6">
            {activeMode === 'create' && isRunning && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-xl p-5 font-mono text-sm border border-slate-800 shadow-inner">
                  <div className="text-indigo-400 mb-3 font-bold flex items-center gap-2">
                    <span className="animate-spin">⚙️</span> 系统运行日志
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    {statusLogs.map((log, i) => (
                      <div key={i} className="text-indigo-400/90 text-xs">
                        <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                      </div>
                    ))}
                    <div className="text-indigo-400 text-xs animate-pulse">▮</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="h-2 bg-indigo-100 dark:bg-[#0F0A1E] rounded-full overflow-hidden transition-colors duration-300">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 ease-out"
                      style={{ width: `${smoothProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 大纲展示区 */}
            {activeMode === 'create' && currentTask.outline && !currentTask.finalDraft && (
              <div className="border border-indigo-100/50 dark:border-indigo-500/15 rounded-xl overflow-hidden bg-indigo-50/30 dark:bg-[#0F0A1E] transition-colors duration-300">
                <div className="px-5 py-4 border-b border-indigo-100/50 dark:border-indigo-500/15 bg-white/80 dark:bg-[#0F0A1E]/80 transition-colors duration-300">
                  <h3 className="font-bold text-slate-800 dark:text-indigo-50 transition-colors duration-300">📑 智能大纲结构</h3>
                </div>
                <div className="p-5">
                  {currentTask.outline.sections && Array.isArray(currentTask.outline.sections) && currentTask.outline.sections.length > 0 ? (
                    <ul className="list-none space-y-4">
                      {currentTask.outline.sections.map((section: any, index: number) => (
                        <li key={index} className="text-slate-700/60 dark:text-indigo-300/60 transition-colors duration-300">
                          <p className="font-bold text-indigo-600 dark:text-indigo-300 text-base mb-2 transition-colors duration-300">
                            <span className="text-indigo-400 dark:text-indigo-500 mr-2">0{index + 1}.</span>{section.corePosition}
                          </p>
                          {section.coreKeyPoints && section.coreKeyPoints.length > 0 && (
                            <ul className="pl-6 space-y-1.5 text-sm text-slate-700/60 dark:text-indigo-300/60 border-l-2 border-indigo-100/50 dark:border-indigo-500/15 ml-2 transition-colors duration-300">
                              {section.coreKeyPoints.map((point: string, i: number) => (
                                <li key={i} className="relative before:content-[''] before:absolute before:-left-[17px] before:top-2 before:w-2 before:h-2 before:bg-indigo-200 dark:before:bg-indigo-500/50 before:rounded-full">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-700/40 dark:text-indigo-500/40 text-sm text-center py-4">大纲正在生成中...</p>
                  )}
                </div>
              </div>
            )}

            {/* 最终结果展示区 */}
            {(activeMode === 'humanize' || currentTask.status === 'generating' || currentTask.finalDraft) && (
              <div className="border border-indigo-100/50 dark:border-indigo-500/15 rounded-xl p-6 shadow-sm bg-indigo-50/30 dark:bg-[#0F0A1E] transition-colors duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-indigo-100/50 dark:border-indigo-500/15 transition-colors duration-300">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-indigo-50 transition-colors duration-300">📄 成文预览</h3>
                  {currentTask.finalDraft && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsFormatted(!isFormatted)}
                        className="px-4 py-2 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 font-semibold transition-colors"
                      >
                        🪄 {isFormatted ? '取消高亮排版' : '一键高亮排版'}
                      </button>
                      <button
                        onClick={handleCopy}
                        className={cn(
                          'px-6 py-2 text-sm rounded-lg transition-all duration-200 font-bold shadow-sm',
                          copied 
                            ? 'bg-indigo-500 text-white shadow-indigo-500/20' 
                            : 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-indigo-50 hover:scale-105'
                        )}
                      >
                        {copied ? '✅ 已复制到剪贴板' : '一键复制全文'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  "mx-auto w-full transition-all duration-300",
                  isFormatted 
                    ? "text-[16px] md:text-[17px] leading-[2.2] tracking-[0.05em]"
                    : "text-base leading-[2]"
                )}>
                  {isFormatted 
                    ? renderFormattedContent(currentTask.finalDraft || (currentTask.paragraphs?.filter(p => p.content).map(p => p.content).join('\n\n')) || '')
                    : (currentTask.finalDraft || (currentTask.paragraphs?.filter(p => p.content).map(p => p.content).join('\n\n')) || '').split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-6 text-slate-700/80 dark:text-indigo-100/80 transition-colors duration-300">
                          {paragraph}
                        </p>
                      ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部合规声明 */}
      <div className="text-center text-xs text-slate-700/40 dark:text-indigo-500/40 pt-2 pb-6 px-4 transition-colors duration-300">
        💡 平台合规提示：本系统提供的辅助创作与文本优化服务仅供灵感参考与效率提升。严禁用于学术造假、制造虚假新闻等不当用途。
      </div>
    </div>
  );
}