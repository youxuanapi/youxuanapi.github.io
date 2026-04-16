'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './components/Toast';
import { ModuleRefinement } from './components/ModuleRefinement';
import WritingAgentUI from './components/writing-agent/WritingAgentUI';
import { useEditorStore } from './store/editorStore';

type ArticleState = {
  step: 1 | 2 | 3;
  titleTopic: string;
  titles: string[];
  selectedTitle: string;
  inputTitle: string;
  modules: any[];
  articleContent: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  // 新增字段
  argumentCount: number;
  wordCount: number;
  style: string;
  category: string; // 内容赛道
  // 模块精细化数据
  moduleOptions: {
    core: string[];
    pain: string[];
    opening: string[];
    arg1_title: string[];
    arg1_content: string[];
    arg2_title: string[];
    arg2_content: string[];
    arg3_title: string[];
    arg3_content: string[];
    ending: string[];
  };
  selectedModules: {
    core: string;
    pain: string;
    opening: string;
    arg1_title: string;
    arg1_content: string;
    arg2_title: string;
    arg2_content: string;
    arg3_title: string;
    arg3_content: string;
    ending: string;
  };
  // 内容预览弹窗状态
  previewModal: {
    isOpen: boolean;
    title: string;
    content: string;
    moduleType: string;
  };
  // 当前工具
  currentTool: string;
};

const initialState: ArticleState = {
  step: 1,
  titleTopic: '',
  titles: [],
  selectedTitle: '',
  inputTitle: '',
  modules: [],
  articleContent: '',
  apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: '9981371c-a96b-4440-90b9-7797865c5d89',
  model: 'ep-20250305155811-t955l',
  // 新增字段
  argumentCount: 3,
  wordCount: 1200,
  style: '温柔治愈',
  category: '情感心理', // 默认赛道
  moduleOptions: {
    core: [],
    pain: [],
    opening: [],
    arg1_title: [],
    arg1_content: [],
    arg2_title: [],
    arg2_content: [],
    arg3_title: [],
    arg3_content: [],
    ending: []
  },
  selectedModules: {
    core: '',
    pain: '',
    opening: '',
    arg1_title: '',
    arg1_content: '',
    arg2_title: '',
    arg2_content: '',
    arg3_title: '',
    arg3_content: '',
    ending: ''
  },
  // 内容预览弹窗初始状态
  previewModal: {
    isOpen: false,
    title: '',
    content: '',
    moduleType: ''
  },
  // 当前工具
  currentTool: 'writing-agent',
};

const projects = [
  {
    id: 1,
    name: 'AI公众号爆文',
    desc: '适合上班族，每日半小时',
    steps: ['内容源', 'AI转化', '分发', '变现'],
    icon: 'PenTool'
  },
  {
    id: 2,
    name: 'AI图文带货',
    desc: '小红书+抖音，低门槛启动',
    steps: ['选品', 'AI配图', '文案', '带货'],
    icon: 'Image'
  },
  {
    id: 3,
    name: 'AI短视频脚本',
    desc: '批量产出，矩阵式运营',
    steps: ['选题', '脚本', '拍摄', '发布'],
    icon: 'Video'
  }
];

const apiList = [
  { name: 'GPT-4o', price: '￥1.20/万字', tags: ['最稳定'], desc: '综合能力最强' },
  { name: '豆包-seed-2.0', price: '￥0.30/万字', tags: ['最省钱'], desc: '性价比极高' },
  { name: 'Claude 3.5', price: '￥0.80/万字', tags: ['长文本'], desc: '上下文理解优秀' }
];

const communityUpdates = [
  '小A用爆文生成器单篇阅读10w+',
  '社群新增32位AI副业实践者',
  '新API接入，成本再降30%',
  '本周变现项目排行榜更新'
];

const tools = [
  {
    id: 'comic',
    name: '漫剧生成器',
    icon: 'Image',
    desc: '一键生成爆款漫剧',
    color: 'from-[#722ED1] to-[#9254DE]',
    isComingSoon: true
  },
  {
    id: 'novel',
    name: '小说生成器',
    icon: 'Book',
    desc: 'AI写作一键生成',
    color: 'from-[#FA8C16] to-[#FF7A45]',
    isComingSoon: true
  },
  {
    id: 'writing-agent',
    name: '文章生成工具',
    icon: 'Cpu',
    desc: '一键生成高原创文章',
    color: 'from-[#00C2B8] to-[#009688]',
    isComingSoon: false
  }
];

const Icon = ({ name, className = '' }: { name: string; className?: string }) => {
  const icons = {
    PenTool: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    Image: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    Video: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    ArrowRight: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    ),
    Check: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    Copy: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
    Refresh: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    Settings: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1-1.51 2 2 0 0 1 2 2v.09z" />
      </svg>
    ),
    Zap: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    Cpu: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
    FileText: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    Book: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  };
  return icons[name as keyof typeof icons] || null;
};

const Card = ({ 
  children, 
  className = '', 
  hover = true, 
  id,
  theme
}: { 
  children: React.ReactNode; 
  className?: string; 
  hover?: boolean; 
  id?: string;
  theme?: Theme;
}) => {
  
  return (
    <div
      id={id}
      className={`
        relative backdrop-blur-xl rounded-2xl
        shadow-md
        ${hover ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5' : ''}
        ${theme === 'dark'
          ? 'border border-[#9c52f2]/50'
          : 'bg-white border border-slate-200'
        }
        ${className}
      `}
      style={theme === 'dark' ? {
        background: 'linear-gradient(135deg, rgba(60, 20, 80, 0.75) 0%, rgba(100, 50, 150, 0.55) 50%, rgba(156, 82, 242, 0.45) 100%)',
        boxShadow: '0 0 60px rgba(156, 82, 242, 0.5), 0 0 120px rgba(156, 82, 242, 0.3), inset 0 0 30px rgba(156, 82, 242, 0.15)'
      } : {}}
    >
      {theme === 'dark' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* 右上角强光晕 - 带波动动画 */}
          <div className="absolute -top-1/3 -right-1/3 w-2/3 h-2/3 bg-gradient-to-br from-[#9c52f2]/60 via-[#9c52f2]/30 to-transparent rounded-full blur-3xl" 
               style={{ 
                 filter: 'blur(40px)',
                 animation: 'pulse-glow 4s ease-in-out infinite'
               }} />
          {/* 左下角强光晕 - 带波动动画 */}
          <div className="absolute -bottom-1/3 -left-1/3 w-2/3 h-2/3 bg-gradient-to-tr from-[#9c52f2]/50 via-[#9c52f2]/25 to-transparent rounded-full blur-3xl" 
               style={{ 
                 filter: 'blur(40px)',
                 animation: 'pulse-glow 5s ease-in-out infinite',
                 animationDelay: '1s'
               }} />
          {/* 中心柔光晕 - 带涟漪动画 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-rad from-[#9c52f2]/20 to-transparent rounded-full blur-3xl" 
               style={{ 
                 filter: 'blur(60px)',
                 animation: 'ripple 6s ease-in-out infinite',
                 animationDelay: '0.5s'
               }} />
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const ToolCarousel = ({ theme, onToolSelect }: { theme?: Theme; onToolSelect?: (toolId: string) => void }) => {
  const duplicatedTools = [...tools, ...tools, ...tools, ...tools, ...tools, ...tools];
  const bgColor = theme === 'dark' ? 'rgba(60, 20, 80, 0.6)' : '#ffffff';
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div 
      className="w-full relative h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-32 z-20 pointer-events-none" style={{ 
        background: `linear-gradient(to right, ${bgColor}, transparent)` 
      }} />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-20 pointer-events-none" style={{ 
        background: `linear-gradient(to left, ${bgColor}, transparent)` 
      }} />
      
      <div className="w-full overflow-hidden py-6 h-full flex items-center">
        <div
          className="flex gap-4"
          style={{ 
            animation: `scroll 300s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            width: 'max-content'
          }}
        >
          {duplicatedTools.map((tool, idx) => (
            <div
              key={`${tool.id}-${idx}`}
              className="flex-shrink-0 w-56"
            >
              <div 
                className={`
                  relative overflow-hidden rounded-2xl p-5
                  bg-gradient-to-br ${tool.color}
                  shadow-lg hover:shadow-2xl
                  transition-all duration-400 hover:scale-[1.03] hover:-translate-y-1
                  ${tool.isComingSoon ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                `}
                onClick={() => !tool.isComingSoon && onToolSelect?.(tool.id)}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-1/2 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                
                {tool.isComingSoon && (
                  <div className="absolute top-3 right-3 z-20">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md">
                      🚀 即将上线
                    </span>
                  </div>
                )}
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
                    <Icon name={tool.icon} className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                  <p className="text-white/85 text-sm leading-relaxed mb-4">{tool.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/95">
                      <span className="text-sm font-semibold">
                        {tool.isComingSoon ? '敬请期待' : '立即使用'}
                      </span>
                      {!tool.isComingSoon && (
                        <Icon name="ArrowRight" className="w-4 h-4" />
                      )}
                    </div>
                    {!tool.isComingSoon && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AuroraButton = ({ children, onClick, disabled, className = '', theme }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; theme?: Theme }) => {
  const btnColor = theme === 'blue' ? '#165DFF' : '#3B82F6';
  const btnHover = theme === 'blue' ? '#4080FF' : '#60A5FA';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: btnColor }}
      className={`
        relative overflow-hidden px-8 py-4 rounded-xl font-bold text-white
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-md hover:shadow-lg
        ${className}
      `}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = btnHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = btnColor;
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" style={{ 
        animation: 'shimmer 3s infinite ease-in-out',
        animationPlayState: disabled ? 'paused' : 'running'
      }} />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

const InputWithGlow = ({ placeholder, value, onChange, theme, rightPadding = 0 }: { placeholder: string; value: string; onChange: (v: string) => void; theme?: Theme; rightPadding?: number }) => {
  const accent = theme === 'blue' ? '#165DFF' : '#3B82F6';
  
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full px-5 py-4 bg-white border border-slate-200 rounded-xl
          text-slate-900 placeholder-slate-400 text-base
          focus:outline-none transition-all duration-300
        "
        style={{
          boxShadow: `0 0 0 2px ${accent}20`,
          borderColor: value ? accent : undefined,
          paddingRight: rightPadding || undefined
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = `0 0 0 2px ${accent}30`;
          e.target.style.borderColor = accent;
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = 'none';
          e.target.style.borderColor = value ? accent : '#e2e8f0';
        }}
      />
      {/* 优化的输入框底部装饰线 */}
      <div className={`absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-500 ease-in-out ${value ? 'w-full opacity-100' : 'w-0 opacity-0'}`} style={{ 
        background: `linear-gradient(to right, ${accent}, ${accent}0)` 
      }} />
    </div>
  );
};

const LiveTicker = ({ theme }: { theme?: Theme }) => {
  const [index, setIndex] = useState(0);
  const accent = theme === 'blue' ? '#165DFF' : '#3B82F6';

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % communityUpdates.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl p-5 border bg-gradient-to-r from-blue-50 to-slate-50 border-blue-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
        <span className="text-slate-900 font-bold text-sm">实时动态</span>
      </div>
      <div className="h-6 overflow-hidden">
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${index * 24}px)` }}
        >
          {communityUpdates.map((update, i) => (
            <div key={i} className="h-6 flex items-center">
              <span className="font-medium text-sm" style={{ color: accent }}>{update}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const callChatCompletion = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) => {
  const response = await fetch('/api/proxy/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiBaseUrl: baseUrl,
      apiKey,
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败：${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// 流式调用函数
const callChatCompletionStream = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  onAbort?: () => void,
  isPausedRef?: { current: boolean }
) => {
  const response = await fetch('/api/proxy/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiBaseUrl: baseUrl,
      apiKey,
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败：${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    // 检查是否暂停
    if (isPausedRef?.current) {
      await new Promise(resolve => {
        const checkResume = () => {
          if (!isPausedRef?.current) {
            resolve(null);
          }
        };
        // 每 100ms 检查一次是否恢复
        const interval = setInterval(checkResume, 100);
        // 如果用户点击暂停，清除 interval
        const abortHandler = () => {
          clearInterval(interval);
          resolve(null);
        };
        // 保存 abortHandler 用于后续清理
        (window as any).resumeHandler = abortHandler;
      });
      
      // 如果用户点击了暂停，检查是否需要中止
      if (onAbort) {
        onAbort();
        break;
      }
    }
    
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  return fullContent;
};

type Theme = 'blue' | 'dark';

const themes = {
  blue: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    text: 'text-slate-900',
    textSecondary: 'text-slate-500',
    textMuted: 'text-slate-400',
    cardBorder: 'border-slate-200',
  },
  dark: {
    bg: 'bg-gradient-to-br from-slate-900 to-slate-800',
    text: 'text-white',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-300',
    cardBorder: 'border-slate-200',
  }
};

// 内容预览弹窗组件
const ContentPreviewModal = ({
  isOpen,
  onClose,
  title,
  content,
  moduleType,
  theme
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  moduleType: string;
  theme: 'blue' | 'dark';
}) => {
  if (!isOpen) return null;

  const moduleColors: Record<string, { bg: string; text: string; border: string }> = {
    core: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    pain: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    opening: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    arg1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    arg2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    arg3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    ending: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };

  const colors = moduleColors[moduleType] || moduleColors.core;
  const isDark = theme === 'dark';

  return (
    <div 
      className="content-preview-modal"
      onClick={onClose}
    >
      <div 
        className={`modal-content ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} border ${colors.border} text-sm font-bold`}>
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
          <p className={`text-base leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {content}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  const router = useRouter();
  // 使用 editorStore
  const editorStore = useEditorStore();
  
  // 从 localStorage 读取 API 配置
  const [state, setState] = useState<ArticleState>(() => {
    const savedConfig = typeof window !== 'undefined' ? localStorage.getItem('apiConfig') : null;
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        return {
          ...initialState,
          apiBaseUrl: config.apiBaseUrl || initialState.apiBaseUrl,
          apiKey: config.apiKey || initialState.apiKey,
          model: config.model || initialState.model,
          // 确保 previewModal 始终有值
          previewModal: initialState.previewModal,
        };
      } catch {
        return initialState;
      }
    }
    return initialState;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [isInputGenerating, setIsInputGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>('blue');
  const [streamingContent, setStreamingContent] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>('writing-agent');
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const { showToast } = useToast();

  // 同步 API 配置到 editorStore
  useEffect(() => {
    // 从 editorStore 初始化
    const config = editorStore.apiConfig;
    if (config) {
      setState(prev => ({
        ...prev,
        apiBaseUrl: config.apiBaseUrl || prev.apiBaseUrl,
        apiKey: config.apiKey || prev.apiKey,
        model: config.model || prev.model,
      }));
    }
  }, []); // 只在初始化时执行一次

  // 当页面状态的 API 配置变化时，同步到 editorStore（只在配置确实不同时更新）
  useEffect(() => {
    if (state.apiKey && state.apiBaseUrl && state.model) {
      const isConfigChanged = 
        !editorStore.apiConfig ||
        editorStore.apiConfig.apiBaseUrl !== state.apiBaseUrl ||
        editorStore.apiConfig.apiKey !== state.apiKey ||
        editorStore.apiConfig.model !== state.model;
      
      if (isConfigChanged) {
        editorStore.setApiConfig({
          apiBaseUrl: state.apiBaseUrl,
          apiKey: state.apiKey,
          model: state.model,
        });
      }
    }
  }, [state.apiKey, state.apiBaseUrl, state.model]);

  // 风格学习相关状态
  const [showStyleLearningModal, setShowStyleLearningModal] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [learningProgress, setLearningProgress] = useState(0);
  const [learningResult, setLearningResult] = useState<any>(null);
  const [userStyles, setUserStyles] = useState<any[]>([]);

  // 内容赛道展开状态
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // 文章编辑状态跟踪
  const [isArticleEdited, setIsArticleEdited] = useState(false);
  const [originalArticleContent, setOriginalArticleContent] = useState('');

  // 保存 API 配置到 localStorage
  useEffect(() => {
    const configToSave = {
      apiBaseUrl: state.apiBaseUrl,
      apiKey: state.apiKey,
      model: state.model,
    };
    localStorage.setItem('apiConfig', JSON.stringify(configToSave));
  }, [state.apiBaseUrl, state.apiKey, state.model]);

  const checkApiConfig = () => {
    const hasBaseUrl = state.apiBaseUrl.trim() !== '';
    const hasApiKey = state.apiKey.trim() !== '';
    const hasModel = state.model.trim() !== '';
    return hasBaseUrl && hasApiKey && hasModel;
  };

  const generateTitles = async () => {
    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置 API 信息', 'warning');
      return;
    }

    // 如果直接输入了标题，跳过生成，直接进入步骤2
    if (state.inputTitle.trim()) {
      setState(prev => ({ 
        ...prev, 
        selectedTitle: prev.inputTitle,
        step: 2 
      }));
      showToast('已使用输入的标题', 'success');
      return;
    }

    setIsLoading(true);
    setStreamingContent('');
    try {
      let systemPrompt, userPrompt;
      
      if (!state.titleTopic.trim()) {
        // 输入框为空时，自动生成热门主题的爆款标题
        systemPrompt = '你是一个专业的公众号爆文标题生成专家。请生成 5 个当前最热门、最有吸引力的公众号文章标题。标题要符合以下要求：1. 有悬念或痛点 2. 适合社交媒体传播 3. 字数控制在 15-25 字之间 4. 使用中文。请直接返回 JSON 数组格式，不要包含其他文字。';
        userPrompt = '请生成 5 个当前最热门的爆文标题，直接返回 JSON 数组，不要其他文字。';
      } else {
        // 输入框有内容时，根据主题生成标题
        systemPrompt = '你是一个专业的公众号爆文标题生成专家。请根据用户提供的主题，生成 5 个有吸引力的公众号文章标题。标题要符合以下要求：1. 有悬念或痛点 2. 适合社交媒体传播 3. 字数控制在 15-25 字之间 4. 使用中文。请直接返回 JSON 数组格式，不要包含其他文字。';
        userPrompt = `主题：${state.titleTopic}\n\n请生成 5 个爆文标题，直接返回 JSON 数组，不要其他文字。`;
      }

      // 使用流式输出
      const fullContent = await callChatCompletionStream(
        state.apiBaseUrl,
        state.apiKey,
        state.model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
        },
        undefined,
        { current: isPaused }
      );

      // 解析完整的 JSON
      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const titles = JSON.parse(jsonMatch[0]);
        setState(prev => ({ ...prev, titles, step: 2 }));
        showToast('标题生成成功！', 'success');
      } else {
        throw new Error('无法解析返回的 JSON');
      }
    } catch (error) {
      console.error('生成标题失败:', error);
      showToast('生成标题失败，请检查 API 配置', 'error');
    }
    setIsLoading(false);
    setStreamingContent('');
  };

  // 根据赛道自动生成爆款标题
  const generateRandomTitleByCategory = async () => {
    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置 API 信息', 'warning');
      return;
    }

    setIsTitleLoading(true);
    try {
      // 根据所选赛道生成对应的爆款标题
      const category = state.category || '通用';
      
      const systemPrompt = `你是一个专业的公众号爆文标题生成专家。请根据"${category}"这个内容赛道，生成1个当前最热门、最有吸引力的爆款文章标题。标题要符合以下要求：
1. 紧扣${category}赛道的热点话题
2. 有悬念、痛点或情感共鸣
3. 适合社交媒体传播，点击率高
4. 字数控制在15-25字之间
5. 使用中文
请直接返回标题文字，不要包含其他内容。`;

      const userPrompt = `内容赛道：${category}\n\n请生成1个该赛道的爆款标题，直接返回标题文字，不要其他内容。`;

      // 使用非流式接口，更快返回结果
      const content = await callChatCompletion(
        state.apiBaseUrl,
        state.apiKey,
        state.model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      );

      // 清理返回的标题（去除引号和多余空格）
      const title = content.trim().replace(/^["']|["']$/g, '').trim();
      if (title) {
        setState(prev => ({ ...prev, inputTitle: title, selectedTitle: title }));
        showToast(`已为【${category}】赛道生成标题`, 'success');
      } else {
        throw new Error('生成的标题为空');
      }
    } catch (error) {
      console.error('生成标题失败:', error);
      showToast('生成标题失败，请检查 API 配置', 'error');
    }
    setIsTitleLoading(false);
  };

  // 解析部分JSON，提取已完成的模块
  const parsePartialModuleOptions = (content: string): any => {
    const result: any = {};
    const fields = ['core', 'pain', 'opening', 'arg1_title', 'arg1_content', 'arg2_title', 'arg2_content', 'arg3_title', 'arg3_content', 'ending'];
    
    fields.forEach(field => {
      // 匹配 "field": ["...", "..."] 或 "field": ["..."] 等格式
      const regex = new RegExp(`"${field}"\\s*:\\s*\\[(.*?)\\](?:,|\\s*})`, 's');
      const match = content.match(regex);
      if (match) {
        try {
          // 尝试解析数组内容
          const arrayContent = match[1];
          // 提取所有字符串
          const items: string[] = [];
          const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
          let itemMatch;
          while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
            items.push(itemMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
          }
          if (items.length > 0) {
            result[field] = items;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });
    
    return result;
  };

  const generateModules = async () => {
    if (!state.selectedTitle) {
      showToast('请先选择一个标题', 'error');
      return;
    }

    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置 API 信息', 'warning');
      return;
    }
    
    setIsLoading(true);
    setStreamingContent('');
    
    // 初始化空的模块选项
    const initialModuleOptions = {
      core: [],
      pain: [],
      opening: [],
      arg1_title: [],
      arg1_content: [],
      arg2_title: [],
      arg2_content: [],
      arg3_title: [],
      arg3_content: [],
      ending: [],
    };
    
    setState(prev => ({
      ...prev,
      moduleOptions: initialModuleOptions,
    }));
    
    try {
      const response = await fetch('/api/gen-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiBaseUrl: state.apiBaseUrl,
          apiKey: state.apiKey,
          model: state.model,
          title: state.selectedTitle,
          style: state.style,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API 请求失败：${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let accumulatedContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulatedContent += content;
                setStreamingContent(accumulatedContent);
                
                // 实时解析并更新模块选项
                const partialOptions = parsePartialModuleOptions(accumulatedContent);
                if (Object.keys(partialOptions).length > 0) {
                  setState(prev => ({
                    ...prev,
                    moduleOptions: {
                      ...prev.moduleOptions,
                      ...partialOptions,
                    },
                  }));
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 最终解析完整的 JSON
      let jsonStr = accumulatedContent.trim();
      
      // 移除可能的 Markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      
      jsonStr = jsonStr.trim();
      
      let moduleOptions: any;
      try {
        moduleOptions = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON 解析失败，使用部分解析结果');
        moduleOptions = parsePartialModuleOptions(jsonStr);
      }
      
      // 验证必需字段
      const requiredFields: Array<keyof typeof state.moduleOptions> = ['core', 'pain', 'opening', 'arg1_title', 'arg1_content', 'arg2_title', 'arg2_content', 'arg3_title', 'arg3_content', 'ending'];
      
      const safeModuleOptions: any = {};
      requiredFields.forEach(field => {
        if (Array.isArray(moduleOptions[field]) && moduleOptions[field].length > 0) {
          safeModuleOptions[field] = moduleOptions[field];
        } else {
          safeModuleOptions[field] = state.moduleOptions[field] || [];
        }
      });
      
      const hasAnyContent = requiredFields.some(field => safeModuleOptions[field].length > 0);
      if (!hasAnyContent) {
        throw new Error('返回的内容为空，请重试');
      }
      
      setState(prev => ({
        ...prev,
        moduleOptions: safeModuleOptions,
      }));
      
      showToast('模块选项生成完成！', 'success');
    } catch (error) {
      console.error('生成模块失败:', error);
      showToast(error instanceof Error ? error.message : '生成模块失败，请检查 API 配置', 'error');
    }
    setIsLoading(false);
    setStreamingContent('');
  };

  // 一键随机选择所有模块
  const randomSelectAll = () => {
    if (!state.moduleOptions.core || state.moduleOptions.core.length === 0) {
      showToast('请先生成模块选项', 'warning');
      return;
    }

    const getRandomOption = (options: string[]) => {
      if (!options || options.length === 0) return '';
      return options[Math.floor(Math.random() * options.length)];
    };

    const newSelectedModules = {
      core: getRandomOption(state.moduleOptions.core),
      pain: getRandomOption(state.moduleOptions.pain),
      opening: getRandomOption(state.moduleOptions.opening),
      arg1_title: getRandomOption(state.moduleOptions.arg1_title),
      arg1_content: getRandomOption(state.moduleOptions.arg1_content),
      arg2_title: getRandomOption(state.moduleOptions.arg2_title),
      arg2_content: getRandomOption(state.moduleOptions.arg2_content),
      arg3_title: getRandomOption(state.moduleOptions.arg3_title),
      arg3_content: getRandomOption(state.moduleOptions.arg3_content),
      ending: getRandomOption(state.moduleOptions.ending),
    };

    setState(prev => ({ ...prev, selectedModules: newSelectedModules }));
    showToast('已随机选择所有模块！', 'success');
  };

  // 尝试修复不完整的 JSON
  const tryFixIncompleteJson = (jsonStr: string): string | null => {
    console.log('开始修复 JSON，原始长度:', jsonStr.length);
    
    // 方法1：从后往前逐行尝试，找到最大的有效JSON片段
    const lines = jsonStr.split('\n');
    
    for (let i = lines.length; i >= 1; i--) {
      const testStr = lines.slice(0, i).join('\n');
      
      // 尝试直接解析这个片段
      try {
        JSON.parse(testStr);
        console.log('找到有效 JSON，使用', i, '行');
        return testStr;
      } catch {
        // 继续尝试
      }
    }
    
    console.error('所有修复失败，返回 null');
    return null;
  };

  const generateArticle = async () => {
    // 检查是否所有模块都已选择
    const allModulesSelected = Object.keys(state.selectedModules).every(
      (key) => state.selectedModules[key as keyof typeof state.selectedModules]
    );

    if (!allModulesSelected) {
      showToast('请为所有模块选择内容', 'error');
      return;
    }

    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置 API 信息', 'warning');
      return;
    }
    setIsLoading(true);
    setStreamingContent('');
    try {
      const response = await fetch('/api/gen-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiBaseUrl: state.apiBaseUrl,
          apiKey: state.apiKey,
          model: state.model,
          title: state.selectedTitle,
          style: state.style,
          wordCount: state.wordCount,
          modules: state.selectedModules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成文章失败');
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('无法获取生成内容');
      }

      setState(prev => ({ ...prev, articleContent: content, step: 3 }));
      setOriginalArticleContent(content);
      setIsArticleEdited(false);
      showToast('文章生成成功！', 'success');
    } catch (error) {
      console.error('生成文章失败:', error);
      showToast(error instanceof Error ? error.message : '生成文章失败，请检查 API 配置', 'error');
    }
    setIsLoading(false);
    setStreamingContent('');
  };

  const optimizeArticle = async () => {
    if (!state.articleContent) {
      showToast('请先生成文章', 'error');
      return;
    }

    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置API信息', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const systemPrompt = '你是一个专业的文章优化专家。请对给定的公众号文章进行优化，使其更具吸引力和传播力。优化方向：1. 优化开头，更有冲击力 2. 增加金句和亮点 3. 优化段落结构，更易读 4. 增加互动性引导 5. 保持原意不变。';
      const userPrompt = `请优化以下文章：\n\n${state.articleContent}`;

      const response = await callChatCompletion(
        state.apiBaseUrl,
        state.apiKey,
        state.model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      );

      setState(prev => ({ ...prev, articleContent: response }));
      showToast('文章优化成功！', 'success');
    } catch (error) {
      console.error('优化文章失败:', error);
      showToast('优化文章失败，请检查API配置', 'error');
    }
    setIsLoading(false);
  };

  // 处理风格学习
  const handleLearnStyle = async () => {
    if (!checkApiConfig()) {
      setShowSettings(true);
      showToast('请先配置API信息', 'warning');
      return;
    }
    if (!originalText || !modifiedText) {
      showToast('请填写原文和修改后的内容', 'warning');
      return;
    }

    setIsLearning(true);
    setLearningProgress(0);

    try {
      // 模拟进度
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 10, 90);
        setLearningProgress(currentProgress);
      }, 500);

      const response = await fetch('/api/style/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiBaseUrl: state.apiBaseUrl,
          apiKey: state.apiKey,
          model: state.model,
          original: originalText,
          modified: modifiedText,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('风格学习失败');
      }

      const data = await response.json();
      setLearningResult(data);
      setLearningProgress(100);
      showToast('风格学习成功！', 'success');
    } catch (error) {
      console.error('风格学习失败:', error);
      showToast('风格学习失败，请检查API配置', 'error');
    } finally {
      setIsLearning(false);
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  };

  const copyWechat = () => {
    copyToClipboard('youxuanai2024');
  };

  const reset = () => {
    setState(initialState);
  };

  const t = themes[theme];

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} relative overflow-y-auto scrollbar-thin`}>
      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-10px) translateX(5px);
          }
          66% {
            transform: translateY(5px) translateX(-5px);
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1) translate(-50%, -50%);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1) translate(-50%, -50%);
          }
        }
        @keyframes ripple {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }
      `}</style>
      
      {/* 深色主题下的星辰闪烁背景 */}
      {theme === 'dark' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* 深邃宇宙渐变背景 */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 50%, #050508 100%)'
          }} />
          
          {/* 第一层星星 - 小星星 */}
          <div className="absolute inset-0">
            {[...Array(150)].map((_, i) => (
              <div
                key={`star-small-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: '1px',
                  height: '1px',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.7 + 0.3,
                  animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          {/* 第二层星星 - 中等星星 */}
          <div className="absolute inset-0">
            {[...Array(80)].map((_, i) => (
              <div
                key={`star-medium-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: '2px',
                  height: '2px',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.4,
                  animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                  boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)'
                }}
              />
            ))}
          </div>
          
          {/* 第三层星星 - 大星星 */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={`star-large-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: '3px',
                  height: '3px',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.5,
                  animation: `twinkle ${Math.random() * 5 + 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 12px rgba(100, 200, 255, 0.4)'
                }}
              />
            ))}
          </div>
          
          {/* 漂浮的星云效果 */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(5)].map((_, i) => (
              <div
                key={`nebula-${i}`}
                className="absolute rounded-full"
                style={{
                  width: `${Math.random() * 200 + 100}px`,
                  height: `${Math.random() * 200 + 100}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  background: `radial-gradient(ellipse at center, ${
                    i % 3 === 0 ? 'rgba(100, 200, 255, 0.15)' :
                    i % 3 === 1 ? 'rgba(150, 100, 255, 0.12)' :
                    'rgba(100, 150, 255, 0.1)'
                  }, transparent 70%)`,
                  animation: `float ${Math.random() * 10 + 15}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                  filter: 'blur(20px)'
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 蓝色主题下的网格背景 */}
      {theme === 'blue' && (
        <div className="fixed inset-0 pointer-events-none opacity-100">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `linear-gradient(rgba(22, 93, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 93, 255, 0.12) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
      )}

      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-[1600px] mx-auto relative">
          
          {/* 主题切换按钮 - 最右上角，与模块间距保持一致 */}
          <div className="absolute top-6 -right-16 z-50">
            <button
              onClick={() => setTheme(theme === 'blue' ? 'dark' : 'blue')}
              className={`p-2.5 rounded-lg shadow-lg transition-all ${theme === 'blue' ? 'bg-white hover:bg-slate-50 border border-slate-200' : 'bg-white hover:bg-slate-50 border border-slate-200'}`}
            >
              {theme === 'blue' ? (
                <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            
            {/* 左侧3列 */}
            <div className="col-span-12 lg:col-span-3">
              
              {/* 工具箱/导航 */}
              <Card theme={theme} className="p-6 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'blue' ? 'bg-[#165DFF]' : 'bg-[#3B82F6]'}`}>
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  <div className="flex-1">
                    <h1 className={`text-xl font-bold ${t.text}`}>AI优选轻创</h1>
                    <p className={`${t.textSecondary} text-sm`}>执行就有结果</p>
                  </div>
                </div>
                
                {/* 实时动态模块 */}
                <div className="mb-6">
                  <LiveTicker theme={theme} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: '项目库', id: 'projects' },
                    { name: 'API优选', id: 'api' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const element = document.getElementById(item.id);
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-3 py-2.5 rounded-xl text-sm transition-all ${
                        theme === 'blue' 
                          ? 'bg-slate-100 hover:bg-[#165DFF]/10 border border-slate-200 text-slate-700 hover:text-[#165DFF]'
                          : 'bg-slate-100 hover:bg-[#3B82F6]/10 border border-slate-200 text-slate-700 hover:text-[#3B82F6]'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* 右侧9列 */}
            <div className="col-span-12 lg:col-span-9 h-full">
              
              {/* 工具库模块 */}
              <Card theme={theme} className="overflow-hidden h-full">
                <div className={`p-4 border-b ${t.cardBorder} flex items-center justify-between`}>
                  <div>
                    <h2 className={`text-lg font-bold ${t.text}`}>创作风暴</h2>
                    <p className={`${t.textSecondary} text-xs`}>持续更新，打造最强AI副业工具箱</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-blue-100 border-blue-200'}`}>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <span className={`text-xs font-medium ${theme === 'blue' ? 'text-blue-700' : 'text-blue-700'}`}>当前工具：全部可用</span>
                  </div>
                </div>
                <ToolCarousel theme={theme} onToolSelect={(toolId) => {
                  if (!toolId) return;
                  
                  const tool = tools.find(t => t.id === toolId);
                  if (tool?.isComingSoon) {
                    return; // 即将上线的工具不处理
                  }
                  
                  setActiveTool(toolId);
                  
                  // 滚动到工具使用模块
                  setTimeout(() => {
                    const toolModule = document.getElementById('tool-usage-module');
                    toolModule?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }} />
              </Card>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-12 gap-6 items-stretch">
            
            {/* 左侧 3 列 - API 和项目库 */}
            <div className="col-span-12 lg:col-span-3 flex flex-col h-full">
              {/* API 优选模块 */}
              <Card theme={theme} id="api" className="p-6 flex-shrink-0">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className={`text-lg font-bold ${t.text} mb-1`}>API优选</h2>
                    <p className={`${t.textSecondary} text-sm`}>实战验证，放心使用</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm shadow-md ${
                      theme === 'blue' ? 'bg-[#165DFF] hover:bg-[#4080FF]' : 'bg-[#3B82F6] hover:bg-[#60A5FA]'
                    } text-white`}
                  >
                    <Icon name="Cpu" className="w-4 h-4" />
                    <span>API配置</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {apiList.map((api, idx) => (
                    <div key={idx} className={`rounded-xl p-4 border ${t.cardBorder} ${theme === 'blue' ? 'bg-gradient-to-r from-blue-50 to-slate-50' : 'bg-gradient-to-r from-slate-800/50 to-slate-700/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${t.text}`}>{api.name}</span>
                        <div className="flex gap-2">
                          {api.tags.map((tag, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                tag === '最稳定' ? 'bg-green-100 text-green-700' :
                                tag === '最省钱' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${t.textSecondary} text-sm`}>{api.desc}</span>
                        <span className={`font-bold ${theme === 'blue' ? 'text-[#165DFF]' : 'text-[#3B82F6]'}`}>{api.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 项目库模块 */}
              <Card theme={theme} id="projects" className="p-6 flex-1 mt-6">
                <div className="mb-5">
                  <h2 className={`text-lg font-bold ${t.text} mb-1`}>实战项目库</h2>
                  <p className={`${t.textSecondary} text-sm`}>亲测可落地，照着做就能复制</p>
                </div>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className={`rounded-xl p-4 border ${t.cardBorder} ${theme === 'blue' ? 'bg-gradient-to-r from-blue-50 to-slate-50' : 'bg-gradient-to-r from-slate-800/50 to-slate-700/30'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-[#165DFF]/10' : 'bg-[#3B82F6]/10'}`}>
                          <Icon name={project.icon} className={`w-5 h-5 ${theme === 'blue' ? 'text-[#165DFF]' : 'text-[#3B82F6]'}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold ${t.text}`}>{project.name}</h3>
                          <p className={`${t.textSecondary} text-xs`}>{project.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.steps.map((step, i) => (
                          <React.Fragment key={i}>
                            <span className={`text-xs rounded border px-2 py-1 ${t.textMuted} ${t.cardBorder} ${theme === 'blue' ? 'bg-white' : 'bg-slate-800/50'}`}>{step}</span>
                            {i < project.steps.length - 1 && (
                              <Icon name="ArrowRight" className={`w-3 h-3 ${theme === 'blue' ? 'text-slate-400' : 'text-slate-300'}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>

            {/* 右侧9列 - 工具使用区域（爆文生成器/API配置） */}
            <div id="tool-usage-module" className="col-span-12 lg:col-span-9 h-full">
              
              {/* API配置页面 - 点击API配置按钮时显示 */}
              {showSettings ? (
                <Card theme={theme} className="h-full overflow-hidden flex flex-col">
                  {/* 头部导航 */}
                  <div className={`p-6 border-b ${theme === 'blue' ? 'border-slate-200' : 'border-slate-700'} flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setShowSettings(false)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            theme === 'blue' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          <span className="text-sm font-medium">返回工具</span>
                        </button>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'blue' ? 'bg-[#165DFF]/10' : 'bg-[#3B82F6]/20'}`}>
                            <svg className={`w-5 h-5 ${theme === 'blue' ? 'text-[#165DFF]' : 'text-[#3B82F6]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className={`text-xl font-bold ${t.text}`}>API配置</h2>
                            <p className={`${t.textSecondary} text-sm`}>配置你的API信息，使用真实AI生成内容</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Token消耗统计 */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                        theme === 'blue' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-orange-900/30 text-orange-400 border border-orange-700/50'
                      }`} title="今日Token消耗数量">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-medium">已消耗: 1,457 Tokens</span>
                      </div>
                    </div>
                  </div>

                  {/* 标签页 */}
                  <div className="px-6 pt-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        theme === 'blue' ? 'bg-[#165DFF] text-white' : 'bg-[#3B82F6] text-white'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        语言模型
                      </button>
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        theme === 'blue' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        生图模型
                      </button>
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        theme === 'blue' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Token统计
                      </button>
                    </div>
                  </div>

                  {/* 配置内容区域 */}
                  <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
                    <div className="max-w-3xl w-full flex flex-col">
                      {/* 大语言模型平台 */}
                      <div className={`rounded-2xl p-4 mb-3 ${theme === 'blue' ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-[#165DFF]/10' : 'bg-[#3B82F6]/20'}`}>
                            <svg className="w-4 h-4 text-[#165DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className={`text-base font-bold ${t.text}`}>大语言模型平台</h3>
                            <p className={`text-sm ${t.textSecondary}`}>选择你要使用的大语言模型服务商</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {[
                            { id: 'volcano', name: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3', model: 'ep-20250305155811-t955l' },
                            { id: 'siliconflow', name: '硅基流动', url: 'https://api.siliconflow.cn/v1', model: 'doubao-seed-2-0-pro-260215' },
                            { id: 'deepseek', name: 'DeepSeek官方', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
                            { id: 'anthropic', name: '人为', url: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
                            { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
                            { id: 'groq', name: '格罗克', url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile' },
                            { id: 'google', name: '谷歌', url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-pro' },
                            { id: 'custom', name: '自定义平台', url: '', model: '' },
                          ].map((platform) => (
                            <button
                              key={platform.id}
                              onClick={() => {
                                setState(prev => ({
                                  ...prev,
                                  apiBaseUrl: platform.url,
                                  model: platform.model
                                }));
                              }}
                              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                state.apiBaseUrl === platform.url
                                  ? `${theme === 'blue' ? 'bg-[#165DFF] text-white shadow-lg shadow-[#165DFF]/30' : 'bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/30'}`
                                  : `${theme === 'blue' ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}`
                              }`}
                            >
                              {platform.name}
                            </button>
                          ))}
                        </div>

                        <a href="#" className="inline-flex items-center gap-1 text-sm text-[#165DFF] hover:underline">
                          火山引擎 API文档
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>

                      {/* API配置 */}
                      <div className={`rounded-2xl p-4 mb-3 ${theme === 'blue' ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-purple-500/10' : 'bg-purple-500/20'}`}>
                            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className={`text-base font-bold ${t.text}`}>API配置</h3>
                            <p className={`text-sm ${t.textSecondary}`}>配置你的API密钥和服务地址</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* API密钥 */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                API密钥
                              </span>
                            </label>
                            <input
                              type="password"
                              value={state.apiKey}
                              onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="请输入你的API密钥"
                              className={`w-full px-3 py-2 rounded-xl text-sm transition-all ${
                                theme === 'blue'
                                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                                  : 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20'
                              } border`}
                            />
                            <p className={`text-xs mt-1 ${theme === 'blue' ? 'text-slate-400' : 'text-slate-300'}`}>
                              API密钥将安全存储在本地浏览器中
                            </p>
                          </div>

                          {/* 基础网址 */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                基础网址
                              </span>
                            </label>
                            <input
                              type="text"
                              value={state.apiBaseUrl}
                              onChange={(e) => setState(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-xl text-sm transition-all ${
                                theme === 'blue'
                                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                                  : 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20'
                              } border`}
                            />
                          </div>

                          {/* Model ID */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                                Model ID/接入点 ID
                              </span>
                            </label>
                            <input
                              type="text"
                              value={state.model}
                              onChange={(e) => setState(prev => ({ ...prev, model: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-xl text-sm transition-all ${
                                theme === 'blue'
                                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                                  : 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20'
                              } border`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 模型参数 */}
                      <div className={`rounded-2xl p-4 mb-3 ${theme === 'blue' ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-green-500/10' : 'bg-green-500/20'}`}>
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className={`text-base font-bold ${t.text}`}>模型参数</h3>
                              <p className={`text-sm ${t.textSecondary}`}>调整模型的生成参数</p>
                            </div>
                          </div>
                          <button className={`flex items-center gap-1 text-sm transition-colors ${theme === 'blue' ? 'text-[#165DFF] hover:text-[#4080FF]' : 'text-[#3B82F6] hover:text-[#60A5FA]'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            重置
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* 温度 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-sm font-medium ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                                <span className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                                  </svg>
                                  温度
                                </span>
                              </label>
                              <span className={`text-sm font-mono px-2 py-1 rounded ${theme === 'blue' ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'}`}>0.4</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              defaultValue="0.4"
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #165DFF 0%, #165DFF 20%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 20%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 100%)`
                              }}
                            />
                            <p className={`text-xs mt-1 ${theme === 'blue' ? 'text-slate-400' : 'text-slate-300'}`}>
                              控制生成文本的随机性
                            </p>
                          </div>

                          {/* Top P */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-sm font-medium ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                                <span className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                  Top P
                                </span>
                              </label>
                              <span className={`text-sm font-mono px-2 py-1 rounded ${theme === 'blue' ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'}`}>0.85</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              defaultValue="0.85"
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #165DFF 0%, #165DFF 85%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 85%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 100%)`
                              }}
                            />
                            <p className={`text-xs mt-1 ${theme === 'blue' ? 'text-slate-400' : 'text-slate-300'}`}>
                              控制采样范围
                            </p>
                          </div>

                          {/* Max Tokens */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-sm font-medium ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'}`}>
                                <span className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Max Tokens
                                </span>
                              </label>
                              <span className={`text-sm font-mono px-2 py-1 rounded ${theme === 'blue' ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'}`}>16384</span>
                            </div>
                            <input
                              type="range"
                              min="1024"
                              max="32768"
                              step="1024"
                              defaultValue="16384"
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #165DFF 0%, #165DFF 50%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 50%, ${theme === 'blue' ? '#e2e8f0' : '#334155'} 100%)`
                              }}
                            />
                            <p className={`text-xs mt-2 ${theme === 'blue' ? 'text-slate-400' : 'text-slate-300'}`}>
                              单次生成的最大 token 数，建议设置为 16K-64K 以获得完整输出能力
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 底部按钮 */}
                      <div className="flex gap-4">
                        <button
                          onClick={async () => {
                            if (!checkApiConfig()) {
                              showToast('请填写完整的 API 配置信息', 'error');
                              return;
                            }
                            setIsLoading(true);
                            try {
                              const response = await fetch('/api/proxy/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  apiBaseUrl: state.apiBaseUrl,
                                  apiKey: state.apiKey,
                                  model: state.model,
                                  messages: [
                                    { role: 'system', content: '你是一个简单的测试助手，请回复"API 连接成功"即可。' },
                                    { role: 'user', content: '测试连接' }
                                  ],
                                }),
                              });

                              if (response.ok) {
                                showToast('✓ API 连接成功！可以正常使用了', 'success');
                              } else {
                                const errorData = await response.json().catch(() => null);
                                const errorMsg = errorData?.error || `HTTP ${response.status}`;
                                console.error('API 测试失败:', errorMsg);
                                showToast(`✗ ${errorMsg}`, 'error');
                              }
                            } catch (error) {
                              const errorMsg = error instanceof Error ? error.message : '未知错误';
                              console.error('API 测试失败:', error);
                              showToast(`✗ 网络错误或服务器异常：${errorMsg}`, 'error');
                            }
                            setIsLoading(false);
                          }}
                          disabled={isLoading}
                          className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            theme === 'blue' 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              测试中...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              测试连接
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowSettings(false);
                            showToast('API配置已保存', 'success');
                          }}
                          className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                            theme === 'blue' 
                              ? 'bg-[#165DFF] hover:bg-[#4080FF] text-white shadow-[#165DFF]/30' 
                              : 'bg-[#3B82F6] hover:bg-[#60A5FA] text-white shadow-[#3B82F6]/30'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          保存配置
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                /* 工具使用区域 - 根据当前选中的工具显示不同内容 */
                <div className="h-full">
                  {activeTool === 'writing-agent' ? (
                    /* 文章生成工具模块 */
                    <div className="h-full">
                      <WritingAgentUI />
                    </div>
                  ) : activeTool === 'article' ? (
                    /* 爆文生成器模块 */
                    <Card theme={theme} hover={false} className="h-full p-8 flex flex-col items-center justify-center">
                    <div className="w-full max-w-5xl">
                      <div className="flex items-center justify-between mb-8 w-full">
                        <div>
                          <h2 className={`text-3xl font-bold ${t.text}`}>爆文生成器</h2>
                          <p className={`${t.textSecondary} text-sm`}>站长自用，实测有效 · 三步生成完整文章</p>
                        </div>
                      </div>

                    {/* 步骤指示器 */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {[
                    { step: 1, label: '基础定调' },
                    { step: 2, label: '模块细化' },
                    { step: 3, label: '生成文章' }
                  ].map((item) => (
                    <div key={item.step} className="flex items-center">
                      <button
                        onClick={() => {
                          // 步骤2需要先生成过模块内容才能点击
                          if (item.step === 2) {
                            const hasGeneratedModules = state.moduleOptions.core && state.moduleOptions.core.length > 0;
                            if (!hasGeneratedModules && state.step !== 2) {
                              showToast('请先在步骤一生成模块内容', 'warning');
                              return;
                            }
                          }
                          setState(prev => ({ ...prev, step: item.step as 1 | 2 | 3 }));
                        }}
                        disabled={item.step === 2 && !(state.moduleOptions.core && state.moduleOptions.core.length > 0) && state.step !== 2}
                        className={`
                          flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm
                          transition-all duration-200 hover:scale-110 cursor-pointer
                          ${state.step >= item.step 
                            ? `${theme === 'blue' ? 'bg-[#165DFF]' : 'bg-[#3B82F6]'} text-white hover:shadow-lg` 
                            : `${theme === 'blue' ? 'bg-slate-200 hover:bg-slate-300' : 'bg-slate-700 hover:bg-slate-600'} text-slate-500 hover:text-slate-700`}
                          ${item.step === 2 && !(state.moduleOptions.core && state.moduleOptions.core.length > 0) && state.step !== 2 ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
                        `}
                      >
                        {state.step > item.step ? <Icon name="Check" className="w-5 h-5" /> : item.step}
                      </button>
                      <button
                        onClick={() => {
                          // 步骤2需要先生成过模块内容才能点击
                          if (item.step === 2) {
                            const hasGeneratedModules = state.moduleOptions.core && state.moduleOptions.core.length > 0;
                            if (!hasGeneratedModules && state.step !== 2) {
                              showToast('请先在步骤一生成模块内容', 'warning');
                              return;
                            }
                          }
                          setState(prev => ({ ...prev, step: item.step as 1 | 2 | 3 }));
                        }}
                        disabled={item.step === 2 && !(state.moduleOptions.core && state.moduleOptions.core.length > 0) && state.step !== 2}
                        className={`ml-2 text-sm font-medium transition-colors cursor-pointer hover:text-[#165DFF] ${
                          state.step >= item.step ? t.text : t.textSecondary
                        } ${item.step === 2 && !(state.moduleOptions.core && state.moduleOptions.core.length > 0) && state.step !== 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {item.label}
                      </button>
                      {item.step < 3 && <div className={`w-12 h-0.5 mx-2 ${state.step > item.step ? (theme === 'blue' ? 'bg-[#165DFF]' : 'bg-[#3B82F6]') : 'bg-slate-200'}`} />}
                    </div>
                  ))}
                </div>

                {/* 步骤 1：基础定调 */}
                {state.step === 1 && (
                  <div className="max-w-2xl w-full space-y-6">
                    {/* 内容赛道选择 - 卡片式布局 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className={`block text-sm font-bold ${theme === 'blue' ? 'text-slate-700' : 'text-white'}`}>内容赛道</label>
                        <span className={`text-xs px-2 py-1 rounded-full ${theme === 'blue' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-slate-400'}`}>
                          {showMoreCategories ? '15 个类别' : '7 个类别'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {/* 前7个默认显示的选项 */}
                        {[
                          { name: '情感心理', icon: '💕', color: '#FF6B6B', bgColor: '#FFF0F0' },
                          { name: '生活家居', icon: '🏠', color: '#FFB347', bgColor: '#FFF8F0' },
                          { name: '美食旅行', icon: '✈️', color: '#4ECDC4', bgColor: '#F0FFFD' },
                          { name: '职场财经', icon: '💼', color: '#6B7BFF', bgColor: '#F0F2FF' },
                          { name: '知识科普', icon: '📚', color: '#F59E0B', bgColor: '#FFFBF0' },
                          { name: '娱乐影视', icon: '🎬', color: '#EC4899', bgColor: '#FFF0F7' },
                          { name: '科技数码', icon: '💻', color: '#3B82F6', bgColor: '#F0F5FF' }
                        ].map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => setState(prev => ({ ...prev, category: cat.name }))}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                              ${state.category === cat.name
                                ? 'ring-2 ring-offset-2'
                                : 'hover:scale-[1.02]'
                              }
                            `}
                            style={{
                              backgroundColor: state.category === cat.name ? cat.bgColor : theme === 'blue' ? '#F8FAFC' : '#1E293B',
                              border: state.category === cat.name ? `2px solid ${cat.color}` : theme === 'blue' ? '1px solid #E2E8F0' : '1px solid #334155',
                              boxShadow: state.category === cat.name ? `0 4px 14px ${cat.color}30` : 'none',
                              '--tw-ring-color': state.category === cat.name ? cat.color : 'transparent'
                            } as React.CSSProperties}
                          >
                            <span className="text-2xl mb-1">{cat.icon}</span>
                            <span 
                              className="text-xs font-medium truncate w-full text-center"
                              style={{ color: state.category === cat.name ? cat.color : theme === 'blue' ? '#64748B' : '#94A3B8' }}
                            >
                              {cat.name}
                            </span>
                            {state.category === cat.name && (
                              <div 
                                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: cat.color }}
                              >
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                        
                        {/* 展开后显示的更多选项 */}
                        {showMoreCategories && [
                          { name: '汽车体育', icon: '⚽', color: '#F97316', bgColor: '#FFF7F0' },
                          { name: '新闻资讯', icon: '📰', color: '#64748B', bgColor: '#F1F5F9' },
                          { name: '三农乡村', icon: '🌾', color: '#84CC16', bgColor: '#F7FFF0' },
                          { name: '母婴亲子', icon: '👶', color: '#F472B6', bgColor: '#FFF0F7' },
                          { name: '健康养生', icon: '🌿', color: '#10B981', bgColor: '#F0FFF7' },
                          { name: '游戏电竞', icon: '🎮', color: '#8B5CF6', bgColor: '#F5F0FF' },
                          { name: '时尚美妆', icon: '💄', color: '#FB7185', bgColor: '#FFF0F2' }
                        ].map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => setState(prev => ({ ...prev, category: cat.name }))}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                              ${state.category === cat.name
                                ? 'ring-2 ring-offset-2'
                                : 'hover:scale-[1.02]'
                              }
                            `}
                            style={{
                              backgroundColor: state.category === cat.name ? cat.bgColor : theme === 'blue' ? '#F8FAFC' : '#1E293B',
                              border: state.category === cat.name ? `2px solid ${cat.color}` : theme === 'blue' ? '1px solid #E2E8F0' : '1px solid #334155',
                              boxShadow: state.category === cat.name ? `0 4px 14px ${cat.color}30` : 'none',
                              '--tw-ring-color': state.category === cat.name ? cat.color : 'transparent'
                            } as React.CSSProperties}
                          >
                            <span className="text-2xl mb-1">{cat.icon}</span>
                            <span 
                              className="text-xs font-medium truncate w-full text-center"
                              style={{ color: state.category === cat.name ? cat.color : theme === 'blue' ? '#64748B' : '#94A3B8' }}
                            >
                              {cat.name}
                            </span>
                            {state.category === cat.name && (
                              <div 
                                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: cat.color }}
                              >
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                        
                        {/* 其他选项 */}
                        {showMoreCategories && (
                          <button
                            onClick={() => setState(prev => ({ ...prev, category: '其他' }))}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                              ${state.category === '其他'
                                ? 'ring-2 ring-offset-2'
                                : 'hover:scale-[1.02]'
                              }
                            `}
                            style={{
                              backgroundColor: state.category === '其他' ? '#F1F5F9' : theme === 'blue' ? '#F8FAFC' : '#1E293B',
                              border: state.category === '其他' ? '2px solid #64748B' : theme === 'blue' ? '1px solid #E2E8F0' : '1px solid #334155',
                              boxShadow: state.category === '其他' ? '0 4px 14px #64748B30' : 'none',
                              '--tw-ring-color': state.category === '其他' ? '#64748B' : 'transparent'
                            } as React.CSSProperties}
                          >
                            <span className="text-2xl mb-1">🔍</span>
                            <span 
                              className="text-xs font-medium truncate w-full text-center"
                              style={{ color: state.category === '其他' ? '#64748B' : theme === 'blue' ? '#64748B' : '#94A3B8' }}
                            >
                              其他
                            </span>
                            {state.category === '其他' && (
                              <div 
                                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: '#64748B' }}
                              >
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        )}
                        
                        {/* 更多/收起按钮 */}
                        <button
                          onClick={() => setShowMoreCategories(!showMoreCategories)}
                          className={`
                            relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                            hover:scale-[1.02] col-span-4 sm:col-span-1
                            ${theme === 'blue' 
                              ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200' 
                              : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'
                            }
                          `}
                        >
                          <span className="text-2xl mb-1">{showMoreCategories ? '⬆️' : '⬇️'}</span>
                          <span className={`text-xs font-medium truncate w-full text-center ${theme === 'blue' ? 'text-slate-600' : 'text-slate-300'}`}>
                            {showMoreCategories ? '收起' : '更多'}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    {/* 输入主题或标题 */}
                    <div>
                      <label className={`block text-sm font-bold ${theme === 'blue' ? 'text-slate-700' : 'text-white'} mb-3`}>文章标题</label>
                      <div className="relative">
                        <InputWithGlow
                          placeholder="点击右侧按钮生成标题，或手动输入..."
                          value={state.inputTitle}
                          onChange={(v) => {
                            setState(prev => ({ 
                              ...prev, 
                              inputTitle: v,
                              selectedTitle: v
                            }));
                          }}
                          theme={theme}
                          rightPadding={90}
                        />
                        {/* 生成标题按钮 - 放在输入框内右侧 */}
                        <button
                          onClick={async () => {
                            setIsInputGenerating(true);
                            await generateRandomTitleByCategory();
                            setIsInputGenerating(false);
                          }}
                          disabled={isInputGenerating}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-3 rounded-md flex items-center gap-1.5 transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          title="随机生成标题"
                        >
                          {isInputGenerating ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Icon name="Sparkles" className="w-3.5 h-3.5" />
                          )}
                          <span>生成</span>
                        </button>
                      </div>
                      <p className={`mt-2 text-xs ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>
                        💡 提示：点击生成按钮根据【{state.category || '所选赛道'}】自动生成爆款标题
                      </p>
                    </div>
                    
                    {/* 字数选择 */}
                    <div>
                      <label className={`block text-sm font-bold ${theme === 'blue' ? 'text-slate-700' : 'text-white'} mb-3`}>
                        目标字数
                        <span className={`ml-2 text-sm font-normal ${theme === 'blue' ? 'text-slate-500' : 'text-slate-300'}`}>
                          (当前：{state.wordCount}字)
                        </span>
                      </label>
                      <div className="space-y-3">
                        <input
                          type="range"
                          min="300"
                          max="3000"
                          step="100"
                          value={state.wordCount}
                          onChange={(e) => setState(prev => ({ ...prev, wordCount: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#165DFF]"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>300 字</span>
                          <span>1000 字</span>
                          <span>2000 字</span>
                          <span>3000 字</span>
                        </div>
                        {/* 快捷选项 */}
                        <div className="flex gap-2">
                          {[
                            { label: '短文', value: 600 },
                            { label: '中等', value: 1200 },
                            { label: '长文', value: 2000 },
                            { label: '深度', value: 3000 }
                          ].map((opt) => (
                            <button
                              key={opt.label}
                              onClick={() => setState(prev => ({ ...prev, wordCount: opt.value }))}
                              className={`
                                flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300
                                ${state.wordCount === opt.value
                                  ? theme === 'blue'
                                    ? 'bg-[#165DFF] text-white shadow-md'
                                    : 'bg-[#3B82F6] text-white shadow-md'
                                  : theme === 'blue'
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }
                              `}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 主要操作按钮 */}
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          // 如果没有标题，先自动生成一个
                          if (!state.inputTitle.trim()) {
                            await generateRandomTitleByCategory();
                          }
                          // 跳转到步骤2并开始生成模块
                          setState(prev => ({ ...prev, step: 2 }));
                          // 延迟一点确保步骤切换完成后再开始生成
                          setTimeout(() => {
                            generateModules();
                          }, 100);
                        }}
                        disabled={isTitleLoading}
                        className="flex-1 h-12 px-6 rounded-lg font-semibold text-base inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                      >
                        {isTitleLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Icon name="ArrowRight" className="w-5 h-5" />
                            下一步
                          </>
                        )}
                      </button>
                    </div>
                    
                  </div>
                )}

                {/* 步骤 2：模块细化 */}
                {state.step === 2 && (
                  <div className="max-w-3xl w-full space-y-6">
                    {/* 显示当前标题 */}
                    {state.selectedTitle && (
                      <div className={`p-4 rounded-xl ${theme === 'blue' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-800 border border-slate-700'}`}>
                        <div className="flex items-center gap-3">
                          <Icon name="FileText" className={`w-5 h-5 ${theme === 'blue' ? 'text-blue-500' : 'text-blue-400'}`} />
                          <span className={`text-sm font-medium ${theme === 'blue' ? 'text-blue-700' : 'text-blue-300'}`}>当前标题：</span>
                          <span className={`text-sm ${theme === 'blue' ? 'text-slate-700' : 'text-slate-300'} flex-1 truncate`}>{state.selectedTitle}</span>
                          <button
                            onClick={() => setState(prev => ({ ...prev, step: 1 }))}
                            className="text-xs px-3 py-1.5 rounded-md bg-white text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            修改
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 有标题时显示操作按钮 */}
                    {state.selectedTitle && (
                      <>
                        <div className="flex gap-3">
                          {/* 返回上一步按钮 - 灰色次要按钮 */}
                          <button
                            onClick={() => setState(prev => ({ ...prev, step: 1 }))}
                            className="h-10 px-5 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 whitespace-nowrap"
                          >
                            <Icon name="ArrowLeft" className="w-4 h-4" />
                            返回上一步
                          </button>
                          {/* 重新生成按钮 - 蓝色主要按钮 */}
                          <button
                            onClick={() => {
                              setState(prev => ({ ...prev, step: 1, selectedTitle: '' }));
                            }}
                            className="flex-1 h-10 px-5 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                          >
                            <Icon name="RefreshCw" className="w-4 h-4" />
                            重新生成
                          </button>

                          {/* 主要操作：生成模块 */}
                          <button
                            onClick={generateModules}
                            disabled={isLoading}
                            className="flex-1 h-10 px-5 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Icon name="Layers" className="w-4 h-4" />
                                生成模块
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* 流式输出预览 */}
                        {isLoading && streamingContent && (
                          <div className={`p-4 rounded-xl border ${theme === 'blue' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className={`text-xs font-bold ${theme === 'blue' ? 'text-slate-500' : 'text-slate-300'}`}>正在生成模块...</span>
                            </div>
                            <div className={`text-sm font-mono ${theme === 'blue' ? 'text-slate-600' : 'text-slate-300'}`}>
                              {streamingContent}
                              <span className="animate-pulse">▊</span>
                            </div>
                          </div>
                        )}

                        {(state.modules.length > 0 || (state.moduleOptions.core && state.moduleOptions.core.length > 0)) && (
                          <div className="mt-6 flex flex-col max-h-[calc(100vh-280px)]">
                            {/* 顶部工具栏 - 优化信息层级 */}
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'blue' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-blue-400 to-indigo-400'} shadow-lg shadow-blue-500/30`}>
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className={`text-lg font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-white'} mb-0.5`}>模块配置中心</h3>
                                  <p className={`text-sm ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>已选择 {Object.values(state.selectedModules).filter(v => v !== '').length}/10 个模块</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* 快速操作按钮组 */}
                                <button
                                  onClick={() => {
                                    // 展开/收起所有模块
                                    const modules = document.querySelectorAll('.module-card');
                                    modules.forEach((m: Element) => {
                                      const content = m.querySelector('.module-content');
                                      if (content) {
                                        content.classList.toggle('hidden');
                                      }
                                    });
                                  }}
                                  className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm
                                    ${theme === 'blue'
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}
                                  `}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                  </svg>
                                  展开/收起
                                </button>
                                <button
                                  onClick={randomSelectAll}
                                  className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-200
                                    ${theme === 'blue'
                                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-95'
                                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-95'
                                    }
                                  `}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  一键随机
                                </button>
                              </div>
                            </div>

                            {/* 双栏布局：左侧模块选择 + 右侧实时预览 */}
                            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6">
                              {/* 左侧：模块选择区域 (占3列) */}
                              <div className="lg:col-span-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-4 pr-1">

                            {/* 核心观点 */}
                            {state.moduleOptions.core && state.moduleOptions.core.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30' : 'border-indigo-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-indigo-500' : 'bg-indigo-400'} shadow-lg shadow-indigo-500/30`}>
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-indigo-900' : 'text-indigo-300'}`}>核心观点</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                    {state.moduleOptions.core.findIndex((opt: string) => opt === state.selectedModules.core) + 1 || 0} / {state.moduleOptions.core.length}
                                  </span>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0 mb-3">
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.core.findIndex((opt: string) => opt === state.selectedModules.core));
                                    const currentOption = state.moduleOptions.core[currentIndex] || state.moduleOptions.core[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                          state.selectedModules.core === currentOption
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 shadow-md'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-indigo-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-indigo-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, core: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.core === currentOption ? 'text-indigo-700 dark:text-indigo-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 切换按钮 */}
                                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const currentIndex = state.moduleOptions.core.findIndex((opt: string) => opt === state.selectedModules.core);
                                      const newIndex = currentIndex <= 0 ? state.moduleOptions.core.length - 1 : currentIndex - 1;
                                      setState(prev => ({ 
                                        ...prev, 
                                        selectedModules: { 
                                          ...prev.selectedModules, 
                                          core: state.moduleOptions.core[newIndex] 
                                        } 
                                      }));
                                    }}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      theme === 'blue'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    上一个
                                  </button>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.core.findIndex((opt: string) => opt === state.selectedModules.core);
                                        const currentOption = state.moduleOptions.core[currentIndex] || state.moduleOptions.core[0];
                                        setState(prev => ({ 
                                          ...prev, 
                                          previewModal: { 
                                            isOpen: true, 
                                            title: '核心观点', 
                                            content: currentOption,
                                            moduleType: 'core'
                                          } 
                                        }));
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                                          : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400'
                                      }`}
                                    >
                                      查看完整
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.core.findIndex((opt: string) => opt === state.selectedModules.core);
                                        const newIndex = currentIndex >= state.moduleOptions.core.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            core: state.moduleOptions.core[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                          : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                      }`}
                                    >
                                      下一个
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>

                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 读者痛点 */}
                            {state.moduleOptions.pain && state.moduleOptions.pain.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-rose-100 bg-gradient-to-br from-white to-rose-50/30' : 'border-rose-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-rose-500' : 'bg-rose-400'} shadow-lg shadow-rose-500/30`}>
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-rose-900' : 'text-rose-300'}`}>读者痛点</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {state.moduleOptions.pain.findIndex((opt: string) => opt === state.selectedModules.pain) + 1 || 0} / {state.moduleOptions.pain.length}
                                  </span>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0 mb-3">
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.pain.findIndex((opt: string) => opt === state.selectedModules.pain));
                                    const currentOption = state.moduleOptions.pain[currentIndex] || state.moduleOptions.pain[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                          state.selectedModules.pain === currentOption
                                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/40 shadow-md'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-rose-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-rose-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, pain: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.pain === currentOption ? 'text-rose-700 dark:text-rose-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 切换按钮 */}
                                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const currentIndex = state.moduleOptions.pain.findIndex((opt: string) => opt === state.selectedModules.pain);
                                      const newIndex = currentIndex <= 0 ? state.moduleOptions.pain.length - 1 : currentIndex - 1;
                                      setState(prev => ({ 
                                        ...prev, 
                                        selectedModules: { 
                                          ...prev.selectedModules, 
                                          pain: state.moduleOptions.pain[newIndex] 
                                        } 
                                      }));
                                    }}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      theme === 'blue'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    上一个
                                  </button>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.pain.findIndex((opt: string) => opt === state.selectedModules.pain);
                                        const currentOption = state.moduleOptions.pain[currentIndex] || state.moduleOptions.pain[0];
                                        setState(prev => ({ 
                                          ...prev, 
                                          previewModal: { 
                                            isOpen: true, 
                                            title: '读者痛点', 
                                            content: currentOption,
                                            moduleType: 'pain'
                                          } 
                                        }));
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                                      }`}
                                    >
                                      查看完整
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.pain.findIndex((opt: string) => opt === state.selectedModules.pain);
                                        const newIndex = currentIndex >= state.moduleOptions.pain.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            pain: state.moduleOptions.pain[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                          : 'bg-rose-500 hover:bg-rose-600 text-white'
                                      }`}
                                    >
                                      下一个
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>

                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 开篇模块 */}
                            {state.moduleOptions.opening && state.moduleOptions.opening.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30' : 'border-emerald-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-emerald-500' : 'bg-emerald-400'} shadow-lg shadow-emerald-500/30`}>
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-emerald-900' : 'text-emerald-300'}`}>开篇模块</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {state.moduleOptions.opening.findIndex((opt: string) => opt === state.selectedModules.opening) + 1 || 0} / {state.moduleOptions.opening.length}
                                  </span>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0 mb-3">
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.opening.findIndex((opt: string) => opt === state.selectedModules.opening));
                                    const currentOption = state.moduleOptions.opening[currentIndex] || state.moduleOptions.opening[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                          state.selectedModules.opening === currentOption
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 shadow-md'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-emerald-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-emerald-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, opening: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.opening === currentOption ? 'text-emerald-700 dark:text-emerald-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 切换按钮 */}
                                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const currentIndex = state.moduleOptions.opening.findIndex((opt: string) => opt === state.selectedModules.opening);
                                      const newIndex = currentIndex <= 0 ? state.moduleOptions.opening.length - 1 : currentIndex - 1;
                                      setState(prev => ({ 
                                        ...prev, 
                                        selectedModules: { 
                                          ...prev.selectedModules, 
                                          opening: state.moduleOptions.opening[newIndex] 
                                        } 
                                      }));
                                    }}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      theme === 'blue'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    上一个
                                  </button>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.opening.findIndex((opt: string) => opt === state.selectedModules.opening);
                                        const currentOption = state.moduleOptions.opening[currentIndex] || state.moduleOptions.opening[0];
                                        setState(prev => ({ 
                                          ...prev, 
                                          previewModal: { 
                                            isOpen: true, 
                                            title: '开篇模块', 
                                            content: currentOption,
                                            moduleType: 'opening'
                                          } 
                                        }));
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                                      }`}
                                    >
                                      查看完整
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.opening.findIndex((opt: string) => opt === state.selectedModules.opening);
                                        const newIndex = currentIndex >= state.moduleOptions.opening.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            opening: state.moduleOptions.opening[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      }`}
                                    >
                                      下一个
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>

                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 第一个分论点 */}
                            {state.moduleOptions.arg1_title && state.moduleOptions.arg1_title.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-amber-100 bg-gradient-to-br from-white to-amber-50/30' : 'border-amber-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-amber-500' : 'bg-amber-400'} shadow-lg shadow-amber-500/30`}>
                                    <span className="text-white text-sm font-bold">1</span>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-amber-900' : 'text-amber-300'}`}>分论点1</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {state.moduleOptions.arg1_title.findIndex((opt: string) => opt === state.selectedModules.arg1_title) + 1 || 0} / {state.moduleOptions.arg1_title.length}
                                  </span>
                                </div>
                                
                                {/* 标题显示区域 */}
                                <div className="mb-3">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>标题</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg1_title.findIndex((opt: string) => opt === state.selectedModules.arg1_title));
                                    const currentOption = state.moduleOptions.arg1_title[currentIndex] || state.moduleOptions.arg1_title[0];
                                    return (
                                      <div 
                                        className={`w-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg1_title === currentOption
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-amber-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-amber-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg1_title: currentOption } }))}
                                      >
                                        <p className={`text-sm font-medium ${state.selectedModules.arg1_title === currentOption ? 'text-amber-700 dark:text-amber-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg1_title.findIndex((opt: string) => opt === state.selectedModules.arg1_title);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg1_title.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg1_title: state.moduleOptions.arg1_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg1_title.findIndex((opt: string) => opt === state.selectedModules.arg1_title);
                                        const newIndex = currentIndex >= state.moduleOptions.arg1_title.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg1_title: state.moduleOptions.arg1_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>内容</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg1_content.findIndex((opt: string) => opt === state.selectedModules.arg1_content));
                                    const currentOption = state.moduleOptions.arg1_content[currentIndex] || state.moduleOptions.arg1_content[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg1_content === currentOption
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-amber-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-amber-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg1_content: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.arg1_content === currentOption ? 'text-amber-700 dark:text-amber-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg1_content.findIndex((opt: string) => opt === state.selectedModules.arg1_content);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg1_content.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg1_content: state.moduleOptions.arg1_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg1_content.findIndex((opt: string) => opt === state.selectedModules.arg1_content);
                                        const newIndex = currentIndex >= state.moduleOptions.arg1_content.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg1_content: state.moduleOptions.arg1_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 第二个分论点 */}
                            {state.moduleOptions.arg2_title && state.moduleOptions.arg2_title.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-cyan-100 bg-gradient-to-br from-white to-cyan-50/30' : 'border-cyan-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-cyan-500' : 'bg-cyan-400'} shadow-lg shadow-cyan-500/30`}>
                                    <span className="text-white text-sm font-bold">2</span>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-cyan-900' : 'text-cyan-300'}`}>分论点2</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                    {state.moduleOptions.arg2_title.findIndex((opt: string) => opt === state.selectedModules.arg2_title) + 1 || 0} / {state.moduleOptions.arg2_title.length}
                                  </span>
                                </div>
                                
                                {/* 标题显示区域 */}
                                <div className="mb-3">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>标题</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg2_title.findIndex((opt: string) => opt === state.selectedModules.arg2_title));
                                    const currentOption = state.moduleOptions.arg2_title[currentIndex] || state.moduleOptions.arg2_title[0];
                                    return (
                                      <div 
                                        className={`w-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg2_title === currentOption
                                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-cyan-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-cyan-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg2_title: currentOption } }))}
                                      >
                                        <p className={`text-sm font-medium ${state.selectedModules.arg2_title === currentOption ? 'text-cyan-700 dark:text-cyan-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg2_title.findIndex((opt: string) => opt === state.selectedModules.arg2_title);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg2_title.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg2_title: state.moduleOptions.arg2_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg2_title.findIndex((opt: string) => opt === state.selectedModules.arg2_title);
                                        const newIndex = currentIndex >= state.moduleOptions.arg2_title.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg2_title: state.moduleOptions.arg2_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                          : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>内容</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg2_content.findIndex((opt: string) => opt === state.selectedModules.arg2_content));
                                    const currentOption = state.moduleOptions.arg2_content[currentIndex] || state.moduleOptions.arg2_content[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg2_content === currentOption
                                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-cyan-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-cyan-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg2_content: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.arg2_content === currentOption ? 'text-cyan-700 dark:text-cyan-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg2_content.findIndex((opt: string) => opt === state.selectedModules.arg2_content);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg2_content.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg2_content: state.moduleOptions.arg2_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg2_content.findIndex((opt: string) => opt === state.selectedModules.arg2_content);
                                        const newIndex = currentIndex >= state.moduleOptions.arg2_content.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg2_content: state.moduleOptions.arg2_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                          : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 第三个分论点 */}
                            {state.moduleOptions.arg3_title && state.moduleOptions.arg3_title.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-violet-100 bg-gradient-to-br from-white to-violet-50/30' : 'border-violet-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-violet-500' : 'bg-violet-400'} shadow-lg shadow-violet-500/30`}>
                                    <span className="text-white text-sm font-bold">3</span>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-violet-900' : 'text-violet-300'}`}>分论点3</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400'}`}>
                                    {state.moduleOptions.arg3_title.findIndex((opt: string) => opt === state.selectedModules.arg3_title) + 1 || 0} / {state.moduleOptions.arg3_title.length}
                                  </span>
                                </div>
                                
                                {/* 标题显示区域 */}
                                <div className="mb-3">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>标题</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg3_title.findIndex((opt: string) => opt === state.selectedModules.arg3_title));
                                    const currentOption = state.moduleOptions.arg3_title[currentIndex] || state.moduleOptions.arg3_title[0];
                                    return (
                                      <div 
                                        className={`w-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg3_title === currentOption
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-violet-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-violet-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg3_title: currentOption } }))}
                                      >
                                        <p className={`text-sm font-medium ${state.selectedModules.arg3_title === currentOption ? 'text-violet-700 dark:text-violet-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg3_title.findIndex((opt: string) => opt === state.selectedModules.arg3_title);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg3_title.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg3_title: state.moduleOptions.arg3_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg3_title.findIndex((opt: string) => opt === state.selectedModules.arg3_title);
                                        const newIndex = currentIndex >= state.moduleOptions.arg3_title.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg3_title: state.moduleOptions.arg3_title[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-violet-500 hover:bg-violet-600 text-white'
                                          : 'bg-violet-500 hover:bg-violet-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0">
                                  <label className={`text-xs font-medium mb-1.5 block ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>内容</label>
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.arg3_content.findIndex((opt: string) => opt === state.selectedModules.arg3_content));
                                    const currentOption = state.moduleOptions.arg3_content[currentIndex] || state.moduleOptions.arg3_content[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer mb-2 ${
                                          state.selectedModules.arg3_content === currentOption
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/40 shadow-sm'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-violet-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-violet-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, arg3_content: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.arg3_content === currentOption ? 'text-violet-700 dark:text-violet-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg3_content.findIndex((opt: string) => opt === state.selectedModules.arg3_content);
                                        const newIndex = currentIndex <= 0 ? state.moduleOptions.arg3_content.length - 1 : currentIndex - 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg3_content: state.moduleOptions.arg3_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                      }`}
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                      上
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.arg3_content.findIndex((opt: string) => opt === state.selectedModules.arg3_content);
                                        const newIndex = currentIndex >= state.moduleOptions.arg3_content.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            arg3_content: state.moduleOptions.arg3_content[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-violet-500 hover:bg-violet-600 text-white'
                                          : 'bg-violet-500-500 hover:bg-violet-600 text-white'
                                      }`}
                                    >
                                      下
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 结尾 */}
                            {state.moduleOptions.ending && state.moduleOptions.ending.length > 0 && (
                              <div className={`module-card p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-purple-100 bg-gradient-to-br from-white to-purple-50/30' : 'border-purple-500/30 bg-gradient-to-br from-slate-800 to-slate-800/50'} flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'blue' ? 'bg-purple-500' : 'bg-purple-400'} shadow-lg shadow-purple-500/30`}>
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <label className={`text-sm font-bold ${theme === 'blue' ? 'text-purple-900' : 'text-purple-300'}`}>结尾模块</label>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${theme === 'blue' ? 'bg-purple-100 text-purple-600' : 'bg-purple-500/20 text-purple-400'}`}>
                                    {state.moduleOptions.ending.findIndex((opt: string) => opt === state.selectedModules.ending) + 1 || 0} / {state.moduleOptions.ending.length}
                                  </span>
                                </div>
                                
                                {/* 内容显示区域 */}
                                <div className="flex-1 min-h-0 mb-3">
                                  {(() => {
                                    const currentIndex = Math.max(0, state.moduleOptions.ending.findIndex((opt: string) => opt === state.selectedModules.ending));
                                    const currentOption = state.moduleOptions.ending[currentIndex] || state.moduleOptions.ending[0];
                                    return (
                                      <div 
                                        className={`w-full h-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                          state.selectedModules.ending === currentOption
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/40 shadow-md'
                                            : theme === 'blue'
                                              ? 'border-slate-200 bg-white hover:border-purple-300'
                                              : 'border-slate-600 bg-slate-700/50 hover:border-purple-400'
                                        }`}
                                        onClick={() => setState(prev => ({ ...prev, selectedModules: { ...prev.selectedModules, ending: currentOption } }))}
                                      >
                                        <p className={`text-sm leading-relaxed ${state.selectedModules.ending === currentOption ? 'text-purple-700 dark:text-purple-300' : theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}>
                                          {currentOption}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 切换按钮 */}
                                <div className="flex items-center justify-between gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const currentIndex = state.moduleOptions.ending.findIndex((opt: string) => opt === state.selectedModules.ending);
                                      const newIndex = currentIndex <= 0 ? state.moduleOptions.ending.length - 1 : currentIndex - 1;
                                      setState(prev => ({ 
                                        ...prev, 
                                        selectedModules: { 
                                          ...prev.selectedModules, 
                                          ending: state.moduleOptions.ending[newIndex] 
                                        } 
                                      }));
                                    }}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      theme === 'blue'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    上一个
                                  </button>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.ending.findIndex((opt: string) => opt === state.selectedModules.ending);
                                        const currentOption = state.moduleOptions.ending[currentIndex] || state.moduleOptions.ending[0];
                                        setState(prev => ({ 
                                          ...prev, 
                                          previewModal: { 
                                            isOpen: true, 
                                            title: '结尾模块', 
                                            content: currentOption,
                                            moduleType: 'ending'
                                          } 
                                        }));
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                                      }`}
                                    >
                                      查看完整
                                    </button>
                                    <button
                                      onClick={() => {
                                        const currentIndex = state.moduleOptions.ending.findIndex((opt: string) => opt === state.selectedModules.ending);
                                        const newIndex = currentIndex >= state.moduleOptions.ending.length - 1 ? 0 : currentIndex + 1;
                                        setState(prev => ({ 
                                          ...prev, 
                                          selectedModules: { 
                                            ...prev.selectedModules, 
                                            ending: state.moduleOptions.ending[newIndex] 
                                          } 
                                        }));
                                      }}
                                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        theme === 'blue'
                                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                                      }`}
                                    >
                                      下一个
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                              </div>
                              {/* 左侧模块选择区域结束 */}

                              {/* 右侧：实时预览面板 (占2列) - 优化为sticky定位 */}
                              <div className="lg:col-span-2 hidden lg:block">
                                <div className={`sticky top-0 p-5 rounded-2xl border-2 ${theme === 'blue' ? 'border-slate-100 bg-gradient-to-br from-white to-slate-50/80' : 'border-slate-700 bg-gradient-to-br from-slate-800 to-slate-800/80'} max-h-[calc(100vh-320px)] overflow-hidden flex flex-col shadow-lg`}>
                                  {/* 预览面板头部 */}
                                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'blue' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-indigo-400 to-purple-400'} shadow-lg shadow-indigo-500/30`}>
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                      </div>
                                      <div>
                                        <h4 className={`text-sm font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-slate-200'}`}>实时预览</h4>
                                        <p className={`text-xs ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>
                                          {Object.values(state.selectedModules).filter(v => v !== '').length} 个模块已选择
                                        </p>
                                      </div>
                                    </div>
                                    {/* 完成度指示器 */}
                                    <div className="flex items-center gap-2">
                                      <div className={`w-16 h-2 rounded-full ${theme === 'blue' ? 'bg-slate-200' : 'bg-slate-700'} overflow-hidden`}>
                                        <div 
                                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                          style={{ width: `${(Object.values(state.selectedModules).filter(v => v !== '').length / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className={`text-xs font-bold ${theme === 'blue' ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {Math.round((Object.values(state.selectedModules).filter(v => v !== '').length / 10) * 100)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* 已选择模块列表 */}
                                  <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-0">
                                    {Object.values(state.selectedModules).filter(v => v !== '').length === 0 ? (
                                      <div className={`flex flex-col items-center justify-center py-8 text-center ${theme === 'blue' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-sm">暂无选择内容</p>
                                        <p className="text-xs mt-1 opacity-70">点击左侧模块进行选择</p>
                                      </div>
                                    ) : (
                                      Object.entries(state.selectedModules)
                                        .filter(([_, value]) => value !== '')
                                        .map(([key, value]) => {
                                          const moduleColors: Record<string, { bg: string, text: string, icon: string }> = {
                                            core: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300', icon: '⚡' },
                                            pain: { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', icon: '🎯' },
                                            opening: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', icon: '🚀' },
                                            ending: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', icon: '✓' },
                                            arg1_title: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', icon: '1' },
                                            arg1_content: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', icon: '📝' },
                                            arg2_title: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', icon: '2' },
                                            arg2_content: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', icon: '📝' },
                                            arg3_title: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', icon: '3' },
                                            arg3_content: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', icon: '📝' },
                                          };
                                          const colors = moduleColors[key] || { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-300', icon: '•' };
                                          const labelMap: Record<string, string> = {
                                            core: '核心观点',
                                            pain: '读者痛点',
                                            opening: '开篇模块',
                                            ending: '结尾模块',
                                            arg1_title: '分论点1-标题',
                                            arg1_content: '分论点1-内容',
                                            arg2_title: '分论点2-标题',
                                            arg2_content: '分论点2-内容',
                                            arg3_title: '分论点3-标题',
                                            arg3_content: '分论点3-内容',
                                          };
                                          return (
                                            <div key={key} className={`group p-3 rounded-xl ${theme === 'blue' ? 'bg-white border border-slate-100' : 'bg-slate-700/50 border border-slate-600'} hover:shadow-md transition-all duration-200 cursor-pointer`}>
                                              <div className="flex items-start gap-2">
                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${colors.bg} ${colors.text} font-bold`}>
                                                  {colors.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <p className={`text-xs font-semibold mb-1 ${theme === 'blue' ? 'text-slate-600' : 'text-slate-400'}`}>{labelMap[key]}</p>
                                                  <p className={`text-sm ${theme === 'blue' ? 'text-slate-800' : 'text-slate-200'} line-clamp-safe-2 leading-relaxed`}>{value as string}</p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                    )}
                                  </div>

                                  {/* 底部操作按钮 */}
                                  <div className="mt-4 pt-4 border-t ${theme === 'blue' ? 'border-slate-100' : 'border-slate-700'} flex-shrink-0">
                                    <div className="flex gap-2">
                                      {/* 主要操作：生成文章 */}
                                      <button
                                        onClick={generateArticle}
                                        disabled={isLoading || Object.values(state.selectedModules).filter(v => v !== '').length === 0}
                                        className="flex-[2] h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                      >
                                        {isLoading ? (
                                          <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            生成中...
                                          </>
                                        ) : (
                                          <>
                                            <Icon name="FileText" className="w-4 h-4" />
                                            生成完整文章
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 移动端：底部预览面板 */}
                            {Object.values(state.selectedModules).some(v => v !== '') && (
                              <div className="lg:hidden mt-6 space-y-4">
                                <div className={`p-4 rounded-2xl border-2 ${theme === 'blue' ? 'border-slate-100 bg-gradient-to-br from-white to-slate-50/50' : 'border-slate-700 bg-gradient-to-br from-slate-800 to-slate-800/50'} max-h-[200px] overflow-y-auto scrollbar-thin`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-sm font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-slate-200'}`}>已选择模块</h4>
                                    <span className={`text-xs ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {Object.values(state.selectedModules).filter(v => v !== '').length}/10
                                    </span>
                                  </div>
                                  <div className="grid gap-2">
                                    {Object.entries(state.selectedModules)
                                      .filter(([_, value]) => value !== '')
                                      .map(([key, value]) => {
                                        const moduleColors: Record<string, { bg: string, text: string }> = {
                                          core: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
                                          pain: { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
                                          opening: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
                                          ending: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
                                          arg1_title: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
                                          arg1_content: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
                                          arg2_title: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
                                          arg2_content: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
                                          arg3_title: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400' },
                                          arg3_content: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400' },
                                        };
                                        const colors = moduleColors[key] || { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' };
                                        const labelMap: Record<string, string> = {
                                          core: '核心观点',
                                          pain: '读者痛点',
                                          opening: '开篇模块',
                                          ending: '结尾模块',
                                          arg1_title: '分论点1-标题',
                                          arg1_content: '分论点1-内容',
                                          arg2_title: '分论点2-标题',
                                          arg2_content: '分论点2-内容',
                                          arg3_title: '分论点3-标题',
                                          arg3_content: '分论点3-内容',
                                        };
                                        return (
                                          <div key={key} className={`flex items-start gap-2 p-2 rounded-lg ${theme === 'blue' ? 'bg-white' : 'bg-slate-700/30'}`}>
                                            <div className={`px-2 py-0.5 rounded flex-shrink-0 ${colors.bg}`}>
                                              <span className={`text-[10px] font-bold whitespace-nowrap ${colors.text}`}>{labelMap[key]}</span>
                                            </div>
                                            <span className={`${t.textMuted} text-xs break-words overflow-hidden line-clamp-safe-2`}>{value as string}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {/* 主要操作：生成文章（移动端） */}
                                  <button
                                    onClick={generateArticle}
                                    disabled={isLoading}
                                    className="flex-[2] h-10 px-4 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                  >
                                    {isLoading ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        生成中...
                                      </>
                                    ) : (
                                      <>
                                        <Icon name="FileText" className="w-4 h-4" />
                                        生成完整文章
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 内容预览弹窗 */}
                <ContentPreviewModal
                  isOpen={state.previewModal?.isOpen ?? false}
                  onClose={() => setState(prev => ({ 
                    ...prev, 
                    previewModal: { 
                      ...(prev.previewModal || initialState.previewModal), 
                      isOpen: false 
                    } 
                  }))}
                  title={state.previewModal?.title ?? ''}
                  content={state.previewModal?.content ?? ''}
                  moduleType={state.previewModal?.moduleType ?? ''}
                  theme={theme}
                />

                {/* 步骤3：生成文章 */}
                {state.step === 3 && (
                  <div className="space-y-6 w-full max-w-5xl">
                    {/* 顶部信息栏 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-green-50 border-green-200`}>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className={`text-sm font-medium text-green-700`}>生成完成</span>
                        </div>
                        <span className={`${t.textSecondary} text-sm truncate max-w-[300px]`}>{state.selectedTitle}</span>
                        {/* 字数统计 */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${theme === 'blue' ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-400'}`}>
                          <Icon name="Type" className="w-3.5 h-3.5" />
                          {state.articleContent.length.toLocaleString()} 字
                        </div>
                      </div>
                      
                      {/* 统一按钮组 */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 次要操作：返回 */}
                        <button
                          onClick={() => setState(prev => ({ ...prev, step: 2 }))}
                          className="h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-all duration-200 ease-out bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                        >
                          <Icon name="ArrowLeft" className="w-4 h-4" />
                          返回
                        </button>
                        
                        {/* 辅助操作：复制 */}
                        <button
                          onClick={() => copyToClipboard(state.articleContent)}
                          className="h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-all duration-200 ease-out bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                        >
                          <Icon name="Copy" className="w-4 h-4" />
                          复制
                        </button>
                        
                        {/* 辅助操作：重置 */}
                        <button
                          onClick={reset}
                          className="h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-all duration-200 ease-out bg-white text-slate-700 border-2 border-slate-200 hover:border-amber-300 hover:text-amber-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                        >
                          <Icon name="Refresh" className="w-4 h-4" />
                          重置
                        </button>
                        
                        {/* 功能按钮：学习风格 */}
                        <button
                          onClick={() => {
                            setShowStyleLearningModal(true);
                            setOriginalText(state.articleContent);
                            setModifiedText('');
                            setLearningResult(null);
                            setLearningProgress(0);
                          }}
                          disabled={!isArticleEdited}
                          className={`h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-all duration-200 ease-out whitespace-nowrap ${
                            isArticleEdited
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Icon name="Brain" className="w-4 h-4" />
                          学习风格
                        </button>
                        
                        {/* 主要操作：优化文章 */}
                        <button
                          onClick={optimizeArticle}
                          disabled={isLoading}
                          className="h-9 px-4 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-all duration-200 ease-out bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              优化中...
                            </>
                          ) : (
                            <>
                              <Icon name="Sparkles" className="w-4 h-4" />
                              优化文章
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* 流式输出预览 */}
                    {isLoading && streamingContent && (
                      <div className={`p-4 rounded-xl border ${theme === 'blue' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className={`text-xs font-bold ${theme === 'blue' ? 'text-slate-500' : 'text-slate-300'}`}>正在生成文章...</span>
                        </div>
                        <div className={`text-sm font-mono ${theme === 'blue' ? 'text-slate-600' : 'text-slate-300'}`}>
                          {streamingContent}
                          <span className="animate-pulse">▊</span>
                        </div>
                      </div>
                    )}

                    <div className={`bg-white border border-slate-200 rounded-xl p-8 max-h-[500px] overflow-y-auto shadow-inner`}>
                      <textarea
                        value={state.articleContent}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          setState(prev => ({ ...prev, articleContent: newContent }));
                          // 检查内容是否被编辑过
                          setIsArticleEdited(newContent !== originalArticleContent);
                        }}
                        className={`w-full h-96 resize-none outline-none bg-transparent text-sm leading-relaxed ${theme === 'blue' ? 'text-slate-700' : 'text-slate-200'}`}
                        placeholder="文章内容..."
                      />
                    </div>


                  </div>
                )}
                </div>
              </Card>
                  ) : activeTool === 'comic' ? (
                    /* 漫剧生成器模块 */
                    <Card theme={theme} hover={false} className="h-full p-8 flex flex-col items-center justify-center">
                      <div className="w-full max-w-2xl text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#722ED1] to-[#9254DE] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Icon name="Image" className="w-12 h-12 text-white" />
                        </div>
                        <h2 className={`text-2xl font-bold ${t.text} mb-4`}>漫剧生成器</h2>
                        <p className={`${t.textSecondary} mb-8`}>一键生成爆款漫剧，让创作更简单</p>
                        <div className={`p-6 rounded-2xl border ${t.cardBorder} ${theme === 'blue' ? 'bg-blue-50' : 'bg-slate-800/50'}`}>
                          <p className={`text-sm ${t.textSecondary}`}>功能即将上线，敬请期待！</p>
                        </div>
                      </div>
                    </Card>
                  ) : activeTool === 'novel' ? (
                    /* 小说生成器模块 */
                    <Card theme={theme} hover={false} className="h-full p-8 flex flex-col items-center justify-center">
                      <div className="w-full max-w-2xl text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#FA8C16] to-[#FF7A45] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Icon name="Book" className="w-12 h-12 text-white" />
                        </div>
                        <h2 className={`text-2xl font-bold ${t.text} mb-4`}>小说生成器</h2>
                        <p className={`${t.textSecondary} mb-8`}>AI写作一键生成，让创作更高效</p>
                        <div className={`p-6 rounded-2xl border ${t.cardBorder} ${theme === 'blue' ? 'bg-orange-50' : 'bg-slate-800/50'}`}>
                          <p className={`text-sm ${t.textSecondary}`}>功能即将上线，敬请期待！</p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    /* 默认显示提示 - 或者直接显示文章生成工具 */
                    !activeTool ? (
                      <Card theme={theme} hover={false} className="h-full p-8 flex flex-col items-center justify-center">
                        <div className="w-full max-w-2xl text-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-[#165DFF] to-[#4080FF] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <Icon name="FileText" className="w-12 h-12 text-white" />
                          </div>
                          <h2 className={`text-2xl font-bold ${t.text} mb-4`}>请选择工具</h2>
                          <p className={`${t.textSecondary} mb-8`}>点击上方工具库中的工具卡片开始使用</p>
                        </div>
                      </Card>
                    ) : null
                  )}
                </div>
            )}
            </div>

          </div>
        </div>
      </div>

      {/* 风格学习弹窗 */}
      {showStyleLearningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">学习写作风格</h3>
              <button
                onClick={() => {
                  setShowStyleLearningModal(false);
                  setLearningResult(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!learningResult ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      AI生成的原文
                    </label>
                    <textarea
                      value={originalText}
                      onChange={(e) => setOriginalText(e.target.value)}
                      placeholder="粘贴AI生成的原文..."
                      className="w-full h-64 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      您修改后的版本
                    </label>
                    <textarea
                      value={modifiedText}
                      onChange={(e) => setModifiedText(e.target.value)}
                      placeholder="粘贴您修改后的版本..."
                      className="w-full h-64 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      学习完成
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {learningResult.analysis?.styleNote}
                    </p>
                  </div>

                  {learningResult.analysis?.changes && (
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">发现的修改模式</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {learningResult.analysis.changes.slice(0, 5).map((change: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                            <div className="text-slate-500 line-through">{change.original}</div>
                            <div className="text-indigo-600 mt-1">{change.modified}</div>
                            <div className="text-xs text-slate-400 mt-1">{change.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {learningResult.analysis?.rules && (
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">提取的风格规则</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {learningResult.analysis.rules.slice(0, 5).map((rule: any, idx: number) => (
                          <div key={idx} className="p-3 bg-indigo-50 rounded-lg text-sm">
                            <div className="font-medium text-indigo-800">
                              {rule.category === 'narrative_style' && '叙事风格'}
                              {rule.category === 'vocabulary' && '词汇偏好'}
                              {rule.category === 'sentence' && '句式结构'}
                              {rule.category === 'tone' && '语气语调'}
                              {rule.category === 'structure' && '段落结构'}
                            </div>
                            <div className="text-indigo-600 mt-1">{rule.note}</div>
                            {rule.prefer?.length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                偏好: {rule.prefer.join('、')}
                              </div>
                            )}
                            {rule.avoid?.length > 0 && (
                              <div className="text-xs text-red-500 mt-1">
                                避免: {rule.avoid.join('、')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50">
              {isLearning ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">正在分析您的写作风格...</span>
                    <span className="text-indigo-600 font-medium">{learningProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${learningProgress}%` }}
                    />
                  </div>
                </div>
              ) : learningResult ? (
                <button
                  onClick={() => {
                    setShowStyleLearningModal(false);
                    setLearningResult(null);
                  }}
                  className="w-full py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                >
                  完成
                </button>
              ) : (
                <button
                  onClick={handleLearnStyle}
                  disabled={!originalText || !modifiedText || isLearning}
                  className={`w-full py-2 rounded-lg font-medium transition-all duration-200 ${
                    originalText && modifiedText
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  开始分析
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
