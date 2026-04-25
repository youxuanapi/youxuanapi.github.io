'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWritingAgentStore } from '../../store/writing-agent-store';
import { useEditorStore } from '../../store/editorStore';
import type { WritingPersona, Outline, OutlineSection, Paragraph, TaskProgress } from '../../types/writing-agent';
import { cn } from '../../lib/utils';
import { FileText, TrendingUp, PenLine, UserCheck, Loader2 } from 'lucide-react';

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
    updatePersona,
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
  const [selectedTemplate, setSelectedTemplate] = useState<'insight' | 'empathy' | 'logic' | 'casual'>('insight');
  const [customStyleName, setCustomStyleName] = useState('');
  // 流式控制状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamError, setStreamError] = useState("");
  const [hasStartedTask, setHasStartedTask] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("");

  const LOADING_MESSAGES = [
    "🌐 正在初始化专属引擎，建立神经元风格链路...",
    "🧠 正在进行深度语境对齐与逻辑拓扑映射...",
    "📚 正在跨域聚合高能信息，构建多维知识图谱...",
    "🧬 正在进行高频语义降噪与人类情感特征注入...",
    "⚡ 认知矩阵封装完毕，高能文字流即将输出...",
  ];
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [loadingFade, setLoadingFade] = useState(true);

  useEffect(() => {
    if (!isStreaming || streamContent) return;
    const interval = setInterval(() => {
      setLoadingFade(false);
      setTimeout(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setLoadingFade(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [isStreaming, streamContent, LOADING_MESSAGES.length]);

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

  const executeStreamTask = async () => {
    // 1. 初始化所有状态
    setIsStreaming(true);
    setStreamError("");
    setStreamContent("");
    setHasStartedTask(true);
    setCurrentStage("准备阶段");
    
    // 检查API配置
    if (!apiConfig?.apiKey || !apiConfig?.apiBaseUrl || !apiConfig?.model) {
      setStreamError("请先配置API密钥和模型");
      setIsStreaming(false);
      return;
    }
    
    // 检查必要参数
    if (activeMode === 'create' && !topic.trim()) {
      setStreamError("请输入写作主题");
      setIsStreaming(false);
      return;
    }
    
    if (activeMode === 'humanize' && !sourceArticle.trim()) {
      setStreamError("请输入待润色的内容");
      setIsStreaming(false);
      return;
    }
    
    setCurrentStage("发送请求");
    
    // 判定当前是卡片1还是卡片2，决定调用哪个API (请根据你实际的路由地址微调 url)
    const apiUrl = activeMode === 'create' 
      ? "/api/writing-agent/generate-full-article" 
      : "/api/writing-agent/humanize-optimizer";
    
    // 获取选中的persona对象
    const selectedPersona = personas.find(p => p.id === selectedPersonaId);

    // 安全防错：校验自定义风格的加密提示词完整性
    if (selectedPersonaId && selectedPersona) {
      const encryptedPrompt = (selectedPersona as any).encryptedPrompt;
      if (!encryptedPrompt || typeof encryptedPrompt !== 'string' || encryptedPrompt.trim().length === 0) {
        setStreamError("该自定义风格数据异常，请重新提取");
        setIsStreaming(false);
        return;
      }
    }

    // 如果选中了人格，增加使用次数
    if (selectedPersonaId && selectedPersona) {
      const currentUseCount = (selectedPersona as any).useCount || 0;
      updatePersona(selectedPersonaId, { useCount: currentUseCount + 1 } as any);
    }

    // 动态传参：官方模板传 template，自定义风格传 encryptedPrompt
    const isCustomStyle = !!selectedPersonaId && !!selectedPersona;

    const requestPayload = activeMode === 'create' ? {
      topic: topic,
      requirements,
      apiBaseUrl: apiConfig.apiBaseUrl,
      apiKey: apiConfig.apiKey,
      model: apiConfig.model,
      targetWordCount: wordCount,
      template: isCustomStyle ? undefined : selectedTemplate,
      encryptedPrompt: isCustomStyle ? (selectedPersona as any).encryptedPrompt : undefined,
      isAntiAiMode
    } : {
      content: sourceArticle,
      apiBaseUrl: apiConfig.apiBaseUrl,
      apiKey: apiConfig.apiKey,
      model: apiConfig.model
    };

    try {
      setCurrentStage("连接API");
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`引擎响应异常: ${response.statusText}`);
      }

      setCurrentStage("接收数据");
      // 2. 核心：解析 SSE JSON 格式
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("无法建立流式连接");

      let buffer = "";
      let done = false;
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                
                // 更新当前阶段显示
                if (data.message) {
                  setCurrentStage(data.message);
                }
                
                // 更新内容（如果有的话）
                if (data.content) {
                  setStreamContent(data.content);
                }
                
                // 检查是否完成
                if (data.status === 'done') {
                  setCurrentStage("完成");
                }
                
                // 检查错误
                if (data.status === 'error') {
                  setStreamError(data.message || "生成过程出错");
                  setCurrentStage("失败");
                }
              } catch (e) {
                console.error('解析 SSE 数据失败:', e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setStreamError(err.message || "网络异常或请求超时，请重试");
      setCurrentStage("失败");
    } finally {
      setIsStreaming(false); // 彻底结束
    }
  };

  const handleCreatePersona = useCallback(async () => {
    if (!customStyleName.trim()) {
      setError('请填写风格命名');
      return;
    }
    if (!sampleTexts.some(text => text.trim())) {
      setError('请至少提供一个样本文本');
      return;
    }
    if (!apiConfig?.apiKey || !apiConfig?.apiBaseUrl || !apiConfig?.model) {
      setError('请先在 API 配置中填写完整信息');
      return;
    }

    setIsCreatingPersona(true);
    try {
      const response = await fetch('/api/writing-agent/create-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceArticle: sampleTexts.filter(t => t.trim()).join('\n\n'),
          name: customStyleName.trim(),
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '风格拆解失败');
      }

      const data = await response.json();

      const newPersona: WritingPersona = {
        id: data.id || `persona-${Date.now()}`,
        userId: 'current-user',
        name: data.name || customStyleName.trim(),
        description: data.subTag || '基于爆款文章逆向拆解',
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
        updatedAt: new Date().toISOString(),
        subTag: data.subTag,
        encryptedPrompt: data.encryptedPrompt,
      };

      await addPersona(newPersona);
      setSelectedPersonaId(newPersona.id);
      setShowPersonaPanel(false);
      setSampleTexts(['']);
      setCustomStyleName('');
    } catch (error) {
      console.error('创建人格失败:', error);
      setError(error instanceof Error ? error.message : '风格拆解失败，请重试');
    } finally {
      setIsCreatingPersona(false);
    }
  }, [sampleTexts, customStyleName, apiConfig, addPersona, setError, setIsCreatingPersona, setSelectedPersonaId, setShowPersonaPanel, setSampleTexts, setCustomStyleName]);

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
      <div className="w-full bg-white/80 dark:bg-[#0F0A1E]/80 backdrop-blur-2xl rounded-[24px] shadow-[0_8px_30px_rgba(79,70,229,0.08)] border border-indigo-100/50 dark:border-indigo-500/15 p-4 md:p-6 lg:p-8 transition-colors duration-300">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-indigo-50 mb-6 md:mb-8 transition-colors duration-300">专属原创爆文引擎</h1>

        {/* 引擎选择卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* ================= 卡片 1：从零创作爆文 ================= */}
          <div
            onClick={() => setActiveMode('create')}
            className={cn(
              'relative flex flex-row items-start gap-4 p-4 rounded-2xl cursor-pointer',
              'transition-all duration-300 ease-in-out',
              activeMode === 'create'
                ? 'bg-white bg-indigo-50/30 border-2 border-indigo-600 shadow-md -translate-y-1'
                : 'bg-white border border-slate-200 hover:shadow-md hover:-translate-y-0.5'
            )}
          >
            {/* 标识标签 */}
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-bold text-white bg-indigo-600 rounded-full shadow-sm overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[sweep_4s_ease-in-out_infinite]" />
              原创无AI
            </span>
            {/* 左侧图标底座 */}
            <div
              className={cn(
                'w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-colors duration-300',
                activeMode === 'create'
                  ? 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                  : 'bg-slate-50 border border-slate-100 text-slate-500'
              )}
            >
              <div className="relative flex">
                <FileText size={22} />
                <TrendingUp
                  size={14}
                  className="absolute -bottom-1.5 -right-2.5 text-current opacity-90 bg-inherit rounded-full"
                  strokeWidth={3}
                />
              </div>
            </div>

            {/* 右侧文案区 */}
            <div className="flex flex-col pt-0.5">
              <h3 className="text-lg font-bold text-slate-900">
                从零创作爆文
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                输入核心灵感，从无到有智能构建高传播度长文。
              </p>
            </div>
          </div>

          {/* ================= 卡片 2：AI文本优化 ================= */}
          <div
            onClick={() => setActiveMode('humanize')}
            className={cn(
              'relative flex flex-row items-start gap-4 p-4 rounded-2xl cursor-pointer',
              'transition-all duration-300 ease-in-out',
              activeMode === 'humanize'
                ? 'bg-white bg-blue-50/30 border-2 border-blue-600 shadow-md -translate-y-1'
                : 'bg-white border border-slate-200 hover:shadow-md hover:-translate-y-0.5'
            )}
          >
            {/* 标识标签 */}
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full shadow-sm overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[sweep_4s_ease-in-out_infinite]" />
              AIGC优化
            </span>
            {/* 左侧图标底座 */}
            <div
              className={cn(
                'w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-colors duration-300',
                activeMode === 'humanize'
                  ? 'bg-blue-50 border border-blue-100 text-blue-600'
                  : 'bg-slate-50 border border-slate-100 text-slate-500'
              )}
            >
              <div className="relative flex">
                <PenLine size={22} />
                <UserCheck
                  size={14}
                  className="absolute -bottom-1.5 -right-2.5 text-current opacity-90 bg-inherit rounded-full"
                  strokeWidth={3}
                />
              </div>
            </div>

            {/* 右侧文案区 */}
            <div className="flex flex-col pt-0.5">
              <h3 className="text-lg font-bold text-slate-900">
                AI文本优化
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                贴入你的AI文本，降低AIGC，注入真人写作风格
              </p>
            </div>
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

          {/* 文章风格模版选择 */}
          {activeMode === 'create' && (
            <div className="mt-2">
              <label className="block text-sm font-semibold text-indigo-500 dark:text-indigo-300 mb-3 transition-colors duration-300">
                  文章风格
                </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'insight' as const, label: '洞察与清醒', sub: '犀利风' },
                  { value: 'empathy' as const, label: '情绪与共鸣', sub: '走心风' },
                  { value: 'logic' as const, label: '干货与盘点', sub: '专业风' },
                  { value: 'casual' as const, label: '生活与随笔', sub: '松弛风' },
                ].map((t) => (
                  <div
                    key={t.value}
                    onClick={() => {
                      setSelectedTemplate(t.value);
                      setSelectedPersonaId(null);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300',
                      selectedTemplate === t.value && !selectedPersonaId
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10 shadow-md -translate-y-0.5'
                        : 'border-slate-200 dark:border-indigo-500/20 bg-white hover:border-indigo-300 hover:shadow-sm'
                    )}
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-indigo-100">
                      {t.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-indigo-300/70 mt-1">
                      {t.sub}
                    </span>
                    {selectedTemplate === t.value && !selectedPersonaId && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                  {showPersonaPanel ? '收起' : '+ 提取爆款风格'}
                </button>
              </div>

              {showPersonaPanel ? (
                <div className="border border-indigo-100/50 dark:border-indigo-500/15 rounded-xl p-5 bg-indigo-50/30 dark:bg-[#0F0A1E] space-y-4 transition-colors duration-300">
                  <p className="text-sm text-slate-700/60 dark:text-indigo-300/60 transition-colors duration-300">
                    请上传您希望学习的原创文章样本（至少1篇，每篇100字以上）
                  </p>

                  {/* 风格命名 - 必填 */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700/80 dark:text-indigo-300/80 mb-1 transition-colors duration-300">
                      风格命名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customStyleName}
                      onChange={(e) => setCustomStyleName(e.target.value)}
                      placeholder="给你的专属风格起个名字..."
                      className="w-full px-3 py-2 bg-white dark:bg-[#0F0A1E] border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-sm text-slate-900 dark:text-indigo-100 transition-colors placeholder-slate-400 dark:placeholder-indigo-400/40"
                      disabled={isCreatingPersona}
                    />
                  </div>

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
                        disabled={isCreatingPersona}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSampleTexts([...sampleTexts, ''])} className="text-sm text-indigo-600 font-medium transition-colors" disabled={isCreatingPersona}>
                      + 添加更多样本
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePersona}
                    disabled={isCreatingPersona || !customStyleName.trim()}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isCreatingPersona ? '正在深度分析提取...' : '分析并提取专属人格'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ➕ 提取爆款风格卡片 - 永远排在自定义列表第一个 */}
                  <div
                    className={cn(
                      'p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 hover:bg-indigo-50/50 hover:border-indigo-400',
                      'border-slate-200 dark:border-indigo-500/20 bg-slate-50/50 dark:bg-[#0F0A1E]/50'
                    )}
                    onClick={() => setShowPersonaPanel(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-indigo-100">提取爆款风格</p>
                        <p className="text-xs text-slate-500 dark:text-indigo-300/70 mt-0.5">上传原创文章样本，AI 自动提取专属人格</p>
                      </div>
                    </div>
                  </div>

                  {/* 人格列表 - 自定义风格卡片 */}
                  {personas.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:bg-indigo-50/50',
                        selectedPersonaId === p.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 dark:border-indigo-500/20 bg-white'
                      )}
                      onClick={() => {
                        setSelectedPersonaId(p.id);
                      }}
                    >
                      <span className="absolute -top-2 left-3 px-2 py-0.5 bg-gradient-to-r from-slate-400 to-slate-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                        自定义
                      </span>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-300">👤</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-indigo-100">{(p as any).name || p.name}</p>
                            <p className="text-xs text-slate-400 dark:text-indigo-300/50 mt-0.5">{(p as any).subTag || p.description || '专属写作人格'}</p>
                          </div>
                        </div>
                        {/* 删除按钮 - 默认隐藏，Hover 显示 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定要删除这个自定义风格吗？此操作不可撤销。')) {
                              deletePersona(p.id);
                              if (selectedPersonaId === p.id) {
                                setSelectedPersonaId(null);
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all duration-200"
                          disabled={isRunning}
                          title="删除风格"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 重构后的去AI化引擎卡片 (已隐藏) */}
          <div className="hidden">
            <div className={cn(
              'rounded-xl p-5 border transition-all duration-300',
              isAntiAiMode
                ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                : 'border-violet-500/30 bg-violet-500/5'
            )}>
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    'w-12 h-6 rounded-full transition-all duration-300 cursor-pointer relative',
                    isAntiAiMode
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  )}
                    onClick={() => !isRunning && setIsAntiAiMode(!isAntiAiMode)}
                  >
                    <div className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow',
                      isAntiAiMode ? 'left-7' : 'left-1'
                    )} />
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
            {!currentTask && !isRunning && !isStreaming && (
              <button
                onClick={executeStreamTask}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-400/30 dark:shadow-violet-400/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {activeMode === 'create' ? '启动爆文引擎' : '开始拟人重塑'}
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
                  className="px-6 py-3.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200 transition-all dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
                >
                  重新生成
                </button>
              </div>
            )}

            {isRunning && (
              <button
                onClick={cancelTask}
                className="w-full py-3.5 bg-slate-500 text-white rounded-xl font-bold shadow-lg hover:bg-slate-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden dark:bg-[#1A1528] dark:text-indigo-300 dark:hover:bg-indigo-500/50"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  中止任务
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full dark:bg-indigo-500/20">
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

      {/* 终端结果展示区 */}
      {hasStartedTask && (
        <div className="mt-4 md:mt-8 bg-white rounded-2xl border border-slate-200 min-h-[250px] shadow-sm overflow-hidden">
          {/* 顶部操作栏 */}
          {(streamContent || (!isStreaming && !streamError)) && streamContent && (
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="font-medium">字数统计：</span>
                <span className="font-bold text-indigo-600">{streamContent.length}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(streamContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    复制全文
                  </>
                )}
              </button>
            </div>
          )}

          <div className="p-4 md:p-6">
            {/* 状态 1：报错拦截 */}
            {streamError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4 text-red-600">
                <p className="font-bold flex items-center gap-2">❌ 引擎启动失败</p>
                <p className="text-sm mt-1">{streamError}</p>
              </div>
            )}

            {/* 状态 2：骨架屏预热 (发起请求但还没收到第一个字) */}
            {isStreaming && !streamContent && !streamError && (
              <div className="flex flex-col items-center justify-center h-full min-h-[150px] py-8">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mb-4" />
                <p
                  className="font-medium text-slate-500 tracking-wide text-sm text-center transition-opacity duration-300"
                  style={{ opacity: loadingFade ? 1 : 0 }}
                >
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            )}

            {/* 状态 3：流式打字输出 */}
            {(streamContent || (!isStreaming && !streamError)) && (
              <div className="prose prose-slate max-w-none">
                {/* 阶段显示 */}
                {currentStage && (
                  <div className="mb-4 p-2 bg-indigo-50 rounded-lg text-sm text-indigo-600">
                    <span className="font-medium">当前阶段：</span>{currentStage}
                  </div>
                )}
                {/* 使用 pre-wrap 保证换行符被正确渲染 */}
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-[15px]">
                  {streamContent || "等待输入灵感，启动引擎..."}
                </div>
                {/* 打字时的光标闪烁效果 */}
                {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse"></span>}
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