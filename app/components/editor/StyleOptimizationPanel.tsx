'use client';

import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Wand2, Settings, CheckCircle, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { OptimizationSettings, OptimizationResult, OriginalityReport } from '../../types/editor';

export function StyleOptimizationPanel() {
  const {
    currentContent,
    selectedStyle,
    apiConfig,
    isOptimizing,
    optimizationProgress,
    currentOptimization,
    currentOriginalityReport,
    setOptimizing,
    setOptimizationProgress,
    setOptimizationResult,
    setOriginalityReport,
    updateContent,
  } = useEditorStore();

  const [settings, setSettings] = useState<OptimizationSettings>({
    intensity: 'medium',
    preserveStructure: true,
    preserveKeywords: true,
    targetStyleId: selectedStyle?.id,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleOptimize = async () => {
    if (!apiConfig || !currentContent) return;

    setOptimizing(true);
    setOptimizationProgress(0);
    setOptimizationResult(null);
    setOriginalityReport(null);

    try {
      // 模拟进度
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 5, 80);
        setOptimizationProgress(currentProgress);
      }, 300);

      // 调用优化API
      const optimizeResponse = await fetch('/api/style/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          article: currentContent,
          settings,
          style: selectedStyle,
        }),
      });

      if (!optimizeResponse.ok) {
        throw new Error('文风优化失败');
      }

      const optimizeData = await optimizeResponse.json();
      clearInterval(progressInterval);
      setOptimizationProgress(90);

      // 调用原创性检测API
      const originalityResponse = await fetch('/api/originality/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          article: optimizeData.result.optimized,
        }),
      });

      if (originalityResponse.ok) {
        const originalityData = await originalityResponse.json();
        setOriginalityReport(originalityData.report);
        
        // 更新优化结果中的原创度分数
        if (optimizeData.result) {
          optimizeData.result.originalityScore = originalityData.report.score;
        }
      }

      setOptimizationResult(optimizeData.result);
      setOptimizationProgress(100);
      setShowComparison(true);
    } catch (error) {
      console.error('文风优化失败:', error);
      alert('文风优化失败，请检查API配置');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (currentOptimization?.optimized) {
      updateContent(currentOptimization.optimized, currentOptimization.optimized);
      setShowComparison(false);
      setOptimizationResult(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">专属文风优化</h3>
            <p className="text-xs text-slate-500">
              {selectedStyle ? `基于「${selectedStyle.name}」优化` : '请先学习写作风格'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="优化设置"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={handleOptimize}
            disabled={!apiConfig || !currentContent || isOptimizing || !selectedStyle}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
              'hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105',
              'active:scale-95',
              (!apiConfig || !currentContent || isOptimizing || !selectedStyle) &&
                'opacity-50 cursor-not-allowed hover:scale-100'
            )}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {isOptimizing ? '优化中...' : '一键优化'}
            </span>
          </button>
        </div>
      </div>

      {/* 优化设置 */}
      {showSettings && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">优化强度</label>
            <div className="flex gap-2 mt-1">
              {(['light', 'medium', 'deep'] as const).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => setSettings({ ...settings, intensity })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    settings.intensity === intensity
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border hover:border-amber-300'
                  )}
                >
                  {intensity === 'light' && '轻度'}
                  {intensity === 'medium' && '中度'}
                  {intensity === 'deep' && '深度'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.preserveStructure}
                onChange={(e) =>
                  setSettings({ ...settings, preserveStructure: e.target.checked })
                }
                className="rounded border-slate-300"
              />
              保留文章结构
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.preserveKeywords}
                onChange={(e) =>
                  setSettings({ ...settings, preserveKeywords: e.target.checked })
                }
                className="rounded border-slate-300"
              />
              保留关键词
            </label>
          </div>
        </div>
      )}

      {/* 优化进度 */}
      {isOptimizing && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">正在优化文章风格...</span>
            <span className="text-amber-600 font-medium">{optimizationProgress}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{ width: `${optimizationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 优化结果对比 */}
      {showComparison && currentOptimization && (
        <OptimizationComparison
          result={currentOptimization}
          originalityReport={currentOriginalityReport}
          onApply={handleApplyOptimization}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

function OptimizationComparison({
  result,
  originalityReport,
  onApply,
  onClose,
}: {
  result: OptimizationResult;
  originalityReport: OriginalityReport | null;
  onApply: () => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'comparison' | 'changes' | 'originality'>('comparison');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">优化结果对比</h3>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <span className="text-slate-500">
                风格匹配度: 
                <span className={cn(
                  'font-medium ml-1',
                  result.styleScore >= 80 ? 'text-green-500' :
                  result.styleScore >= 60 ? 'text-amber-500' : 'text-red-500'
                )}>
                  {result.styleScore}%
                </span>
              </span>
              {originalityReport && (
                <span className="text-slate-500">
                  原创度: 
                  <span className={cn(
                    'font-medium ml-1',
                    originalityReport.score >= 80 ? 'text-green-500' :
                    originalityReport.score >= 60 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {originalityReport.score}%
                  </span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          {[
            { id: 'comparison', label: '对比视图', icon: FileText },
            { id: 'changes', label: '修改详情', icon: CheckCircle },
            { id: 'originality', label: '原创性检测', icon: AlertCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'text-amber-600 border-b-2 border-amber-500'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">原文</h4>
                <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                  {result.original}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-amber-600 mb-2">优化后</h4>
                <div className="p-4 bg-amber-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                  {result.optimized}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-3">
              {result.changes.length > 0 ? (
                result.changes.map((change, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-500 line-through">{change.original}</div>
                    <div className="text-sm text-amber-600 mt-1">{change.modified}</div>
                    <div className="text-xs text-slate-400 mt-2">{change.reason}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-8">
                  未检测到显著修改
                </div>
              )}
            </div>
          )}

          {activeTab === 'originality' && originalityReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <div className={cn(
                    'text-3xl font-bold',
                    originalityReport.score >= 80 ? 'text-green-500' :
                    originalityReport.score >= 60 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {originalityReport.score}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">原创度评分</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <div className={cn(
                    'text-3xl font-bold',
                    originalityReport.aiProbability < 30 ? 'text-green-500' :
                    originalityReport.aiProbability < 60 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {originalityReport.aiProbability}%
                  </div>
                  <div className="text-sm text-slate-500 mt-1">AI生成概率</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-slate-700">
                    {originalityReport.similarFragments.length}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">相似片段</div>
                </div>
              </div>

              {originalityReport.similarFragments.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">相似片段</h4>
                  <div className="space-y-2">
                    {originalityReport.similarFragments.map((fragment, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg text-sm">
                        <div className="text-red-700">{fragment.text}</div>
                        <div className="text-xs text-red-500 mt-1">
                          相似度: {(fragment.similarity * 100).toFixed(1)}%
                          {fragment.source && ` | 来源: ${fragment.source}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {originalityReport.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">改进建议</h4>
                  <ul className="space-y-1">
                    {originalityReport.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            应用优化
          </button>
        </div>
      </div>
    </div>
  );
}
