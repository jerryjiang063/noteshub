"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
// Removed Underline and Link to avoid duplicates; rely on StarterKit-provided integrations
import Placeholder from "@tiptap/extension-placeholder";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { createLowlight, common } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Bold as BoldIcon, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Heading1, Heading2, Save, Trash2, Undo, Redo, Link as LinkIcon } from "lucide-react";
import { useEffect } from "react";

const lowlight = createLowlight(common);

export default function NoteEditor({
  initialContent,
  onSave,
  onDelete,
  onChange,
  fontName,
  fontUrl,
}: {
  initialContent?: string;
  onSave: (html: string) => void;
  onDelete?: () => void;
  onChange?: (html: string) => void;
  fontName?: string | null;
  fontUrl?: string | null;
}) {
  useEffect(() => {
    if (fontUrl && fontName) {
      const id = `font-${btoa(fontUrl).replace(/=/g, "")}`;
      if (!document.getElementById(id)) {
        const style = document.createElement("style");
        style.id = id;
        style.textContent = `@font-face { font-family: '${fontName}'; src: url('${fontUrl}') format('woff2'), url('${fontUrl}') format('woff'), url('${fontUrl}') format('truetype'); font-display: swap; }`;
        document.head.appendChild(style);
      }
    }
  }, [fontUrl, fontName]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, bulletList: false, orderedList: false, listItem: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({ placeholder: "开始记录你的读书笔记..." }),
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert max-w-none min-h-[240px] focus:outline-none`,
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-black/5 dark:bg-white/10 items-center">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={<BoldIcon size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={<Italic size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={<UnderlineIcon size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={<Heading1 size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={<Heading2 size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={<List size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={<ListOrdered size={16} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={<Quote size={16} />} />
        <ToolbarButton onClick={() => {
          const url = window.prompt("插入链接：", "https://");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }} icon={<LinkIcon size={16} />} />
        <div className="ml-auto flex gap-1">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={<Undo size={16} />} />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={<Redo size={16} />} />
          <button onClick={() => onSave(editor.getHTML())} className="px-2 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm inline-flex items-center gap-1">
            <Save size={14} /> 保存
          </button>
          {onDelete && (
            <button onClick={onDelete} className="px-2 py-1 rounded-md bg-red-600 text-white text-sm inline-flex items-center gap-1">
              <Trash2 size={14} /> 删除
            </button>
          )}
        </div>
      </div>
      <div className="p-3" style={fontName ? { fontFamily: fontUrl ? `${fontName}` : `${fontName}` } : undefined}>
        <div className="prose dark:prose-invert">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, icon }: { onClick: () => void; active?: boolean; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-sm inline-flex items-center justify-center ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/10 dark:bg-white/10"}`}
    >
      {icon}
    </button>
  );
} 