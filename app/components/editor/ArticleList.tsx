'use client';

import { FileText, Clock, MoreVertical, Trash2, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Article } from '../../types/editor';

interface ArticleListProps {
  articles: Article[];
  currentArticle: Article | null;
  onSelect: (article: Article) => void;
}

export function ArticleList({ articles, currentArticle, onSelect }: ArticleListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPreview = (content: string) => {
    return content.replace(/<[^>]*>/g, '').slice(0, 60) + '...';
  };

  if (articles.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">暂无文章</p>
        <p className="text-xs text-slate-400 mt-1">点击上方按钮创建新文章</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {articles.map((article) => (
        <div
          key={article.id}
          onClick={() => onSelect(article)}
          className={cn(
            'p-4 cursor-pointer transition-all duration-200 group',
            currentArticle?.id === article.id
              ? 'bg-indigo-50 border-l-4 border-indigo-500'
              : 'hover:bg-slate-50 border-l-4 border-transparent'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  'font-medium truncate',
                  currentArticle?.id === article.id
                    ? 'text-indigo-700'
                    : 'text-slate-800'
                )}
              >
                {article.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {getPreview(article.content)}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(article.updatedAt)}
                </span>
                <span>{article.wordCount} 字</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
