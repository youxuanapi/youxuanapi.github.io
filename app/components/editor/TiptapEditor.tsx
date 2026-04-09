'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Heading } from '@tiptap/extension-heading';
import { ListItem } from '@tiptap/extension-list-item';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { History } from '@tiptap/extension-history';
import { useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { EditorToolbar } from './EditorToolbar';
import { cn } from '../../lib/utils';

interface TiptapEditorProps {
  className?: string;
  onWordCountChange?: (count: number) => void;
}

export function TiptapEditor({ className, onWordCountChange }: TiptapEditorProps) {
  const { 
    currentContent, 
    updateContent, 
    editorConfig,
    article,
  } = useEditorStore();
  
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      History.configure({
        depth: editorConfig.maxUndoSteps,
      }),
      Color,
      TextStyle,
      FontFamily,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      ListItem,
      BulletList,
      OrderedList,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
    ],
    content: currentContent || article?.content || '',
    editable: true,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      updateContent(text, html);
      onWordCountChange?.(countWords(text));
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // 同步外部内容变化
  useEffect(() => {
    if (editor && currentContent !== editor.getText()) {
      editor.commands.setContent(currentContent);
    }
  }, [currentContent, editor]);

  // 自动保存
  useEffect(() => {
    if (!editorConfig.autoSave) return;
    
    const interval = setInterval(() => {
      const { saveArticle, isDirty } = useEditorStore.getState();
      if (isDirty) {
        saveArticle();
      }
    }, editorConfig.autoSaveInterval);

    return () => clearInterval(interval);
  }, [editorConfig.autoSave, editorConfig.autoSaveInterval]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const { saveArticle } = useEditorStore.getState();
        saveArticle();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          editor?.chain().focus().redo().run();
        } else {
          editor?.chain().focus().undo().run();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    
    // 转换为base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      editor.chain().focus().setImage({ src: result }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg shadow-sm border', className)}>
      {/* 工具栏 */}
      <EditorToolbar 
        editor={editor} 
        onImageUpload={handleImageUpload}
      />
      
      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-hidden relative">
        <EditorContent
          editor={editor}
          className={cn(
            'h-full overflow-y-auto p-6 prose prose-slate max-w-none',
            'focus:outline-none',
            isFocused && 'ring-2 ring-indigo-500/20'
          )}
        />
      </div>
      
      {/* 底部状态栏 */}
      <EditorStatusBar editor={editor} />
    </div>
  );
}

// 编辑器状态栏
function EditorStatusBar({ editor }: { editor: any }) {
  const { wordCount, isDirty, isSaving, lastSavedAt, canUndo, canRedo } = useEditorStore();
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  useEffect(() => {
    const updateCursor = () => {
      const { from } = editor.state.selection;
      // 简化计算，实际应该计算行号和列号
      setCursorPosition({ line: 1, column: from + 1 });
    };

    editor.on('selectionUpdate', updateCursor);
    return () => editor.off('selectionUpdate', updateCursor);
  }, [editor]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">
      <div className="flex items-center gap-4">
        <span>{wordCount} 字</span>
        <span>行 {cursorPosition.line}, 列 {cursorPosition.column}</span>
        {canUndo() && <span className="text-indigo-500">可撤销</span>}
        {canRedo() && <span className="text-indigo-500">可重做</span>}
      </div>
      <div className="flex items-center gap-2">
        {isSaving && <span className="text-indigo-500">保存中...</span>}
        {!isSaving && isDirty && <span className="text-amber-500">未保存</span>}
        {!isSaving && !isDirty && lastSavedAt && (
          <span className="text-green-500">
            已保存 {new Date(lastSavedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

// 字数统计
function countWords(text: string): number {
  const plainText = text.replace(/<[^>]*>/g, '');
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}
