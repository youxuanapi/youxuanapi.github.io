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
  const [showPersonaList, setShowPersonaList] = useState(false);
  const [wordCount, setWordCount] = useState(1500);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeMode, setActiveMode] = useState<'create' | 'humanize'>('create');
  const [sourceArticle, setSourceArticle] = useState('');
  const [isFormatted, setIsFormatted] = useState(false);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);

  useEffect(() => {
    loadLocalPersonas();
  }, [loadLocalPersonas]);

  useEffect(() => {
    if (selectedPersonaId) {
      const selected = personas.find(p => p.id === selectedPersonaId);
      if (selected) {
        setPersona(selected);
      }
    }
  }, [selectedPersonaId, personas, setPersona]);

  const handleCreatePersona = async () => {
    if (!apiConfig?.apiBaseUrl || !apiConfig?.apiKey || !apiConfig?.model) {
      setError('请先配置API');
      return;
    }

    const validSamples = sampleTexts.filter(s => s.trim().length > 100);
    if (validSamples.length < 1) {
      setError('请提供至少1篇100字以上的原创样本');
      return;
    }

    setIsCreatingPersona(true);
    setError(null);

    try {
      const response = await fetch('/api/writing-agent/create-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: validSamples,
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '人格创建失败');
      }

      setPersona(data.persona);
      addPersona(data.persona);
      setSelectedPersonaId(data.persona.id);
      setShowPersonaPanel(false);
      setSampleTexts(['']);
    } catch (err) {
      setError(err instanceof Error ? err.message : '人格创建失败');
    } finally {
      setIsCreatingPersona(false);
    }
  };

  const handleStartTask = async () => {
    if (!apiConfig?.apiKey || apiConfig.apiKey.trim() === '') {
      setError('请先配置您的 API Key 以启动生成工具');
      return;
    }

    if (activeMode === 'create' && !topic.trim()) {
      setError('请输入写作主题');
      return;
    }

    if (activeMode === 'humanize' && !sourceArticle.trim()) {
      setError('请粘贴您的待润色初稿内容');
      return;
    }

    if (!apiConfig?.apiBaseUrl || !apiConfig?.model) {
      setError('请先配置完整的API信息');
      return;
    }

    setError(null);
    setRunning(true);
    setStatusLogs(['[系统初始化] 正在启动写作引擎...']);

    if (activeMode === 'create') {
      const customInputs = { painPoint, detail, sublimation };
      const task = createTask(topic, requirements, selectedPersonaId || undefined);

      setStatusLogs(prev => [...prev, '[调研引擎] 正在检索全网同质化禁用清单...']);

      const submissionPersona = (!persona || Object.keys(persona).length === 0) ? null : persona;

      try {
        const response = await fetch('/api/writing-agent/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            requirements,
            customInputs,
            apiBaseUrl: apiConfig.apiBaseUrl,
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
            styleData: submissionPersona,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '任务创建失败');
        }

        if (data.outline) {
          setStatusLogs(prev => [...prev, '[大纲引擎] 正在根据标题动态构建递进式逻辑框架...']);
          setOutline(data.outline);
          setTaskStatus('outline_pending');
        }

        setRunning(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '任务创建失败');
        setRunning(false);
      }
    } else {
      try {
        const response = await fetch('/api/writing-agent/humanize-optimizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: sourceArticle,
            apiBaseUrl: apiConfig.apiBaseUrl,
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
          }),
        });

        const data = await response.json();

        if (response.ok && data.optimizedText) {
          const task = createTask('深度拟人润色', '', selectedPersonaId || undefined);
          setFinalDraft(data.optimizedText);
          setTaskStatus('completed');
        } else {
          setError(data.error || '润色失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '润色失败');
      } finally {
        setRunning(false);
      }
    }
  };

  const handleApproveOutline = async () => {
    if (isRunning) return;
    if (!currentTask?.outline) return;
    if (!apiConfig?.apiBaseUrl || !apiConfig?.apiKey || !apiConfig?.model) {
      setError('请先配置API');
      return;
    }

    setRunning(true);
    setTaskStatus('generating');
    setStatusLogs(prev => [...prev, '[内容工厂] 正在启动逐段生成流程...']);

    const sections = currentTask.outline.sections || [];
    const paragraphs: string[] = [];
    let previousContent = '';
    const customInputs = { painPoint, detail, sublimation };

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      setStatusLogs(prev => [...prev, `[内容工厂] 正在注入第${i + 1}段真人化叙事细节...`]);

      try {
        const response = await fetch('/api/writing-agent/generate-paragraph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: currentTask.id,
            paragraphIndex: i,
            section,
            previousContent,
            persona,
            outline: currentTask.outline,
            researchReport: currentTask.researchReport,
            topic: currentTask.topic,
            customInputs,
            apiBaseUrl: apiConfig.apiBaseUrl,
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
            isAntiAiMode,
            referenceSkeleton,
          }),
        });

        const data = await response.json();

        if (response.ok && data.content) {
          paragraphs.push(data.content);
          previousContent = paragraphs.join('\n\n');

          updateParagraph(data.paragraphId, {
            content: data.content,
            status: 'completed',
            validationResult: data.validationResults || data.validationResult,
          });
        }
      } catch (err) {
        console.error('段落生成异常:', err);
      }
    }

    const finalDraft = paragraphs.join('\n\n');
    setStatusLogs(prev => [...prev, '[终检引擎] 正在执行拟人化润色，消除AI痕迹...']);
    setFinalDraft(finalDraft);
    setTaskStatus('completed');
    setRunning(false);
  };

  const handleCopy = async () => {
    if (!currentTask?.finalDraft) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentTask.finalDraft);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentTask.finalDraft;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('降级复制失败:', err);
          alert('复制失败，请手动选择文本复制');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动选择文本复制');
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '等待中', color: 'bg-slate-500' },
      initializing: { label: '初始化中', color: 'bg-indigo-500' },
      researching: { label: '深度调研中', color: 'bg-cyan-500' },
      outline_pending: { label: '大纲待确认', color: 'bg-amber-500' },
      generating: { label: '内容生成中', color: 'bg-emerald-500' },
      reviewing: { label: '终检中', color: 'bg-purple-500' },
      completed: { label: '已完成', color: 'bg-emerald-600' },
      failed: { label: '生成失败', color: 'bg-red-500' },
      cancelled: { label: '已取消', color: 'bg-slate-500' },
    };
    return statusMap[status] || { label: status, color: 'bg-slate-500' };
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const isHeading = (line.length < 20 && !line.includes('。')) || line.includes('01') || line.includes('02') || line.includes('03');
      if (isHeading) {
        return (
          <h3
            key={index}
            className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4 mt-8 border-l-4 border-indigo-600 dark:border-indigo-500 pl-3 bg-indigo-50/50 dark:bg-indigo-900/20 py-1"
          >
            {line}
          </h3>
        );
      }
      return (
        <p key={index} className="mb-6 text-justify text-slate-700 dark:text-slate-300">
          {line}
        </p>
      );
    });
  };

  // ================= 彻底移除了导致歪曲的包裹层 =================
  return (
    <div className={cn('w-full flex flex-col space-y-8', className)}>
      
      {/* 核心操作卡片 */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 p-8 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 transition-colors duration-300">专属原创爆文引擎</h1>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/50 rounded-full p-1.5 shadow-inner border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-300">
            <button
              onClick={() => setActiveMode('create')}
              className={cn(
                'px-8 py-2.5 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 text-sm',
                activeMode === 'create'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              ✨ 原创爆文生成
            </button>
            <button
              onClick={() => setActiveMode('humanize')}
              className={cn(
                'px-8 py-2.5 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 text-sm',
                activeMode === 'humanize'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              🛡️ 深度拟人润色
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {activeMode === 'create' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
                  写作主题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="请输入文章主题或核心需求..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-base transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                  disabled={isRunning}
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  {showAdvanced ? '⬆️ 收起高阶设定' : '✨ 展开高阶爆文设定 (大幅提升文章深度)'}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-5 mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">核心痛点 (选填)</label>
                    <textarea
                      value={painPoint}
                      onChange={(e) => setPainPoint(e.target.value)}
                      placeholder="描述目标人群在这个话题下的核心痛点..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-base transition-colors"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">真实细节描述 (选填)</label>
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="用一个具体的物品或场景来生动证明..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-base transition-colors"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">结尾升华/金句 (选填)</label>
                    <textarea
                      value={sublimation}
                      onChange={(e) => setSublimation(e.target.value)}
                      placeholder="给面临类似困境的人一句点醒他们的建议..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-base transition-colors"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">
                待润色的初稿内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={sourceArticle}
                onChange={(e) => setSourceArticle(e.target.value)}
                placeholder="请在此粘贴由其他 AI 生成的初始文本。系统将通过自然语言处理引擎进行深度重写与情感注入..."
                rows={12}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-base transition-colors"
                disabled={isRunning}
              />
            </div>
          )}

          {activeMode === 'create' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">专属写作人格</label>
                <button
                  onClick={() => setShowPersonaPanel(!showPersonaPanel)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  {showPersonaPanel ? '收起' : '+ 创建新人格'}
                </button>
              </div>

              {showPersonaPanel ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/30 space-y-4 transition-colors duration-300">
                  <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    请上传您希望学习的原创文章样本（至少1篇，每篇100字以上）
                  </p>
                  {sampleTexts.map((text, index) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 transition-colors duration-300">
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
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 transition-colors"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSampleTexts([...sampleTexts, ''])} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium transition-colors">
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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm transition-colors"
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

          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="checkbox"
                id="antiAiMode"
                checked={isAntiAiMode}
                onChange={(e) => setIsAntiAiMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 transition-colors"
                disabled={isRunning}
              />
              <label htmlFor="antiAiMode" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors duration-300">
                ✨ 开启真实感引擎 (Human-Touch Mode)
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 ml-7 mb-4 transition-colors duration-300">
              开启后将深度模拟真实人类的叙事逻辑、情绪波动与语言习惯，大幅降低AI检测率。
            </p>

            {activeMode === 'create' && (
              <div className="ml-7">
                <button
                  onClick={() => setShowSkeletonPanel(!showSkeletonPanel)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  {showSkeletonPanel ? '收起底层骨架设定' : '📥 注入人类底层骨架 (降重利器)'}
                </button>
                
                {showSkeletonPanel && (
                  <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/30 transition-colors duration-300">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-300">
                      贴入一篇结构优秀的人类文章，AI 将提取其"句法节奏"和"排版骨架"为您生成新文。
                    </p>
                    <textarea
                      value={referenceSkeleton}
                      onChange={(e) => setReferenceSkeleton(e.target.value)}
                      placeholder="粘贴参考骨架文本..."
                      rows={4}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 transition-colors"
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
            <div className="mt-6 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-300">
              <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2 transition-colors duration-300">
                🎯 目标输出字数控制
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="800"
                    max="3000"
                    step="100"
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 transition-colors"
                    disabled={isRunning}
                  />
                </div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 min-w-[80px] text-right transition-colors duration-300">
                  {wordCount} 字
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮组：满宽 */}
          <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
            {!currentTask && !isRunning && (
              <button
                onClick={handleStartTask}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
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
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    ✅ 确认大纲，开始生成正文
                  </span>
                  <div className="absolute bottom-0 left-0 h-1 bg-white/50 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  重新生成
                </button>
              </div>
            )}

            {isRunning && (
              <button
                onClick={cancelTask}
                className="w-full py-3.5 bg-slate-500 text-white rounded-xl font-bold shadow-lg hover:bg-slate-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span className="animate-pulse">⏹</span>
                  中止任务
                </span>
                <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 w-[100%] animate-[energyCharge_2s_infinite_ease-in-out]"></div>
              </button>
            )}

            {currentTask?.finalDraft && (
              <button
                onClick={reset}
                className="w-full py-3.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-all"
              >
                ✨ 开启新的创作
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 生成进度与结果卡片 */}
      {currentTask && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 p-8 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-300">{currentTask.topic}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium transition-colors duration-300">
                {getStatusDisplay(currentTask.status).label}
              </p>
            </div>
            <div className={cn('w-3 h-3 rounded-full animate-pulse', getStatusDisplay(currentTask.status).color)} />
          </div>

          <div className="space-y-6">
            {activeMode === 'create' && isRunning && (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-xl p-5 font-mono text-sm border border-slate-800 shadow-inner">
                  <div className="text-emerald-400 mb-3 font-bold flex items-center gap-2">
                    <span className="animate-spin">⚙️</span> 系统运行日志
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    {statusLogs.map((log, i) => (
                      <div key={i} className="text-emerald-400/90 text-xs">
                        <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                      </div>
                    ))}
                    <div className="text-emerald-400 text-xs animate-pulse">▮</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors duration-300">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                      style={{
                        width: `${
                          currentTask.status === 'completed' ? 100 :
                          currentTask.status === 'generating' 
                            ? Math.min(90, Math.max(30, (currentTask.paragraphs ? currentTask.paragraphs.filter(p => p.status === 'completed').length : 0) / (currentTask.paragraphs ? Math.max(1, currentTask.paragraphs.length) : 1) * 90)) :
                          currentTask.status === 'outline_pending' ? 30 :
                          currentTask.status === 'researching' ? 15 :
                          5
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 大纲展示区 */}
            {activeMode === 'create' && currentTask.outline && !currentTask.finalDraft && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/30 transition-colors duration-300">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 transition-colors duration-300">
                  <h3 className="font-bold text-slate-900 dark:text-white transition-colors duration-300">📑 智能大纲结构</h3>
                </div>
                <div className="p-5">
                  {currentTask.outline.sections && Array.isArray(currentTask.outline.sections) && currentTask.outline.sections.length > 0 ? (
                    <ul className="list-none space-y-4">
                      {currentTask.outline.sections.map((section: any, index: number) => (
                        <li key={index} className="text-slate-700 dark:text-slate-300 transition-colors duration-300">
                          <p className="font-bold text-indigo-700 dark:text-indigo-400 text-base mb-2 transition-colors duration-300">
                            <span className="text-indigo-300 mr-2">0{index + 1}.</span>{section.corePosition}
                          </p>
                          {section.coreKeyPoints && section.coreKeyPoints.length > 0 && (
                            <ul className="pl-6 space-y-1.5 text-sm text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 ml-2 transition-colors duration-300">
                              {section.coreKeyPoints.map((point: string, i: number) => (
                                <li key={i} className="relative before:content-[''] before:absolute before:-left-[17px] before:top-2 before:w-2 before:h-2 before:bg-slate-300 dark:before:bg-slate-600 before:rounded-full">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-4">大纲正在生成中...</p>
                  )}
                </div>
              </div>
            )}

            {/* 最终结果展示区 */}
            {(activeMode === 'humanize' || currentTask.status === 'generating' || currentTask.finalDraft) && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm bg-slate-50/50 dark:bg-slate-800/20 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white transition-colors duration-300">📄 成文预览</h3>
                  {currentTask.finalDraft && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsFormatted(!isFormatted)}
                        className="px-4 py-2 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 font-semibold transition-colors"
                      >
                        🪄 {isFormatted ? '取消高亮排版' : '一键高亮排版'}
                      </button>
                      <button
                        onClick={handleCopy}
                        className={cn(
                          'px-6 py-2 text-sm rounded-lg transition-all duration-200 font-bold shadow-sm',
                          copied 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105'
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
                        <p key={index} className="mb-6 text-slate-800 dark:text-slate-200 transition-colors duration-300">
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
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2 pb-6 px-4 transition-colors duration-300">
        💡 平台合规提示：本系统提供的辅助创作与文本优化服务仅供灵感参考与效率提升。严禁用于学术造假、制造虚假新闻等不当用途。
      </div>
    </div>
  );
}