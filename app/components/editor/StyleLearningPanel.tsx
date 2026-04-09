'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Brain, Sparkles, ChevronRight, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WritingStyle, StyleLearningRecord } from '../../types/editor';

interface StyleLearningPanelProps {
  autoOpen?: boolean;
}

export function StyleLearningPanel({ autoOpen = false }: StyleLearningPanelProps) {
  const {
    userStyles,
    selectedStyle,
    selectStyle,
    learningRecords,
    isLearning,
    learningProgress,
    apiConfig,
    addStyle,
    addLearningRecord,
    setLearning,
    setLearningProgress,
  } = useEditorStore();

  const [showLearningModal, setShowLearningModal] = useState(autoOpen);
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [learningResult, setLearningResult] = useState<any>(null);

  const handleLearnStyle = async () => {
    if (!apiConfig || !originalText || !modifiedText) return;

    setLearning(true);
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
          apiBaseUrl: apiConfig.apiBaseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model,
          original: originalText,
          modified: modifiedText,
          styleId: selectedStyle?.id,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('风格学习失败');
      }

      const data = await response.json();
      setLearningResult(data);
      setLearningProgress(100);

      // 保存学习记录
      if (data.learningRecord) {
        addLearningRecord(data.learningRecord);
      }

      // 如果是新风格，添加到列表
      if (data.styleModel && !selectedStyle) {
        const newStyle: WritingStyle = {
          id: data.learningRecord.styleId,
          userId: 'current-user',
          name: `我的风格 ${userStyles.length + 1}`,
          description: data.styleModel.description || '个人写作风格',
          languageHabits: {
            formality: 50,
            complexity: 50,
            emotionDensity: 50,
          },
          sentenceStructure: {
            avgLength: 20,
            shortSentenceRatio: 0.3,
            complexSentenceRatio: 0.3,
            questionRatio: 0.1,
          },
          expressionStyle: {
            directness: 50,
            narrativePerspective: 'first',
            rhythm: 'medium',
          },
          vocabulary: {
            preferredWords: [],
            avoidedWords: [],
            fieldTerms: [],
          },
          paragraphStyle: {
            avgLength: 100,
            structure: 'loose',
          },
          learningCount: 1,
          lastLearnedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addStyle(newStyle);
        selectStyle(newStyle);
      }
    } catch (error) {
      console.error('风格学习失败:', error);
      alert('风格学习失败，请检查API配置');
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">写作风格学习</h3>
            <p className="text-xs text-slate-500">AI学习您的写作习惯</p>
          </div>
        </div>
        <button
          onClick={() => setShowLearningModal(true)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
            'hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105',
            'active:scale-95'
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            学习写作风格
          </span>
        </button>
      </div>

      {/* 风格列表 */}
      {userStyles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">我的风格</h4>
          <div className="space-y-2">
            {userStyles.map((style) => (
              <StyleCard
                key={style.id}
                style={style}
                isSelected={selectedStyle?.id === style.id}
                onClick={() => selectStyle(style)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 学习记录 */}
      {learningRecords.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-slate-700 mb-2">学习记录</h4>
          <div className="text-xs text-slate-500">
            累计学习 {learningRecords.length} 次
          </div>
        </div>
      )}

      {/* 学习弹窗 */}
      {showLearningModal && (
        <LearningModal
          originalText={originalText}
          modifiedText={modifiedText}
          setOriginalText={setOriginalText}
          setModifiedText={setModifiedText}
          onClose={() => setShowLearningModal(false)}
          onLearn={handleLearnStyle}
          isLearning={isLearning}
          progress={learningProgress}
          result={learningResult}
        />
      )}
    </div>
  );
}

function StyleCard({
  style,
  isSelected,
  onClick,
}: {
  style: WritingStyle;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h5 className="font-medium text-slate-800">{style.name}</h5>
          <p className="text-xs text-slate-500 mt-0.5">{style.description}</p>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          学习 {style.learningCount} 次
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(style.lastLearnedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function LearningModal({
  originalText,
  modifiedText,
  setOriginalText,
  setModifiedText,
  onClose,
  onLearn,
  isLearning,
  progress,
  result,
}: {
  originalText: string;
  modifiedText: string;
  setOriginalText: (text: string) => void;
  setModifiedText: (text: string) => void;
  onClose: () => void;
  onLearn: () => void;
  isLearning: boolean;
  progress: number;
  result: any;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">学习写作风格</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!result ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AI生成的原文
                </label>
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="粘贴AI生成的原文..."
                  className="w-full h-64 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  className="w-full h-64 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  学习完成
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  {result.analysis?.styleNote}
                </p>
              </div>

              {result.analysis?.changes && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">发现的修改模式</h4>
                  <div className="space-y-2">
                    {result.analysis.changes.slice(0, 5).map((change: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <div className="text-slate-500 line-through">{change.original}</div>
                        <div className="text-indigo-600 mt-1">{change.modified}</div>
                        <div className="text-xs text-slate-400 mt-1">{change.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.analysis?.rules && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">提取的风格规则</h4>
                  <div className="space-y-2">
                    {result.analysis.rules.slice(0, 5).map((rule: any, idx: number) => (
                      <div key={idx} className="p-3 bg-indigo-50 rounded-lg text-sm">
                        <div className="font-medium text-indigo-800">
                          {rule.category === 'narrative_style' && '叙事风格'}
                          {rule.category === 'vocabulary' && '词汇偏好'}
                          {rule.category === 'sentence' && '句式结构'}
                          {rule.category === 'tone' && '语气语调'}
                          {rule.category === 'structure' && '段落结构'}
                        </div>
                        <div className="text-indigo-600 mt-1">{rule.note}</div>
                        {rule.prefer.length > 0 && (
                          <div className="text-xs text-green-600 mt-1">
                            偏好: {rule.prefer.join('、')}
                          </div>
                        )}
                        {rule.avoid.length > 0 && (
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
                <span className="text-indigo-600 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : result ? (
            <button
              onClick={onClose}
              className="w-full py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              完成
            </button>
          ) : (
            <button
              onClick={onLearn}
              disabled={!originalText || !modifiedText}
              className={cn(
                'w-full py-2 rounded-lg font-medium transition-all duration-200',
                originalText && modifiedText
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              开始分析
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
