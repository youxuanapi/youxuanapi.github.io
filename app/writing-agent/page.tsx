'use client';

import WritingAgentUI from '../components/writing-agent/WritingAgentUI';
import ApiConfig from '../components/ApiConfig';
import { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useRouter } from 'next/navigation';

export default function WritingAgentPage() {
  const router = useRouter();
  const [showApiConfig, setShowApiConfig] = useState(false);
  const { apiConfig, setApiConfig } = useEditorStore();

  // 检查是否已有API配置，没有的话自动显示配置面板
  useEffect(() => {
    if (!apiConfig?.apiKey) {
      setShowApiConfig(true);
    }
  }, [apiConfig]);

  const handleSaveConfig = (config: any) => {
    // 将ApiConfig的格式转换为editorStore需要的格式
    setApiConfig({
      apiBaseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.modelId,
    });
    setShowApiConfig(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端隐藏头部导航，只在桌面端显示 */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>返回首页</span>
              </a>
              <h1 className="text-xl font-bold text-gray-900">文章生成工具</h1>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                V1.0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                ⚙️ API 配置
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 移动端简化导航 */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-base font-bold text-gray-900">文章生成工具</h1>
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {showApiConfig && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <ApiConfig 
              onSave={handleSaveConfig}
              onClose={() => setShowApiConfig(false)}
            />
          </div>
        </div>
      )}

      <WritingAgentUI />
    </div>
  );
}
