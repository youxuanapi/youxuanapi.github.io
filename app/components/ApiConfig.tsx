'use client';

import React, { useState } from 'react';

interface ApiConfigProps {
  theme?: 'blue' | 'dark';
  onSave?: (config: ApiConfigState) => void;
  onTest?: (config: ApiConfigState) => Promise<boolean>;
  onClose?: () => void;
}

export interface ApiConfigState {
  platform: string;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

const platforms = [
  { id: 'volcano', name: '火山引擎', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'ep-20250305155811-t955l', docUrl: 'https://www.volcengine.com/docs/82379' },
  { id: 'siliconflow', name: '硅基流动', defaultUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'doubao-seed-2-0-pro-260215', docUrl: 'https://docs.siliconflow.cn/' },
  { id: 'deepseek', name: 'DeepSeek官方', defaultUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', docUrl: 'https://platform.deepseek.com/api-docs/' },
  { id: 'anthropic', name: 'Anthropic', defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-20241022', docUrl: 'https://docs.anthropic.com/' },
  { id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', docUrl: 'https://platform.openai.com/docs' },
  { id: 'groq', name: 'Groq', defaultUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.1-70b-versatile', docUrl: 'https://console.groq.com/docs' },
  { id: 'google', name: '谷歌', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-1.5-pro', docUrl: 'https://ai.google.dev/docs' },
  { id: 'custom', name: '自定义平台', defaultUrl: '', defaultModel: '', docUrl: '' },
];

export default function ApiConfig({ theme = 'blue', onSave, onTest, onClose }: ApiConfigProps) {
  const [config, setConfig] = useState<ApiConfigState>({
    platform: 'volcano',
    apiKey: '',
    baseUrl: platforms[0].defaultUrl,
    modelId: platforms[0].defaultModel,
    temperature: 0.4,
    topP: 0.85,
    maxTokens: 16384,
  });
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const currentPlatform = platforms.find(p => p.id === config.platform) || platforms[0];
  const isDark = theme === 'dark';

  const handlePlatformChange = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (platform) {
      setConfig(prev => ({
        ...prev,
        platform: platformId,
        baseUrl: platform.defaultUrl,
        modelId: platform.defaultModel,
      }));
    }
  };

  const handleTest = async () => {
    if (!config.apiKey || !config.baseUrl || !config.modelId) {
      setTestResult('error');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const success = await onTest?.(config);
      setTestResult(success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave?.(config);
  };

  const resetToDefaults = () => {
    setConfig({
      platform: 'volcano',
      apiKey: '',
      baseUrl: platforms[0].defaultUrl,
      modelId: platforms[0].defaultModel,
      temperature: 0.4,
      topP: 0.85,
      maxTokens: 16384,
    });
    setTestResult(null);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">返回首页</span>
            </button>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#165DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </span>
            </h1>
          </div>
          
          {/* Token统计 */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>1457</span>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex gap-2 mb-8">
          <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isDark ? 'bg-[#165DFF] text-white' : 'bg-[#165DFF] text-white'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            语言模型
          </button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white text-slate-600 hover:text-slate-900 shadow-sm'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            生图模型
          </button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white text-slate-600 hover:text-slate-900 shadow-sm'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Token统计
          </button>
        </div>

        {/* 大语言模型平台 */}
        <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#165DFF]/20' : 'bg-[#165DFF]/10'}`}>
              <svg className="w-4 h-4 text-[#165DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>大语言模型平台</h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>选择你要使用的大语言模型服务商</p>
            </div>
          </div>

          {/* 平台选择网格 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformChange(platform.id)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  config.platform === platform.id
                    ? 'bg-[#165DFF] text-white shadow-lg shadow-[#165DFF]/30'
                    : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {platform.name}
              </button>
            ))}
          </div>

          {/* API文档链接 */}
          {currentPlatform.docUrl && (
            <a
              href={currentPlatform.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#165DFF] hover:underline"
            >
              {currentPlatform.name} API文档
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* API配置 */}
        <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}>
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>API配置</h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>配置你的API密钥和服务地址</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* API密钥 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API密钥
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="请输入你的API密钥"
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all pr-12 ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                  } border`}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                API密钥将安全存储在本地浏览器中，不会上传到服务器
              </p>
            </div>

            {/* 基础网址 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  基础网址
                </span>
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.example.com/v1"
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                } border`}
              />
            </div>

            {/* Model ID */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Model ID/接入点 ID
                </span>
              </label>
              <input
                type="text"
                value={config.modelId}
                onChange={(e) => setConfig(prev => ({ ...prev, modelId: e.target.value }))}
                placeholder="model-name or endpoint-id"
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20'
                } border`}
              />
            </div>
          </div>
        </div>

        {/* 模型参数 */}
        <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`}>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>模型参数</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>调整模型的生成参数，修改后点击「保存配置」生效</p>
              </div>
            </div>
            <button
              onClick={resetToDefaults}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isDark ? 'text-[#165DFF] hover:text-[#4080FF]' : 'text-[#165DFF] hover:text-[#4080FF]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置默认值
            </button>
          </div>

          <div className="space-y-6">
            {/* 温度 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                    温度
                  </span>
                </label>
                <span className={`text-sm font-mono px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  {config.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #165DFF 0%, #165DFF ${(config.temperature / 2) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} ${(config.temperature / 2) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`
                }}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                控制生成文本的随机性，数值越高越随机，数值越低越确定
              </p>
            </div>

            {/* Top P */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Top P
                  </span>
                </label>
                <span className={`text-sm font-mono px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  {config.topP}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.topP}
                onChange={(e) => setConfig(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #165DFF 0%, #165DFF ${config.topP * 100}%, ${isDark ? '#334155' : '#e2e8f0'} ${config.topP * 100}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`
                }}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                控制采样范围，数值越高考虑的token越多，数值越低只考虑最可能的token
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Max Tokens
                  </span>
                </label>
                <span className={`text-sm font-mono px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  {config.maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="1024"
                max="32768"
                step="1024"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #165DFF 0%, #165DFF ${((config.maxTokens - 1024) / (32768 - 1024)) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} ${((config.maxTokens - 1024) / (32768 - 1024)) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`
                }}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                单次生成的最大token数，建议设置为16K-64K以获得完整输出能力
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              testResult === 'success'
                ? 'bg-green-500 text-white'
                : testResult === 'error'
                ? 'bg-red-500 text-white'
                : isDark
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isTesting ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                测试中...
              </>
            ) : testResult === 'success' ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                连接成功
              </>
            ) : testResult === 'error' ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                连接失败
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
            onClick={handleSave}
            className="flex-1 px-6 py-4 bg-[#165DFF] hover:bg-[#4080FF] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#165DFF]/30 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
