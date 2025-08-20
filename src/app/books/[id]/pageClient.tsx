"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NoteEditor from "@/components/editor/NoteEditor";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import NoteContentViewer from "@/components/NoteContentViewer";
import Link from "next/link";
import FontPicker from "@/components/FontPicker";
import NoteActions from "@/components/NoteActions";
import NoteComments from "@/components/NoteComments";
import BookCover from "@/components/BookCover";
import CropDialog from "@/components/covers/CropDialog";
import { searchCoverLinks } from "@/lib/covers/googleCse";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";


function useDebouncedCallback<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: TArgs) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

type Book = { id: string; title: string; author: string | null; cover_url: string | null; user_id: string; description?: string | null };

type Note = { id: string; title: string | null; content_html: string | null; font_name?: string | null; font_url?: string | null; created_at: string; updated_at: string };

export default function NotesClient({ book, initialNotes, ownerUsername }: { book: Book; initialNotes: Note[]; ownerUsername?: string | null }) {
  const supabase = createSupabaseBrowserClient();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(book.cover_url);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverFetching, setCoverFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [coverResults, setCoverResults] = useState<{ links: string[]; index: number }>({ links: [], index: 0 });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [creatingPulse, setCreatingPulse] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [editAuthor, setEditAuthor] = useState(book.author ?? "");
  const [editDesc, setEditDesc] = useState(book.description ?? "");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setCoverMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const isOwner = useMemo(() => !!userId && userId === book.user_id, [userId, book.user_id]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    let rAf = 0;
    const onScroll = () => {
      if (rAf) return;
      rAf = requestAnimationFrame(() => {
        rAf = 0;
        if (!headerRef.current) return;
        const y = Math.max(0, window.scrollY);
        const scale = Math.max(0.65, 1 - y / 300);
        headerRef.current.style.transform = `scale(${scale})`;
        headerRef.current.style.transformOrigin = "left top";
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rAf) cancelAnimationFrame(rAf);
    };
  }, []);

  // Auto-attempt fetch cover once when missing (frontend Google CSE)
  useEffect(() => {
    if (!isOwner) return;
    if (coverUrl) return;
    try {
      const key = `cover_attempted_${book.id}`;
      if (typeof window !== "undefined" && !localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        (async () => {
          setCoverFetching(true);
          const links = await searchCoverLinks({ title: book.title, author: book.author });
          if (links && links[0]) {
            await applyCoverLink(links[0]);
          }
          setCoverFetching(false);
        })();
      }
    } catch {}
  }, [isOwner, coverUrl, book.id, book.title, book.author]);

  async function tryUploadToStorage(imageUrl: string): Promise<string | null> {
    try {
      const resp = await fetch(imageUrl, { mode: "cors" });
      if (!resp.ok) throw new Error(`fetch image ${resp.status}`);
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
      const blob = await resp.blob();
      const path = `auto/${book.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, blob, { upsert: true, contentType });
      if (upErr) return null;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  async function applyCoverLink(link: string) {
    const hosted = await tryUploadToStorage(link);
    const finalUrl = hosted || link;
    const { error } = await supabase
      .from("books")
      .update({ cover_url: finalUrl })
      .eq("id", book.id);
    if (!error) setCoverUrl(finalUrl);
  }

  async function autoFetchCover() {
    setCoverFetching(true);
    let links = coverResults.links;
    if (!links || links.length === 0) {
      links = await searchCoverLinks({ title: book.title, author: book.author });
    }
    const idx = coverResults.index ?? 0;
    const link = links?.[idx];
    if (link) await applyCoverLink(link);
    setCoverResults({ links, index: idx });
    setCoverFetching(false);
    setCoverMenuOpen(false);
  }

  async function nextCover() {
    setCoverFetching(true);
    let { links, index } = coverResults;
    if (!links || links.length === 0) {
      links = await searchCoverLinks({ title: book.title, author: book.author });
      index = 0;
    } else {
      index = (index + 1) % links.length;
    }
    const link = links?.[index];
    if (link) await applyCoverLink(link);
    setCoverResults({ links, index });
    setCoverFetching(false);
    setCoverMenuOpen(false);
  }

  async function onUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    // Open crop dialog with selected image
    const reader = new FileReader();
    reader.onload = () => { setRawImage(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
    setCoverMenuOpen(false);
  }

  async function onCropConfirm(blob: Blob) {
    // Upload cropped blob
    const path = `manual/${book.id}/${Date.now()}-crop.jpg`;
    const { error: upErr } = await supabase.storage.from("covers").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { alert(upErr.message); return; }
    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    const url = data.publicUrl;
    const { error } = await supabase.from("books").update({ cover_url: url }).eq("id", book.id);
    if (!error) setCoverUrl(url);
    setCropOpen(false); setRawImage(null);
  }

  function onCropCancel() { setCropOpen(false); setRawImage(null); }

  async function createNote() {
    setCreating(true);
    setCreatingPulse(true);
    const { data, error } = await supabase
      .from("notes")
      .insert({ book_id: book.id, title: "新建笔记", content_html: "" })
      .select("id, title, content_html, font_name, font_url, created_at, updated_at")
      .single();
    setCreating(false);
    setTimeout(() => setCreatingPulse(false), 400);
    if (error) {
      alert(error.message);
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
  }

  const debouncedSave = useDebouncedCallback(async (noteId: string, html: string) => {
    const { error, data } = await supabase
      .from("notes")
      .update({ content_html: html, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select("id, title, content_html, font_name, font_url, created_at, updated_at")
      .single();
    setSavingNoteId(null);
    if (!error && data) setNotes((prev) => prev.map((n) => (n.id === noteId ? (data as Note) : n)));
  }, 600);

  async function saveNoteContent(noteId: string, html: string) {
    setSavingNoteId(noteId);
    debouncedSave(noteId, html);
  }

  async function deleteNote(noteId: string) {
    setPendingDeleteId(noteId);
  }

  async function changeFont(noteId: string, name: string, url?: string | null) {
    const { error, data } = await supabase
      .from("notes")
      .update({ font_name: name || null, font_url: url || null, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select("id, title, content_html, font_name, font_url, created_at, updated_at")
      .single();
    if (!error && data) setNotes((prev) => prev.map((n) => (n.id === noteId ? (data as Note) : n)));
  }

  return (
    <div className="space-y-4">
      <div ref={headerRef} className="mx-auto max-w-6xl px-4 py-6 flex items-center gap-6">
        <Link href="/books" className="px-3 py-2 text-base rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">返回</Link>
        <div className="relative">
          <div className="w-40 md:w-48">
            <BookCover title={book.title} coverUrl={coverUrl} size="normal" />
          </div>
          {isOwner && (
            <div className="absolute top-1 left-1" ref={menuRef}>
              <button onClick={() => setCoverMenuOpen((v) => !v)} className="px-2 py-1 text-xs rounded-md btn-dark-visible transition-opacity hover:opacity-90">
                {coverFetching ? "获取中..." : "更换封面"}
              </button>
              {coverMenuOpen && (
                <div className="mt-2 w-44 rounded-md border border-black/10 dark:border-white/10 bg-[color:var(--background)] shadow-lg p-1 text-sm origin-top-right animate-[fade-in-up_0.18s_ease_forwards]">
                  <button disabled={coverFetching} onClick={autoFetchCover} className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60">{coverFetching ? "获取中..." : "自动获取封面"}</button>
                  <button disabled={coverFetching} onClick={nextCover} className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60">换一张</button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10">上传封面</button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onUploadCover} className="hidden" />
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-bold">{book.title}</div>
          {book.author && <div className="text-base md:text-lg text-black/60 dark:text-white/60">{book.author}</div>}
          {ownerUsername && (
            <div className="text-sm mt-1">
              <Link href={`/${ownerUsername}`} className="text-black/70 dark:text-white/70 hover:underline">@{ownerUsername}</Link>
            </div>
          )}
        </div>
        <div className="ml-auto">
          {isOwner && (
            <button disabled={creating} onClick={createNote} className={`px-4 py-2 text-base rounded-md border border-black/10 dark:border-white/20 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 ${creatingPulse ? "animate-pulse" : ""}`}>新建笔记</button>
          )}
        </div>
      </div>
      {isOwner && (
        <div className="mx-auto max-w-6xl px-4 -mt-4">
          <button onClick={() => setEditOpen(true)} className="text-sm text-black/70 dark:text-white/70 hover:underline">修改基础信息</button>
        </div>
      )}

      <div className="space-y-6">
        {notes.map((note) => (
          <div key={note.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <input
                defaultValue={note.title ?? "无标题"}
                disabled={!isOwner}
                onBlur={async (e) => {
                  if (!isOwner) return;
                  const { data, error } = await supabase
                    .from("notes")
                    .update({ title: e.target.value, updated_at: new Date().toISOString() })
                    .eq("id", note.id)
                    .select("id, title, content_html, font_name, font_url, created_at, updated_at")
                    .single();
                  if (!error && data) setNotes((prev) => prev.map((n) => (n.id === note.id ? (data as Note) : n)));
                }}
                className="w-full text-base font-medium bg-transparent outline-none"
              />
              <div className="flex items-center gap-3">
                {isOwner && (
                  <FontPicker
                    noteId={note.id}
                    fontName={note.font_name}
                    fontUrl={note.font_url}
                    onChange={(name, url) => changeFont(note.id, name, url)}
                  />
                )}
                {savingNoteId === note.id && <span className="text-xs text-black/50 dark:text-white/50">保存中...</span>}
              </div>
            </div>

            {isOwner ? (
              <NoteEditor
                initialContent={note.content_html ?? ""}
                onChange={(html) => saveNoteContent(note.id, html)}
                onSave={(html) => saveNoteContent(note.id, html)}
                onDelete={() => deleteNote(note.id)}
                fontName={note.font_name ?? undefined}
                fontUrl={note.font_url ?? undefined}
              />
            ) : (
              <NoteContentViewer contentHtml={note.content_html ?? ""} fontFamily={note.font_url ? note.font_name || undefined : note.font_name || undefined} />
            )}

            <NoteActions noteId={note.id} />
            <NoteComments noteId={note.id} />
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-sm text-black/60 dark:text-white/60">暂无笔记{isOwner ? "，点击“新建笔记”开始记录。" : "。"}</div>
        )}
      </div>
      {cropOpen && rawImage && (
        <CropDialog image={rawImage} onCancel={onCropCancel} onConfirm={onCropConfirm} />
      )}
      {editOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditOpen(false)}>
          <div className="bg-[color:var(--background)] rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold text-black dark:text-white mb-2">编辑书籍信息</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-black/60 dark:text-white/60 mb-1">书名</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-black/60 dark:text-white/60 mb-1">作者</label>
                <input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-black/60 dark:text-white/60 mb-1">简介</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditOpen(false)} className="px-3 py-2 rounded-md bg-black/5 dark:bg-white/10">取消</button>
              <button
                onClick={async () => {
                  const updates: any = { title: editTitle, author: editAuthor || null, description: editDesc || null };
                  const { error } = await supabase.from("books").update(updates).eq("id", book.id);
                  if (!error) {
                    book.title = editTitle; (book as any).author = editAuthor || null; (book as any).description = editDesc || null;
                    setEditOpen(false);
                  } else {
                    alert(error.message);
                  }
                }}
                className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black"
              >保存</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!pendingDeleteId}
        title="删除笔记"
        description="此操作不可恢复，确定要删除该笔记吗？"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          const id = pendingDeleteId!;
          setPendingDeleteId(null);
          const { error } = await supabase.from("notes").delete().eq("id", id);
          if (error) { alert(error.message); return; }
          setNotes((prev) => prev.filter((n) => n.id !== id));
        }}
      />
    </div>
  );
} 