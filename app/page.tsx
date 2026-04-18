'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import WritingAgentUI from './components/writing-agent/WritingAgentUI';
import ApiConfig from './components/ApiConfig';
import { 
  BookOpen, 
  Settings, 
  Cpu, 
  LayoutDashboard, 
  PenTool, 
  Zap, 
  Moon, 
  Sun,
  ChevronRight,
  Crown,
  Activity,
  CircuitBoard
} from 'lucide-react';

export default function Page() {
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 人类眨眼模仿：13-40秒随机间隔，非常偶尔眨眼
    const scheduleBlink = () => {
      const interval = 13000 + Math.random() * 27000; // 13-40秒
      const blinkCount = Math.random() > 0.5 ? 1 : 2; // 50%一次，50%两次
      
      setTimeout(() => {
        performBlink(blinkCount);
        scheduleBlink();
      }, interval);
    };
    
    const performBlink = (count: number) => {
      let blinkTimes = 0;
      const doBlink = () => {
        setIsBlinking(true);
        
        setTimeout(() => {
          setIsBlinking(false);
          blinkTimes++;
          
          if (blinkTimes < count) {
            setTimeout(doBlink, 150); // 两次眨眼间隔150ms
          }
        }, 100); // 单次眨眼100ms
      };
      
      doBlink();
    };
    
    scheduleBlink();
  }, []);

  const renderContent = () => {
    // API 配置页面
    if (showApiConfig) {
      return (
        <div className="w-full bg-white/90 dark:bg-[#26223A]/80 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(20,184,166,0.05)] dark:shadow-[0_8px_30px_rgb(139,92,246,0.1)] border border-teal-100/50 dark:border-violet-400/15 p-8 max-w-4xl mx-auto transition-colors duration-300">
          <ApiConfig
            theme={theme === 'dark' ? 'dark' : 'blue'}
            onSave={() => setShowApiConfig(false)}
            onClose={() => setShowApiConfig(false)}
            onTest={async () => true}
          />
        </div>
      );
    }

    // 其他未开放菜单
    if (activeMenu !== 'dashboard') {
      return (
        <div className="w-full bg-white/90 dark:bg-[#26223A]/80 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(20,184,166,0.05)] dark:shadow-[0_8px_30px_rgb(139,92,246,0.1)] border border-teal-100/50 dark:border-violet-400/15 p-12 flex flex-col items-center justify-center min-h-[500px] space-y-6 max-w-4xl mx-auto transition-colors duration-300">
          <div className="w-24 h-24 rounded-[2.5rem] bg-teal-50 dark:bg-violet-500/20 flex items-center justify-center transition-colors duration-300">
            {activeMenu === 'projects' && <BookOpen className="w-12 h-12 text-teal-600 dark:text-violet-300" strokeWidth={1.5} />}
            {activeMenu === 'api' && <Settings className="w-12 h-12 text-teal-600 dark:text-violet-300" strokeWidth={1.5} />}
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-teal-900 dark:text-violet-50 transition-colors duration-300">
              {activeMenu === 'projects' && '项目百科'}
              {activeMenu === 'api' && 'API 优选'}
            </h2>
            <p className="text-teal-900/60 dark:text-violet-300/60">功能即将上线，敬请期待！</p>
          </div>
        </div>
      );
    }

    // ========== 核心工作台：底部沉浸式编辑器 ==========
    return (
      <div className="flex flex-col space-y-8 max-w-[1400px] mx-auto w-full">
        <div className="w-full relative z-10 mt-8">
          <WritingAgentUI />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-[#0F0A1E] dark:via-[#1A1528] dark:to-[#1E0F2E] font-sans transition-colors duration-300">
      
      {/* ================= 左侧导航栏 ================= */}
      <aside className="w-64 flex-shrink-0 h-full bg-white/60 dark:bg-[#0F0A1E]/80 backdrop-blur-xl border-r border-indigo-100/50 dark:border-indigo-500/15 flex flex-col justify-center z-20">
        <div>
          <div className="h-24 flex items-center px-8 border-b border-indigo-100/50 dark:border-indigo-500/15">
            <div className="flex items-start gap-3">
              {/* 上升矩阵Logo */}
              <div className="bg-white/40 p-2 rounded-xl shadow-[0_8px_30px_rgba(79,70,229,0.06)] backdrop-blur-sm border border-indigo-100/50 transition-all duration-100" style={{
                transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
              }}>
                <div className="relative w-8 h-8 flex-shrink-0 -translate-y-[2px]">
                  {/* 底层方块（左下起点） */}
                  <div className="absolute bottom-0 left-0 w-5 h-5 rounded-[4px] bg-blue-500/40 transition-all"></div>
                  {/* 中层方块（向右上攀升） */}
                  <div className="absolute bottom-[6px] left-[6px] w-5 h-5 rounded-[4px] bg-indigo-500/70 transition-all"></div>
                  {/* 顶层方块（右上顶点） */}
                  <div className="absolute bottom-[12px] left-[12px] w-5 h-5 rounded-[4px] bg-violet-600 transition-all shadow-sm"></div>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span 
                  className="text-xl font-black tracking-[0.15em] text-slate-800 dark:text-white transition-all duration-100"
                  style={{
                    transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
                  }}
                >
                  词元共振
                </span>
                <span 
                  className="text-[0.65rem] font-bold tracking-[0.3em] text-indigo-600/80 uppercase mt-0.5 transition-all duration-100"
                  style={{
                    transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
                  }}
                >
                  TOKEN SYNC
                </span>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-2 mt-4">
            <button 
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeMenu === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-md' : 'text-slate-600 dark:text-indigo-300/60 hover:text-indigo-900 dark:hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">工作台</span>
            </button>
            <button 
              onClick={() => setActiveMenu('api')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeMenu === 'api' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-md' : 'text-slate-600 dark:text-indigo-300/60 hover:text-indigo-900 dark:hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
            >
              <Zap className="w-5 h-5" />
              <span className="font-medium">API 优选</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-500 rounded-[24px] p-5 relative overflow-hidden shadow-lg shadow-violet-400/30">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <Crown className="w-8 h-8 text-white/90 mb-3" />
            <h4 className="text-white font-bold mb-1">加入交流群</h4>
            <p className="text-white/80 text-xs mb-4 leading-relaxed">获取最新副业玩法与独家 API 渠道资源</p>
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-colors backdrop-blur-sm border border-white/30">
              立即加入
            </button>
          </div>
        </div>
      </aside>

      {/* ================= 右侧主内容区 ================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        <header className="w-full h-20 flex-shrink-0 flex items-center justify-between px-10 border-b border-indigo-100/50 dark:border-indigo-500/15 bg-white/80 dark:bg-[#0F0A1E]/80 backdrop-blur-xl z-30 transition-colors duration-300">
          <div className="flex items-center text-slate-500/60 dark:text-indigo-300/60 font-medium transition-colors duration-300">
            <span className="text-indigo-600 dark:text-indigo-400">词元共振</span>
            <ChevronRight className="w-4 h-4 mx-2 opacity-50" />
            <span className="text-slate-800 dark:text-indigo-50 font-bold transition-colors duration-300">
              {activeMenu === 'dashboard' ? '工作台' : activeMenu === 'projects' ? '项目百科' : 'API 优选'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowApiConfig(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#1A1528]/80 backdrop-blur-xl border border-indigo-100/50 dark:border-indigo-500/15 rounded-full text-sm font-medium text-slate-600 dark:text-indigo-300 hover:shadow-sm transition-all"
            >
              <Settings className="w-4 h-4" />
              API 配置
            </button>
            
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-[#1A1528]/80 backdrop-blur-xl border border-indigo-100/50 dark:border-indigo-500/15 rounded-full text-slate-600 dark:text-indigo-300 hover:shadow-sm transition-all shadow-sm"
            >
              {!mounted ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none transition-colors duration-300"></div>
           {/* 网格背景 */}
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 dark:bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] dark:bg-[size:24px_24px] dark:opacity-10 pointer-events-none"></div>
           <div className="relative z-10">
             {renderContent()}
           </div>
        </div>
      </main>

    </div>
  );
}
