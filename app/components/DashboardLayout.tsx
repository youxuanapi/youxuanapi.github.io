'use client';

import React, { useState } from 'react';
import { Home, BookOpen, Settings, Plus, Cpu, Image, Book, Zap, TrendingUp, Target, Layers, Sparkles, Sun, Moon, Key } from 'lucide-react';
import { cn } from '../lib/utils';

type MenuItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

const menuItems: MenuItem[] = [
  { id: 'dashboard', name: '工作台', icon: <Home className="w-5 h-5" strokeWidth={1.5} /> },
  { id: 'projects', name: '项目百科', icon: <BookOpen className="w-5 h-5" strokeWidth={1.5} /> },
  { id: 'api', name: 'API 优选', icon: <Settings className="w-5 h-5" strokeWidth={1.5} /> },
];

type Tool = {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  isComingSoon?: boolean;
  badge?: string;
};

const tools: Tool[] = [
  {
    id: 'writing-agent',
    name: '文章生成工具',
    desc: '破除AI味，一键生成高转换爆文',
    icon: <Cpu className="w-5 h-5 text-white" />,
    color: 'from-[#00C2B8] to-[#009688]',
    badge: '热门'
  },
  {
    id: 'comic',
    name: '漫剧生成器',
    desc: '一键生成爆款漫剧',
    icon: <Image className="w-5 h-5 text-white" />,
    color: 'from-[#722ED1] to-[#9254DE]',
    isComingSoon: true,
  },
  {
    id: 'novel',
    name: '小说生成器',
    desc: 'AI写作一键生成',
    icon: <Book className="w-5 h-5 text-white" />,
    color: 'from-[#FA8C16] to-[#FF7A45]',
    isComingSoon: true,
  },
];

const apiList = [
  { name: '豆包-Seed-2.0', desc: '最稳定 · 性价比之王', price: '¥ 0.80/万字', tags: ['最稳定', '最省钱'] },
  { name: 'DeepSeek-V3', desc: '推理能力超强', price: '¥ 1.20/万字', tags: ['最智能'] },
  { name: 'GPT-4o Mini', desc: 'OpenAI官方', price: '¥ 2.50/万字', tags: ['官方'] },
];

const projects = [
  { id: 1, name: '公众号爆文', desc: '从0到1做爆款', icon: <Zap className="w-4 h-4" />, steps: ['定位', '选题', '写作', '变现'] },
  { id: 2, name: '小红书种草', desc: '图文带货新玩法', icon: <TrendingUp className="w-4 h-4" />, steps: ['选品', '笔记', '引流'] },
  { id: 3, name: 'AI短视频', desc: '2025新赛道', icon: <Target className="w-4 h-4" />, steps: ['脚本', '剪辑', '发布'] },
];

type DashboardLayoutProps = {
  children: React.ReactNode;
  theme?: 'blue' | 'slate';
  activeTool?: string | null;
  onToolSelect?: (toolId: string) => void;
  activeMenu?: string;
  onMenuSelect?: (menuId: string) => void;
  onThemeToggle?: () => void;
  onApiConfigClick?: () => void;
  className?: string;
  showTools?: boolean;
  showSideCards?: boolean;
};

export default function DashboardLayout({
  children,
  theme = 'blue',
  activeTool = null,
  onToolSelect,
  activeMenu = 'dashboard',
  onMenuSelect,
  onThemeToggle,
  onApiConfigClick,
  className,
  showTools = true,
  showSideCards = true,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDark = theme === 'slate';

  // 颜色变量 - 参考之前的globals.css设计
  const bgGradient = isDark 
    ? 'linear-gradient(135deg, #050508 0%, #0a0a15 50%, #1a1a2e 100%)'
    : 'linear-gradient(135deg, #fdfcf8 0%, #f5f9f6 50%, #faf4f4 100%)';
  const bgColor = isDark ? '#0a0a15' : '#f5f9f6'; // 用于挖空效果
  const sidebarBg = isDark ? 'bg-[#0a0a15]' : 'bg-slate-900';
  const cardBg = isDark ? 'bg-[#1a1a2e]' : 'bg-white';
  const textColor = isDark ? 'text-[#e5e5e3]' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-[#3b82f6]/30' : 'border-slate-200';
  const cardShadow = isDark 
    ? 'shadow-[0_20px_50px_rgba(0,0,0,0.4)]' 
    : 'shadow-[0_20px_50px_rgba(0,0,0,0.02)]';
  const gridBg = isDark 
    ? 'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)'
    : 'linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)';

  return (
    <div className={cn('min-h-screen flex flex-col', className)} style={{ background: bgGradient }}>
      {/* 网格背景 */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: gridBg,
          backgroundSize: '40px 40px'
        }}
      />
      {/* 星辰效果 */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b relative z-10" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn('p-2 rounded-xl', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
        >
          <Layers className="w-6 h-6" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-[#00C2B8] to-[#009688] flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-base" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>优选AI轻创</h1>
            <p className="text-xs" style={{ color: isDark ? '#64748b' : '#64748b' }}>AI轻创业平台</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onThemeToggle}
            className={cn('p-2 rounded-xl transition-all', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
          >
            {isDark ? <Sun className="w-5 h-5" strokeWidth={1.5} /> : <Moon className="w-5 h-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar - Desktop (2 columns width) */}
        <aside className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-20 border-r w-64',
          sidebarBg,
          borderColor
        )}>
          {/* Logo */}
          <div className="p-8 border-b flex-shrink-0" style={{ borderColor: isDark ? '#334155' : '#334155' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-[#00C2B8] to-[#009688] flex items-center justify-center shadow-lg shadow-teal-500/25">
                <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">优选AI轻创</h1>
                <p className="text-slate-500 text-xs">AI轻创业一站式服务</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-6 space-y-2 mt-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onMenuSelect?.(item.id)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 relative group',
                    isActive 
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {/* Active background with cutout effect */}
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-white/5 rounded-xl" />
                      {/* Right side cutout to blend with main content */}
                      <div className="absolute -right-0 top-0 w-6 h-6" style={{ background: bgColor }} />
                      <div className="absolute -right-0 bottom-0 w-6 h-6" style={{ background: bgColor }} />
                      <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-full" style={{ background: bgColor }} />
                      
                      {/* Left highlight */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-teal-400 to-teal-600 rounded-r-full" />
                    </>
                  )}
                  
                  <div className={cn(
                    'relative z-10 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
                    isActive 
                      ? 'bg-gradient-to-br from-teal-500/20 to-teal-600/20 text-teal-400'
                      : 'hover:bg-white/5'
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    'font-medium relative z-10 text-sm',
                    isActive ? 'text-white' : 'text-slate-400'
                  )}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Card */}
          <div className="p-6 flex-shrink-0">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.5rem] p-6 text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Plus className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">加入交流群</p>
                    <p className="text-indigo-200 text-xs">获取最新玩法和资源</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]">
                  立即加入
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className={cn(
              'md:hidden fixed left-0 top-0 bottom-0 w-80 z-40 flex flex-col shadow-2xl',
              sidebarBg
            )}>
              {/* Logo */}
              <div className="p-6 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: isDark ? '#1e293b' : '#334155' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-[#00C2B8] to-[#009688] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="font-bold text-white text-lg">优选AI轻创</h1>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu */}
              <nav className="flex-1 p-6 space-y-2 mt-2 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onMenuSelect?.(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200',
                        isActive 
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      )}
                    >
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center',
                        isActive ? 'bg-teal-500/20' : ''
                      )}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Card */}
              <div className="p-6 flex-shrink-0">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.5rem] p-6 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">加入交流群</p>
                      <p className="text-indigo-200 text-xs">获取最新玩法</p>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-all">
                    立即加入
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content Area - 10 columns width (since sidebar is 64px fixed) */}
        <main className="flex-1 md:ml-64 relative z-10">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={cn('text-2xl font-bold mb-1', textColor)}>
                  {activeMenu === 'dashboard' && '工作台'}
                  {activeMenu === 'projects' && '项目百科'}
                  {activeMenu === 'api' && 'API 优选'}
                </h2>
                <p className={cn('text-sm', textMuted)}>
                  {activeMenu === 'dashboard' && '欢迎回来，开始你的创作之旅'}
                  {activeMenu === 'projects' && '探索可落地的实战项目'}
                  {activeMenu === 'api' && '精选稳定高性价比的API'}
                </p>
              </div>
              
              {/* Header Actions - Desktop */}
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={onApiConfigClick}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200',
                    cardBg,
                    borderColor,
                    'border',
                    cardShadow,
                    'hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  <Key className="w-4 h-4" strokeWidth={1.5} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                  <span className={cn('text-sm font-medium', textMuted)}>API 配置</span>
                </button>
                
                <button
                  onClick={onThemeToggle}
                  className={cn(
                    'p-2.5 rounded-xl transition-all duration-200',
                    cardBg,
                    borderColor,
                    'border',
                    cardShadow,
                    'hover:scale-[1.05] active:scale-[0.95]'
                  )}
                >
                  {isDark ? (
                    <Sun className="w-5 h-5" strokeWidth={1.5} style={{ color: isDark ? '#fbbf24' : '#fbbf24' }} />
                  ) : (
                    <Moon className="w-5 h-5" strokeWidth={1.5} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                  )}
                </button>
              </div>
            </div>

            {/* 12 Column Grid Layout */}
            {activeMenu === 'dashboard' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Content - 7 columns */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Tools Carousel */}
                  {showTools && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={cn('text-lg font-bold', textColor)}>工具箱</h3>
                          <p className={cn('text-sm', textMuted)}>选择你需要的AI工具</p>
                        </div>
                        <span className="px-3 py-1.5 text-xs font-medium rounded-full" style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' }}>
                          {tools.length} 个工具
                        </span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                        {tools.map((tool) => (
                          <div
                            key={tool.id}
                            onClick={() => !tool.isComingSoon && onToolSelect?.(tool.id)}
                            className={cn(
                              'flex-shrink-0 w-72 snap-start',
                              tool.isComingSoon ? 'cursor-not-allowed' : 'cursor-pointer'
                            )}
                          >
                            <div className={cn(
                              'relative overflow-hidden rounded-[2.5rem] p-6 transition-all duration-400 group',
                              cardBg,
                              borderColor,
                              'border',
                              cardShadow,
                              activeTool === tool.id 
                                ? 'ring-2 ring-teal-500/30 scale-[1.02]'
                                : tool.isComingSoon
                                  ? 'opacity-60'
                                  : 'hover:shadow-[0_30px_60px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-teal-500/20'
                            )}>
                              {/* Gradient overlay */}
                              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${tool.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700`} />
                              
                              {tool.isComingSoon && (
                                <div className="absolute top-5 right-5 z-10">
                                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    即将上线
                                  </span>
                                </div>
                              )}
                              
                              {tool.badge && !tool.isComingSoon && (
                                <div className="absolute top-5 right-5 z-10">
                                  <span className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-teal-500/30">
                                    🔥 {tool.badge}
                                  </span>
                                </div>
                              )}
                              
                              <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-[1.5rem] bg-gradient-to-br ${tool.color} flex items-center justify-center mb-5 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                                  {tool.icon}
                                </div>
                                <h3 className={cn('font-bold text-lg mb-2', textColor)}>{tool.name}</h3>
                                <p className={cn('text-sm mb-5 leading-relaxed', textMuted)}>{tool.desc}</p>
                                {!tool.isComingSoon && (
                                  <div className="flex items-center gap-2" style={{ color: '#00C2B8' }}>
                                    <span className="font-semibold text-sm">开始使用</span>
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Content Card - Full 7 columns width */}
                  <div className={cn(
                    'rounded-[2.5rem] p-6 md:p-8 min-h-[700px] w-full',
                    cardBg,
                    borderColor,
                    'border',
                    cardShadow
                  )}>
                    {children}
                  </div>
                </div>

                {/* Right Sidebar - 3 columns */}
                {showSideCards && (
                  <div className="lg:col-span-4 space-y-6">
                    {/* API优选排行 */}
                    <div className={cn(
                      'rounded-[2.5rem] p-6',
                      cardBg,
                      borderColor,
                      'border',
                      cardShadow
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className={cn('font-bold text-lg', textColor)}>API 优选</h3>
                          <p className={cn('text-sm', textMuted)}>实战验证 · 放心使用</p>
                        </div>
                        <div className="w-10 h-10 rounded-[1rem]" style={{ background: isDark ? '#1e293b' : '#f0fdf4', color: '#10b981' }}>
                          <svg className="w-5 h-5 mx-auto mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {apiList.map((api, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              'p-5 rounded-[1.5rem] transition-all hover:scale-[1.01]',
                              isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn('font-bold text-sm', textColor)}>{api.name}</span>
                              <div className="flex gap-1.5">
                                {api.tags.map((tag, i) => (
                                  <span 
                                    key={i} 
                                    className={cn(
                                      'px-2.5 py-1 rounded text-[10px] font-bold',
                                      tag === '最稳定' ? 'bg-green-100 text-green-700' :
                                      tag === '最省钱' ? 'bg-blue-100 text-blue-700' :
                                      tag === '最智能' ? 'bg-purple-100 text-purple-700' :
                                      'bg-slate-100 text-slate-600'
                                    )}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={cn('text-xs', textMuted)}>{api.desc}</span>
                              <span className={cn('text-sm font-bold', isDark ? 'text-teal-400' : 'text-teal-600')}>{api.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 实战项目库 */}
                    <div className={cn(
                      'rounded-[2.5rem] p-6',
                      cardBg,
                      borderColor,
                      'border',
                      cardShadow
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className={cn('font-bold text-lg', textColor)}>实战项目库</h3>
                          <p className={cn('text-sm', textMuted)}>亲测可落地 · 照着做</p>
                        </div>
                        <div className="w-10 h-10 rounded-[1rem]" style={{ background: isDark ? '#1e293b' : '#fef3c7', color: '#f59e0b' }}>
                          <svg className="w-5 h-5 mx-auto mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {projects.map((project) => (
                          <div 
                            key={project.id}
                            className={cn(
                              'p-5 rounded-[1.5rem] transition-all hover:scale-[1.01]',
                              isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                            )}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-11 h-11 rounded-[1rem] flex items-center justify-center" style={{ background: isDark ? '#1e293b' : '#f0f9ff', color: '#0ea5e9' }}>
                                {project.icon}
                              </div>
                              <div>
                                <h4 className={cn('font-bold text-sm', textColor)}>{project.name}</h4>
                                <p className={cn('text-xs', textMuted)}>{project.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {project.steps.map((step, i) => (
                                <React.Fragment key={i}>
                                  <span className={cn(
                                    'text-xs px-3 py-1.5 rounded-lg border',
                                    textMuted,
                                    borderColor,
                                    isDark ? 'bg-slate-800' : 'bg-white'
                                  )}>
                                    {step}
                                  </span>
                                  {i < project.steps.length - 1 && (
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Non-dashboard menu */
              <div className={cn(
                'rounded-[2.5rem] p-8 min-h-[600px]',
                cardBg,
                borderColor,
                'border',
                cardShadow
              )}>
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
