'use client';

import WritingAgentUI from '../components/writing-agent/WritingAgentUI';
import ApiConfig from '../components/ApiConfig';
import { useState } from 'react';

export default function WritingAgentPage() {
  const [showApiConfig, setShowApiConfig] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">专属原创写作Agent</h1>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                V1.0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                API 配置
              </button>
              <a
                href="/"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      </header>

      {showApiConfig && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <ApiConfig />
          </div>
        </div>
      )}

      <WritingAgentUI />
    </div>
  );
}
