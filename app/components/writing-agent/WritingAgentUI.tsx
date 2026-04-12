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
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPersonaPanel, setShowPersonaPanel] = useState(false);
  const [sampleTexts, setSampleTexts] = useState<string[]>(['']);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isAntiAiMode, setIsAntiAiMode] = useState(false);
  const [referenceSkeleton, setReferenceSkeleton] = useState('');
  const [showSkeletonPanel, setShowSkeletonPanel] = useState(false);
  const [showPersonaList, setShowPersonaList] = useState(false);
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
      const sectionTitle = section.title || `段落 ${i + 1}`;
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

  const handleHumanizeOptimizer = async () => {
    if (!currentTask?.finalDraft) return;
    if (!apiConfig?.apiBaseUrl || !apiConfig?.apiKey || !apiConfig?.model) {
      setError('请先配置API');
      return;
    }

    setRunning(true);
    setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 正在深度去AI味...`]);

    try {
      const response = await fetch('/api/writing-agent/humanize-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentTask.finalDraft,
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
        }),
      });

      const data = await response.json();

      if (response.ok && data.optimizedText) {
        setFinalDraft(data.optimizedText);
        setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 深度去AI味完成！`]);
      } else {
        setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 去AI味失败: ${data.error || '未知错误'}`]);
      }
    } catch (err) {
      setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 去AI味异常: ${err instanceof Error ? err.message : '未知错误'}`]);
    } finally {
      setRunning(false);
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
                    <div className="space-y-2">
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
                          const createDate = p.createdAt ? new Date(p.createdAt).toLocaleString('zh-CN') : '未知';
                          return (
                            <option 
                              key={p.id} 
                              value={p.id}
                              title={`${p.name} - ${p.description || '无描述'} - 创建日期: ${createDate}`}
                            >
                              {p.name} - {displayDesc}
                            </option>
                          );
                        })}
                      </select>
                      
                      {personas.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => setShowPersonaList(!showPersonaList)}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            管理已创建的 {personas.length} 个人格
                          </button>
                          
                          {showPersonaList && (
                            <div className="mt-2 space-y-2">
                              {personas.map((p) => {
                                const createDate = p.createdAt ? new Date(p.createdAt).toLocaleString('zh-CN') : '未知';
                                return (
                                  <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                    <div>
                                      <div className="font-medium">{p.name}</div>
                                      <div className="text-xs text-gray-500">
                                        {p.description || '无描述'} • 创建日期: {createDate}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (confirm('确定要删除这个写作人格吗？')) {
                                          deletePersona(p.id);
                                          if (selectedPersonaId === p.id) {
                                            setSelectedPersonaId(null);
                                          }
                                        }
                                      }}
                                      disabled={isRunning}
                                      className="text-red-500 hover:text-red-700"
                                      title="删除人格"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="antiAiMode"
                    checked={isAntiAiMode}
                    onChange={(e) => setIsAntiAiMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    disabled={isRunning}
                  />
                  <label htmlFor="antiAiMode" className="text-sm font-medium text-gray-700">
                    开启防朱雀AI检测模式 (Anti-AI Mode)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-4 ml-7">
                  开启后，系统将故意植入人类真实的打字瑕疵（包含轻微语病、错别字等）以绕过机器检测。
                </p>

                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowSkeletonPanel(!showSkeletonPanel)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showSkeletonPanel ? '收起' : '上传 0% AI率人类参考文（选填）'}
                  </button>
                </div>

                {showSkeletonPanel && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">
                      贴入一篇人类写的日常流水账，AI 将完全保留它的标点符号和句法骨架进行"换皮"生成，这是目前降重最稳妥的方法。
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-yellow-700">
                        <strong>💡 使用提示：</strong><br />
                        • 推荐使用<strong>跨界参考骨架</strong>（如修自行车的流水账写情感文）<br />
                        • 避免使用<strong>同主题文章</strong>作为参考（会导致洗稿）<br />
                        • 参考文越日常、越口语化效果越好
                      </p>
                    </div>
                    <textarea
                      value={referenceSkeleton}
                      onChange={(e) => setReferenceSkeleton(e.target.value)}
                      placeholder="粘贴人类参考文本..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      disabled={isRunning}
                    />
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
                    <div className="p-4">
                      {currentTask.outline.sections && currentTask.outline.sections.map((section, index) => (
                        <div key={section.id || index} className="mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                          <div className="font-medium text-gray-800 mb-2">{section.title || `段落 ${index + 1}`}</div>
                          {section.keyPoints && section.keyPoints.length > 0 && (
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {section.keyPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
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
                <div className="flex gap-3">
                  <button
                    onClick={handleHumanizeOptimizer}
                    disabled={isRunning}
                    className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔨 深度去 AI 味
                  </button>
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
