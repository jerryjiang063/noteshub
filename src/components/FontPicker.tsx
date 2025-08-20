"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COMMON_FONTS = [
  { label: "系统默认", value: "" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "SimSun 宋体", value: "SimSun, serif" },
  { label: "KaiTi 楷体", value: "KaiTi, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
];

export default function FontPicker({
  noteId,
  fontName,
  fontUrl,
  onChange,
}: {
  noteId: string;
  fontName?: string | null;
  fontUrl?: string | null;
  onChange: (name: string, url?: string | null) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["ttf", "otf", "woff", "woff2"].includes(ext)) {
      alert("请上传 ttf/otf/woff/woff2 字体文件");
      return;
    }
    setUploading(true);
    const path = `${noteId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("fonts").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      alert(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("fonts").getPublicUrl(path);
    const url = data.publicUrl;
    onChange(file.name.replace(/\.[^.]+$/, ""), url);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={fontName || ""}
        onChange={(e) => onChange(e.target.value || "", fontUrl || null)}
        className="rounded-md bg-black/5 dark:bg-white/10 px-2 py-1 outline-none"
      >
        {COMMON_FONTS.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
        {fontUrl && fontName && <option value={fontName}>{fontName} (上传)</option>}
      </select>
      <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/5 dark:bg-white/10 cursor-pointer">
        <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={onFileChange} className="hidden" />
        {uploading ? "上传中..." : "上传字体"}
      </label>
    </div>
  );
} 