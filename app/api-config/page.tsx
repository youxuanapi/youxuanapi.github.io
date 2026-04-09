'use client';

import React, { useState } from 'react';
import ApiConfig from '../components/ApiConfig';
import { useToast } from '../components/Toast';

export default function ApiConfigPage() {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<'blue' | 'dark'>('dark');

  const handleSave = (config: {
    platform: string;
    apiKey: string;
    baseUrl: string;
    modelId: string;
    temperature: number;
    topP: number;
    maxTokens: number;
  }) => {
    // 保存到本地存储
    localStorage.setItem('apiConfig', JSON.stringify(config));
    showToast('API配置已保存', 'success');
    console.log('保存的配置:', config);
  };

  const handleTest = async (config: {
    platform: string;
    apiKey: string;
    baseUrl: string;
    modelId: string;
    temperature: number;
    topP: number;
    maxTokens: number;
  }) => {
    try {
      // 发送测试请求
      const response = await fetch('/api/proxy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.modelId,
          messages: [
            { role: 'system', content: '你是一个简单的测试助手，请回复"API连接成功"即可。' },
            { role: 'user', content: '测试连接' }
          ],
        }),
      });

      if (response.ok) {
        showToast('API连接成功！', 'success');
        return true;
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('API测试失败:', error);
      showToast('API连接失败，请检查配置信息', 'error');
      return false;
    }
  };

  const handleClose = () => {
    // 返回首页
    window.location.href = '/';
  };

  return (
    <ApiConfig
      theme={theme}
      onSave={handleSave}
      onTest={handleTest}
      onClose={handleClose}
    />
  );
}
