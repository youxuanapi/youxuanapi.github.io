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
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPersonaPanel, setShowPersonaPanel] = useState(false);
  const [sampleTexts, setSampleTexts] = useState<string[]>(['']);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLocalPersonas();
  }, [loadLocalPersonas]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [generationLogs]);

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
    if (!topic.trim()) {
      setError('请输入写作主题');
      return;
    }

    if (!apiConfig?.apiBaseUrl || !apiConfig?.apiKey || !apiConfig?.model) {
      setError('请先配置API');
      return;
    }

    setError(null);
    setRunning(true);
    setGenerationLogs([]);

    const task = createTask(topic, requirements, selectedPersonaId || undefined);
    setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 任务已创建: ${task.id}`]);

    try {
      setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 正在深度调研...`]);
      
      const response = await fetch('/api/writing-agent/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          requirements,
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          styleData: persona,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '任务创建失败');
      }

      setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 调研完成，大纲已生成`]);

      if (data.outline) {
        setOutline(data.outline);
        setTaskStatus('outline_pending');
        const sections = data.outline.sections || [];
        setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 大纲待确认，共 ${sections.length} 个段落`]);
      }

      setRunning(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '任务创建失败');
      setRunning(false);
    }
  };

  const handleApproveOutline = async () => {
    if (!currentTask?.outline) return;
    if (!apiConfig?.apiBaseUrl || !apiConfig?.apiKey || !apiConfig?.model) {
      setError('请先配置API');
      return;
    }

    setRunning(true);
    setTaskStatus('generating');

    const sections = currentTask.outline.sections || [];
    const paragraphs: string[] = [];
    let previousContent = '';

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTitle = section.title || section.corePosition || `段落 ${i + 1}`;
      setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 正在生成第 ${i + 1}/${sections.length} 段: ${sectionTitle}`]);

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
            apiBaseUrl: apiConfig.apiBaseUrl,
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
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

          const validationResults = data.validationResults || data.validationResult;
          const styleScore = validationResults?.styleValidation?.totalScore || validationResults?.styleScore || 0;
          setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 第 ${i + 1} 段生成完成，风格评分: ${styleScore}`]);
        } else {
          setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 第 ${i + 1} 段生成失败: ${data.error || '未知错误'}`]);
        }
      } catch (err) {
        setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 第 ${i + 1} 段生成异常: ${err instanceof Error ? err.message : '未知错误'}`]);
      }
    }

    const finalDraft = paragraphs.join('\n\n');
    setFinalDraft(finalDraft);
    setTaskStatus('completed');
    setRunning(false);
    setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 全部生成完成！`]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentTask?.finalDraft || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '等待中', color: 'bg-gray-500' },
      initializing: { label: '初始化中', color: 'bg-blue-500' },
      researching: { label: '深度调研中', color: 'bg-cyan-500' },
      outline_pending: { label: '大纲待确认', color: 'bg-yellow-500' },
      generating: { label: '内容生成中', color: 'bg-green-500' },
      reviewing: { label: '终检中', color: 'bg-purple-500' },
      completed: { label: '已完成', color: 'bg-green-600' },
      failed: { label: '生成失败', color: 'bg-red-500' },
      cancelled: { label: '已取消', color: 'bg-gray-500' },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-500' };
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">专属原创写作Agent</h1>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写作主题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="请输入文章主题或核心需求"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  补充要求
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="可选：添加更多具体要求、风格偏好、字数要求等"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    写作人格
                  </label>
                  <button
                    onClick={() => setShowPersonaPanel(!showPersonaPanel)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showPersonaPanel ? '收起' : '+ 创建新人格'}
                  </button>
                </div>

                {showPersonaPanel ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                    <p className="text-sm text-gray-600">
                      请上传您希望学习的原创文章样本（至少1篇，每篇100字以上）
                    </p>
                    {sampleTexts.map((text, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
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
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSampleTexts([...sampleTexts, ''])}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + 添加更多样本
                      </button>
                    </div>
                    <button
                      onClick={handleCreatePersona}
                      disabled={isCreatingPersona}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingPersona ? '分析中...' : '分析并创建人格'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedPersonaId || ''}
                      onChange={(e) => setSelectedPersonaId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      disabled={isRunning}
                    >
                      <option value="">不使用专属人格</option>
                      {personas.map((p) => {
                        const displayDesc = p.description 
                          ? (p.description.length > 30 ? p.description.slice(0, 30) + '...' : p.description)
                          : '无描述';
                        return (
                          <option 
                            key={p.id} 
                            value={p.id}
                            title={`${p.name} - ${p.description || '无描述'}`}
                          >
                            {p.name} - {displayDesc}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                {!isRunning && !currentTask?.finalDraft && (
                  <button
                    onClick={handleStartTask}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    开始写作
                  </button>
                )}

                {currentTask?.status === 'outline_pending' && (
                  <button
                    onClick={handleApproveOutline}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    确认大纲，开始生成
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={cancelTask}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    取消任务
                  </button>
                )}

                {currentTask?.finalDraft && (
                  <button
                    onClick={reset}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    新建任务
                  </button>
                )}
              </div>
            </div>
          </div>

          {currentTask && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">任务进度</h2>
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', getStatusDisplay(currentTask.status).color)} />
                  <span className="text-sm font-medium">{getStatusDisplay(currentTask.status).label}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{
                          width: `${
                            currentTask.status === 'completed' ? 100 :
                            currentTask.status === 'generating' ? 50 :
                            currentTask.status === 'outline_pending' ? 30 :
                            10
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {currentTask.paragraphs ? currentTask.paragraphs.filter(p => p.status === 'completed').length : 0}/{currentTask.paragraphs ? currentTask.paragraphs.length : 0} 段落
                  </span>
                </div>

                {currentTask.outline && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">{currentTask.outline.title || '大纲'}</h3>
                      <p className="text-sm text-gray-600">{currentTask.outline.theme || ''}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {generationLogs.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">执行日志</h2>
              <div
                ref={logsRef}
                className="bg-gray-900 text-gray-100 rounded-lg p-4 h-48 overflow-auto font-mono text-sm"
              >
                {generationLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}

          {currentTask?.finalDraft && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">生成结果</h2>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg transition-all duration-200',
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {copied ? '已复制!' : '复制全文'}
                </button>
              </div>
              <div className="prose prose-blue max-w-none">
                {currentTask.finalDraft.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
