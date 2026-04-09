'use client';

import { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image,
  Table,
  Quote,
  Code,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface EditorFloatingMenuProps {
  editor: Editor;
}

export function EditorFloatingMenu({ editor }: EditorFloatingMenuProps) {
  const MenuButton = ({
    onClick,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
        'hover:bg-slate-100 text-sm text-slate-700'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <div className="text-xs font-medium text-slate-400 px-3 py-1">
        快速插入
      </div>
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        icon={Heading1}
        label="标题 1"
      />
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        icon={Heading2}
        label="标题 2"
      />
      
      <div className="h-px bg-slate-100 my-1" />
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        icon={List}
        label="无序列表"
      />
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        icon={ListOrdered}
        label="有序列表"
      />
      
      <div className="h-px bg-slate-100 my-1" />
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        icon={Quote}
        label="引用"
      />
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        icon={Code}
        label="代码块"
      />
      
      <MenuButton
        onClick={() => {
          const url = window.prompt('输入图片地址:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        icon={Image}
        label="图片"
      />
      
      <MenuButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        icon={Table}
        label="表格"
      />
    </div>
  );
}
