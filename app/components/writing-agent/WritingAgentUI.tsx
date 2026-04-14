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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  const CATEGORIES = [
    { id: 'emotion', name: '情感心理', icon: '❤️', defaultTopic: '写一篇关于中国式父母病态节俭的爆文' },
    { id: 'life', name: '生活家居', icon: '🏠', defaultTopic: '断舍离之后，我才发现家里真正需要的东西只有这几样' },
    { id: 'food', name: '美食旅行', icon: '🍜', defaultTopic: '去了三次成都，我才发现真正好吃的都不在宽窄巷子' },
    { id: 'work', name: '职场财经', icon: '💼', defaultTopic: '那个每天准点下班的同事，其实早就实现了副业月入过万' },
    { id: 'knowledge', name: '知识科普', icon: '📚', defaultTopic: '你每天刷手机的时间，正在悄悄毁掉你的大脑' },
    { id: 'entertainment', name: '娱乐影视', icon: '🎬', defaultTopic: '这部剧上映三天就爆了，但它的台词更扎心' },
    { id: 'tech', name: '科技数码', icon: '📱', defaultTopic: '买了最新款iPhone之后，我才发现自己是个大冤种' },
    { id: 'car', name: '汽车体育', icon: '🚗', defaultTopic: '开了五年车，我才发现买车险时最不该买的就是这一项' },
    { id: 'news', name: '新闻资讯', icon: '📰', defaultTopic: '这条新闻刷爆朋友圈，但背后的真相却没人敢说' },
    { id: 'rural', name: '三农乡村', icon: '🌾', defaultTopic: '回农村创业三年，我赔了50万但赚了一辈子的教训' },
    { id: 'baby', name: '母婴亲子', icon: '👶', defaultTopic: '生了二胎之后，我才发现老大才是这个家最可怜的人' },
    { id: 'health', name: '健康养生', icon: '🏥', defaultTopic: '体检报告出来的那一天，我彻底戒掉了外卖和熬夜' },
    { id: 'game', name: '游戏电竞', icon: '🎮', defaultTopic: '打了十年游戏，我总结出了一套职场生存法则' },
    { id: 'fashion', name: '时尚美妆', icon: '💄', defaultTopic: '花了十万买化妆品，我才发现最好用的居然是这几样' },
    { id: 'other', name: '其他', icon: '✨', defaultTopic: '这件事我憋了三年，今天终于敢说出来了' },
  ];

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

    const customInputs = { painPoint, detail, sublimation };
    const task = createTask(topic, requirements, selectedPersonaId || undefined);

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
          styleData: persona,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '任务创建失败');
      }

      if (data.outline) {
        setOutline(data.outline);
        setTaskStatus('outline_pending');
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
    const customInputs = { painPoint, detail, sublimation };

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

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
    setFinalDraft(finalDraft);
    setTaskStatus('completed');
    setRunning(false);
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

  const getProgressHint = (status: string, completedCount: number, totalCount: number) => {
    if (status === 'initializing' || status === 'pending') return '正在初始化写作引擎...';
    if (status === 'researching') return '正在理解核心痛点...';
    if (status === 'outline_pending') return '正在搭建爆文骨架...';
    if (status === 'generating') {
      if (completedCount === 0) return '正在注入情感细节...';
      if (completedCount < Math.floor(totalCount / 2)) return '正在精心雕琢段落...';
      if (completedCount < totalCount) return '正在完善文章收尾...';
    }
    if (status === 'reviewing') return '正在进行最终打磨...';
    if (status === 'completed') return '文章已生成完成！';
    return '准备中...';
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">专属原创写作Agent</h1>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>✨</span>
                创作灵感区 · 点击卡片快速选题
              </h2>
              <div className="relative group flex items-center">
                <button
                  onClick={(e) => { e.preventDefault(); scroll('left'); }}
                  className="absolute -left-3 z-10 hidden group-hover:flex items-center justify-center w-8 h-8 bg-white/90 rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-blue-500 hover:bg-white transition-all"
                >
                  ❮
                </button>
                
                <div
                  ref={scrollRef}
                  className="flex overflow-x-auto gap-3 pb-2 snap-x [&amp;::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
                >
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setTopic(category.defaultTopic)}
                      disabled={isRunning}
                      className="group relative p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center min-h-[90px] flex-shrink-0 w-32 md:w-40 snap-start"
                    >
                      <div className="text-2xl mb-1">{category.icon}</div>
                      <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {category.name}
                      </div>
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={(e) => { e.preventDefault(); scroll('right'); }}
                  className="absolute -right-3 z-10 hidden group-hover:flex items-center justify-center w-8 h-8 bg-white/90 rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-blue-500 hover:bg-white transition-all"
                >
                  ❯
                </button>
              </div>
            </div>

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

              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  {showAdvanced ? '⬆️ 收起高阶设定' : '✨ 展开高阶爆文设定 (提升文章深度)'}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      核心痛点 (选填)
                    </label>
                    <textarea
                      value={painPoint}
                      onChange={(e) => setPainPoint(e.target.value)}
                      placeholder="描述目标人群在这个话题下的核心痛点..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isRunning}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      真实细节描述 (选填)
                    </label>
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="用一个具体的物品或场景来生动证明..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isRunning}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结尾升华/金句 (选填)
                    </label>
                    <textarea
                      value={sublimation}
                      onChange={(e) => setSublimation(e.target.value)}
                      placeholder="给面临类似困境的人一句点醒他们的建议..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}

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

              <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📝</span>
                  输出配置 · 目标字数
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
                      className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="text-xl font-bold text-amber-600 min-w-[120px] text-right">
                    {wordCount} 字
                  </div>
                </div>
              </div>

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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{currentTask.topic}</h2>
                  <p className="text-sm text-gray-500 mt-1">{getStatusDisplay(currentTask.status).label}</p>
                </div>
                <div className={cn('w-3 h-3 rounded-full', getStatusDisplay(currentTask.status).color)} />
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-blue-600 font-medium animate-pulse">
                    {getProgressHint(
                      currentTask.status, 
                      currentTask.paragraphs ? currentTask.paragraphs.filter(p => p.status === 'completed').length : 0,
                      currentTask.paragraphs ? currentTask.paragraphs.length : 0
                    )}
                  </p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500 ease-out"
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
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {currentTask.status === 'generating' 
                        ? `${currentTask.paragraphs ? currentTask.paragraphs.filter(p => p.status === 'completed').length : 0} / ${currentTask.paragraphs ? currentTask.paragraphs.length : 0} 段落` 
                        : ''}
                    </span>
                  </div>
                </div>

                {currentTask.outline && !currentTask.finalDraft && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <div className="px-4 py-3 border-b border-gray-200 bg-white">
                      <h3 className="font-medium text-gray-900">文章大纲</h3>
                      <p className="text-sm text-gray-500 mt-1">{currentTask.outline.theme || ''}</p>
                    </div>
                  </div>
                )}

                {(currentTask.status === 'generating' || currentTask.finalDraft) && (
                  <div className="border border-gray-200 rounded-lg p-6 shadow-sm bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">文章预览</h3>
                      {currentTask.finalDraft && (
                        <div className="flex gap-2">
                          <button
                            onClick={handleHumanizeOptimizer}
                            disabled={isRunning}
                            className="px-3 py-1 text-xs rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🔨 深度去 AI 味
                          </button>
                          <button
                            onClick={handleCopy}
                            className={cn(
                              'px-3 py-1 text-xs rounded-lg transition-all duration-200',
                              copied 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                          >
                            {copied ? '已复制!' : '复制全文'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="prose prose-blue max-w-none">
                      {(currentTask.finalDraft || (currentTask.paragraphs?.filter(p => p.content).map(p => p.content).join('\n\n')) || '').split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {currentTask.finalDraft && (
                      <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <span>🎯</span>
                          一站式工作台
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <button
                            onClick={() => alert('商业化高阶功能即将上线，敬请期待！')}
                            className="flex flex-col items-center justify-center p-5 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                          >
                            <span className="text-3xl mb-2">🎨</span>
                            <span className="font-semibold text-gray-700">AI 情绪配图</span>
                          </button>
                          <button
                            onClick={() => alert('商业化高阶功能即将上线，敬请期待！')}
                            className="flex flex-col items-center justify-center p-5 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300"
                          >
                            <span className="text-3xl mb-2">🪄</span>
                            <span className="font-semibold text-gray-700">一键微信排版</span>
                          </button>
                          <button
                            onClick={() => alert('商业化高阶功能即将上线，敬请期待！')}
                            className="flex flex-col items-center justify-center p-5 bg-white rounded-xl border-2 border-pink-200 hover:border-pink-400 hover:shadow-lg transition-all duration-300"
                          >
                            <span className="text-3xl mb-2">🚀</span>
                            <span className="font-semibold text-gray-700">矩阵一键分发</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
