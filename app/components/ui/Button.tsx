'use client';

import React from 'react';

/**
 * 按钮尺寸规范
 * - sm: 小尺寸，用于次要操作或紧凑布局
 * - md: 中等尺寸，默认尺寸，适用于大多数场景
 * - lg: 大尺寸，用于主要操作或需要强调的场景
 */
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * 按钮变体规范
 * - primary: 主按钮，用于主要操作（如：生成、提交、确认）
 * - secondary: 次要按钮，用于次要操作（如：返回、取消）
 * - outline: 描边按钮，用于辅助操作（如：复制、导出）
 * - ghost: 幽灵按钮，用于低优先级操作（如：重置、清空）
 * - accent: 强调按钮，用于特殊功能（如：学习风格、优化文章）
 */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';

/**
 * 按钮颜色主题
 * - blue: 蓝色主题（默认）
 * - pink: 粉色主题（用于学习风格）
 * - purple: 紫色主题（用于优化文章）
 * - amber: 琥珀色主题（用于警告/重置）
 * - green: 绿色主题（用于成功/确认）
 */
type ButtonColor = 'blue' | 'pink' | 'purple' | 'amber' | 'green';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
  color?: ButtonColor;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * 统一按钮组件
 * 
 * 设计规范：
 * 1. 尺寸体系：
 *    - sm: h-8, px-3, text-sm, gap-1.5
 *    - md: h-10, px-4, text-sm, gap-2 (默认)
 *    - lg: h-12, px-6, text-base, gap-2
 * 
 * 2. 圆角规范：rounded-lg (8px)
 * 
 * 3. 字体规范：font-semibold, 中文优化
 * 
 * 4. 交互状态：
 *    - 默认：标准样式
 *    - 悬停：hover:scale-[1.02], hover:shadow-md
 *    - 点击：active:scale-[0.98]
 *    - 禁用：opacity-50, cursor-not-allowed, 无交互效果
 * 
 * 5. 过渡动画：transition-all duration-200 ease-out
 */
export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  variant = 'primary',
  color = 'blue',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  // 尺寸样式映射
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
  };

  // 基础样式
  const baseStyles = `
    inline-flex items-center justify-center
    rounded-lg
    font-semibold
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
  `;

  // 变体样式映射
  const variantStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
    primary: {
      blue: 'bg-[#165DFF] text-white hover:bg-[#1453e5] hover:shadow-lg hover:shadow-blue-500/30 focus:ring-blue-500',
      pink: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:shadow-lg hover:shadow-pink-500/30 focus:ring-pink-500',
      purple: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/30 focus:ring-purple-500',
      amber: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30 focus:ring-amber-500',
      green: 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/30 focus:ring-green-500',
    },
    secondary: {
      blue: 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md focus:ring-slate-400 border border-slate-200',
      pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100 hover:shadow-md focus:ring-pink-400 border border-pink-200',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 hover:shadow-md focus:ring-purple-400 border border-purple-200',
      amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:shadow-md focus:ring-amber-400 border border-amber-200',
      green: 'bg-green-50 text-green-600 hover:bg-green-100 hover:shadow-md focus:ring-green-400 border border-green-200',
    },
    outline: {
      blue: 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md focus:ring-slate-400 border-2 border-slate-200',
      pink: 'bg-white text-pink-600 hover:bg-pink-50 hover:border-pink-300 hover:shadow-md focus:ring-pink-400 border-2 border-pink-200',
      purple: 'bg-white text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:shadow-md focus:ring-purple-400 border-2 border-purple-200',
      amber: 'bg-white text-amber-600 hover:bg-amber-50 hover:border-amber-300 hover:shadow-md focus:ring-amber-400 border-2 border-amber-200',
      green: 'bg-white text-green-600 hover:bg-green-50 hover:border-green-300 hover:shadow-md focus:ring-green-400 border-2 border-green-200',
    },
    ghost: {
      blue: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus:ring-slate-400',
      pink: 'bg-transparent text-pink-600 hover:bg-pink-50 hover:text-pink-700 focus:ring-pink-400',
      purple: 'bg-transparent text-purple-600 hover:bg-purple-50 hover:text-purple-700 focus:ring-purple-400',
      amber: 'bg-transparent text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:ring-amber-400',
      green: 'bg-transparent text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-green-400',
    },
    accent: {
      blue: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 hover:shadow-lg hover:shadow-blue-500/30 focus:ring-blue-500',
      pink: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:shadow-lg hover:shadow-pink-500/30 focus:ring-pink-500',
      purple: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/30 focus:ring-purple-500',
      amber: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:shadow-amber-500/30 focus:ring-amber-500',
      green: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 hover:shadow-lg hover:shadow-green-500/30 focus:ring-green-500',
    },
  };

  // 交互效果（悬停和点击）
  const interactionStyles = !disabled && !loading
    ? 'hover:scale-[1.02] active:scale-[0.98]'
    : '';

  // 全宽样式
  const widthStyles = fullWidth ? 'w-full' : '';

  // 加载状态样式
  const loadingStyles = loading ? 'cursor-wait' : '';

  const buttonClasses = `
    ${baseStyles}
    ${sizeStyles[size]}
    ${variantStyles[variant][color]}
    ${interactionStyles}
    ${widthStyles}
    ${loadingStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      )}
    </button>
  );
}

/**
 * 按钮组组件
 * 用于将多个按钮组合在一起，保持统一的间距和布局
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function ButtonGroup({ children, className = '', align = 'left' }: ButtonGroupProps) {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${alignStyles[align]} ${className}`}>
      {children}
    </div>
  );
}

export default Button;
