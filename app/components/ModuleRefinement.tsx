'use client';

import React, { useState } from 'react';
import { useToast } from './Toast';

interface ModuleRefinementProps {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  theme: 'blue' | 'dark';
  isLoading: boolean;
  onGenerateModules: () => Promise<void>;
  onGenerateArticle: () => Promise<void>;
}

type ModuleKey = keyof typeof moduleLabels;

const moduleLabels = {
  core: { label: '核心观点', icon: '💡', color: 'from-purple-500 to-indigo-500' },
  pain: { label: '读者痛点', icon: '💔', color: 'from-pink-500 to-rose-500' },
  opening: { label: '开篇模块', icon: '🚀', color: 'from-blue-500 to-cyan-500' },
  arg1_title: { label: '论点 1 标题', icon: '📌', color: 'from-green-500 to-emerald-500' },
  arg1_content: { label: '论点 1 内容', icon: '📝', color: 'from-green-500 to-emerald-600' },
  arg2_title: { label: '论点 2 标题', icon: '📌', color: 'from-green-500 to-emerald-500' },
  arg2_content: { label: '论点 2 内容', icon: '📝', color: 'from-green-500 to-emerald-600' },
  arg3_title: { label: '论点 3 标题', icon: '📌', color: 'from-green-500 to-emerald-500' },
  arg3_content: { label: '论点 3 内容', icon: '📝', color: 'from-green-500 to-emerald-600' },
  ending: { label: '结尾模块', icon: '🎯', color: 'from-orange-500 to-amber-500' },
};

// 现代化标题选择卡片组件
const TitleCard = ({ 
  title, 
  selected, 
  onClick, 
  theme 
}: { 
  title: string; 
  selected: boolean; 
  onClick: () => void;
  theme: 'blue' | 'dark';
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left p-5 rounded-2xl transition-all duration-300 overflow-hidden
        ${selected 
          ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20' 
          : theme === 'blue'
            ? 'bg-white border-2 border-slate-200 hover:border-blue-300/50 hover:shadow-md hover:shadow-blue-500/10'
            : 'bg-slate-800 border-2 border-slate-700 hover:border-blue-400/30 hover:shadow-md hover:shadow-blue-500/10'
        }
      `}
    >
      {/* 选中状态的渐变光晕 */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {/* 内容 */}
      <div className="relative flex items-start gap-3">
        {/* 选中指示器 */}
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all duration-300 flex items-center justify-center
          ${selected 
            ? 'bg-gradient-to-br from-blue-500 to-purple-500 border-transparent scale-110' 
            : theme === 'blue'
              ? 'border-slate-300 group-hover:border-blue-400'
              : 'border-slate-600 group-hover:border-blue-400'
          }
        `}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        {/* 标题文字 */}
        <span className={`text-base font-medium leading-relaxed transition-colors duration-300
          ${selected 
            ? 'text-slate-900 dark:text-white' 
            : theme === 'blue'
              ? 'text-slate-700 group-hover:text-slate-900'
              : 'text-slate-300 group-hover:text-white'
          }
        `}>
          {title}
        </span>
      </div>
      
      {/* 底部装饰线 */}
      <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300
        ${selected ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:opacity-50'}
      `} style={{ width: selected ? '100%' : '0%' }} />
    </button>
  );
};

// 现代化模块选项卡片组件
const ModuleOptionCard = ({
  option,
  selected,
  onClick,
  moduleColor,
  theme
}: {
  option: string;
  selected: boolean;
  onClick: () => void;
  moduleColor: string;
  theme: 'blue' | 'dark';
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left p-4 rounded-xl transition-all duration-300 overflow-hidden
        ${selected 
          ? `bg-gradient-to-br ${moduleColor.replace('from-', 'from-').replace('to-', 'to-')}/10 border-2 ${moduleColor.includes('purple') ? 'border-purple-500/50' : moduleColor.includes('green') ? 'border-emerald-500/50' : 'border-blue-500/50'} shadow-lg`
          : theme === 'blue'
            ? 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-md'
            : 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600 hover:shadow-md'
        }
      `}
    >
      {/* 悬浮光晕效果 */}
      <div className={`absolute inset-0 bg-gradient-to-r ${moduleColor}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* 内容 */}
      <div className="relative flex items-start gap-3">
        {/* 选中指示器 */}
        <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 mt-0.5 transition-all duration-300 flex items-center justify-center
          ${selected 
            ? `bg-gradient-to-br ${moduleColor} border-transparent scale-105` 
            : theme === 'blue'
              ? 'border-slate-300 group-hover:border-slate-400'
              : 'border-slate-600 group-hover:border-slate-500'
          }
        `}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        {/* 选项文字 */}
        <span className={`text-sm leading-relaxed transition-colors duration-300 flex-1
          ${selected 
            ? 'text-slate-900 dark:text-white font-medium' 
            : theme === 'blue'
              ? 'text-slate-700 group-hover:text-slate-900'
              : 'text-slate-300 group-hover:text-white'
          }
        `}>
          {option}
        </span>
      </div>
      
      {/* 选中时的底部渐变条 */}
      {selected && (
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${moduleColor}`} />
      )}
    </button>
  );
};

export const ModuleRefinement: React.FC<ModuleRefinementProps> = ({
  state,
  setState,
  theme,
  isLoading,
  onGenerateModules,
  onGenerateArticle,
}) => {
  const { showToast } = useToast();
  const [editingModule, setEditingModule] = useState<ModuleKey | null>(null);
  const [editValue, setEditValue] = useState('');

  // 处理标题选择
  const handleSelectTitle = (title: string) => {
    setState((prev: any) => ({ ...prev, selectedTitle: title }));
  };

  // 处理模块选项选择
  const handleSelectOption = (moduleKey: ModuleKey, option: string) => {
    setState((prev: any) => ({
      ...prev,
      selectedModules: {
        ...prev.selectedModules,
        [moduleKey]: option,
      },
    }));
  };

  // 处理编辑模块
  const handleEditModule = (moduleKey: ModuleKey) => {
    setEditingModule(moduleKey);
    setEditValue(state.selectedModules[moduleKey] || '');
  };

  // 保存编辑内容
  const handleSaveEdit = () => {
    if (editingModule) {
      setState((prev: any) => ({
        ...prev,
        selectedModules: {
          ...prev.selectedModules,
          [editingModule]: editValue,
        },
      }));
      setEditingModule(null);
      setEditValue('');
      showToast('保存成功', 'success');
    }
  };

  // 一键随机选择
  const handleRandomSelect = () => {
    const newSelectedModules: any = {};
    Object.keys(moduleLabels).forEach((key) => {
      const moduleKey = key as ModuleKey;
      const options = state.moduleOptions[moduleKey] || [];
      if (options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        newSelectedModules[moduleKey] = options[randomIndex];
      }
    });

    setState((prev: any) => ({
      ...prev,
      selectedModules: {
        ...prev.selectedModules,
        ...newSelectedModules,
      },
    }));
    showToast('已随机选择所有模块', 'success');
  };

  // 检查是否所有模块都已选择
  const allModulesSelected = Object.keys(moduleLabels).every(
    (key) => state.selectedModules[key as ModuleKey]
  );

  return (
    <div className="space-y-8">
      {/* 标题选择区域 */}
      {!state.moduleOptions.core?.length && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
            <div>
              <h2 className={`text-xl font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-white'}`}>
                选择标题
              </h2>
              <p className={`text-sm ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>
                从 AI 生成的标题中选择最吸引你的一个
              </p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {state.titles.map((title: string, idx: number) => (
              <TitleCard
                key={idx}
                title={title}
                selected={state.selectedTitle === title}
                onClick={() => handleSelectTitle(title)}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}

      {/* 模块精细化区域（生成模块选项后显示） */}
      {state.moduleOptions.core?.length > 0 && (
        <>
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-white'}`}>
                  模块精细化
                </h2>
                <p className={`text-sm ${theme === 'blue' ? 'text-slate-500' : 'text-slate-400'}`}>
                  为每个模块选择或编辑内容，打造专属文章结构
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRandomSelect}
                disabled={isLoading}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm flex items-center gap-2
                  ${theme === 'blue'
                    ? 'bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-md hover:shadow-lg'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-lg">🎲</span>
                一键随机
              </button>
              <button
                onClick={onGenerateModules}
                disabled={isLoading}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm flex items-center gap-2
                  ${theme === 'blue'
                    ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 hover:from-purple-600 hover:via-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    重新生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 模块列表 */}
          <div className="space-y-8">
            {Object.entries(moduleLabels).map(([key, config]) => {
              const moduleKey = key as ModuleKey;
              const options = state.moduleOptions[moduleKey] || [];
              const selected = state.selectedModules[moduleKey];
              const label = config as any;

              return (
                <div key={key} className="space-y-4">
                  {/* 模块标题 */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{label.icon}</span>
                    <h3 className={`text-lg font-bold ${theme === 'blue' ? 'text-slate-800' : 'text-white'}`}>
                      {label.label}
                    </h3>
                    {selected && (
                      <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-md shadow-green-500/30">
                        ✓ 已选择
                      </span>
                    )}
                  </div>

                  {/* 选项列表 */}
                  <div className="grid gap-3">
                    {options.length > 0 ? (
                      options.map((option: string, idx: number) => (
                        <ModuleOptionCard
                          key={idx}
                          option={option}
                          selected={selected === option}
                          onClick={() => handleSelectOption(moduleKey, option)}
                          moduleColor={label.color}
                          theme={theme}
                        />
                      ))
                    ) : (
                      <div className={`p-6 rounded-xl border-2 border-dashed ${theme === 'blue' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800'}`}>
                        <p className={`text-sm text-center ${theme === 'blue' ? 'text-slate-400' : 'text-slate-500'}`}>
                          点击"重新生成"生成{label.label}的选项
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 编辑按钮 */}
                  {selected && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleEditModule(moduleKey)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                          ${theme === 'blue'
                            ? 'bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 shadow-md hover:shadow-lg'
                            : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-md hover:shadow-lg'
                          }`}
                      >
                        <span>✏️</span>
                        编辑选中内容
                      </button>
                    </div>
                  )}

                  {/* 编辑弹窗 */}
                  {editingModule === moduleKey && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl ${theme === 'blue' ? 'bg-white' : 'bg-slate-800'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'blue' ? 'text-slate-800' : 'text-white'}`}>
                          编辑{label.label}
                        </h3>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`w-full h-40 p-4 rounded-xl border-2 resize-none transition-all duration-300
                            ${theme === 'blue'
                              ? 'border-slate-200 focus:border-purple-500 bg-white text-slate-800'
                              : 'border-slate-600 focus:border-purple-500 bg-slate-700 text-white'
                            } outline-none focus:ring-4 focus:ring-purple-500/20`}
                          placeholder="输入自定义内容..."
                        />
                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => {
                              setEditingModule(null);
                              setEditValue('');
                            }}
                            className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300
                              ${theme === 'blue'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                              }`}
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
                          >
                            保存修改
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 底部操作栏 */}
      <div className="flex justify-center gap-4 pt-8 border-t border-slate-200/60">
        <button
          onClick={() => setState((prev: any) => ({ ...prev, step: 1 }))}
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2
            ${theme === 'blue'
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg'
              : 'bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 hover:border-slate-500 shadow-md hover:shadow-lg'
            }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回上一步
        </button>
        <button
          onClick={onGenerateArticle}
          disabled={!allModulesSelected || isLoading}
          className={`px-10 py-3 rounded-xl font-bold transition-all duration-300 text-lg flex items-center gap-3
            ${allModulesSelected && !isLoading
              ? theme === 'blue'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 hover:from-purple-600 hover:via-indigo-600 hover:to-purple-600 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-105'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-purple-600/30 hover:shadow-2xl hover:shadow-purple-600/40 hover:scale-105'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
        >
          {isLoading ? (
            <>
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <span>🚀</span>
              生成完整文章
            </>
          )}
        </button>
      </div>
    </div>
  );
};
