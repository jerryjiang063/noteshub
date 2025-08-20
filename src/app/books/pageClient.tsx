"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import { searchCoverLinks } from "@/lib/covers/googleCse";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";


type Book = { id: string; title: string; author: string | null; cover_url: string | null; user_id: string; uploader_username?: string | null };

export default function BooksClient({ initialBooks }: { initialBooks: Book[] }) {
  const supabase = createSupabaseBrowserClient();
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingCoverFor, setLoadingCoverFor] = useState<string | null>(null);
  const [coverResults, setCoverResults] = useState<Record<string, { links: string[]; index: number }>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [meUsername, setMeUsername] = useState<string | null>(null);
  const [pendingDeleteBook, setPendingDeleteBook] = useState<Book | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setMeId(uid);
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
        setMeUsername((p as any)?.username ?? null);
      }
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => (b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.uploader_username?.toLowerCase().includes(q)));
  }, [books, query]);

  async function addBook(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { window.location.href = "/login"; return; }
    const { data, error } = await supabase
      .from("books")
      .insert({ title, author, user_id: userRes.user.id })
      .select("id, title, author, cover_url, user_id")
      .single();
    setAdding(false);
    if (error) { alert(error.message); return; }
    const created = data as Book;
    setBooks((prev) => [{ ...created, uploader_username: meUsername ?? null }, ...prev]);
    setTitle("");
    setAuthor("");
  }

  async function tryUploadToStorage(book: Book, imageUrl: string): Promise<string | null> {
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

  async function applyCoverLink(book: Book, link: string) {
    // Try to self-host; if blocked by CORS, fall back to external link
    const hosted = await tryUploadToStorage(book, link);
    const finalUrl = hosted || link;
    const { error } = await supabase.from("books").update({ cover_url: finalUrl }).eq("id", book.id);
    if (!error) setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, cover_url: finalUrl } : b)));
  }

  async function autoFetchCover(book: Book) {
    setLoadingCoverFor(book.id);
    let state = coverResults[book.id];
    if (!state || !state.links || state.links.length === 0) {
      const links = await searchCoverLinks({ title: book.title, author: book.author });
      state = { links, index: 0 };
      setCoverResults((prev) => ({ ...prev, [book.id]: state! }));
    }
    const link = state.links?.[state.index];
    if (link) await applyCoverLink(book, link);
    setLoadingCoverFor(null);
    setMenuOpenFor(null);
  }

  async function nextCover(book: Book) {
    setLoadingCoverFor(book.id);
    let state = coverResults[book.id];
    if (!state || !state.links || state.links.length === 0) {
      const links = await searchCoverLinks({ title: book.title, author: book.author });
      state = { links, index: 0 };
    } else {
      state = { ...state, index: (state.index + 1) % state.links.length };
    }
    setCoverResults((prev) => ({ ...prev, [book.id]: state! }));
    const link = state.links?.[state.index];
    if (link) await applyCoverLink(book, link);
    setLoadingCoverFor(null);
    setMenuOpenFor(null);
  }

  async function onUploadCover(e: React.ChangeEvent<HTMLInputElement>, book: Book) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const path = `manual/${book.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
    if (upErr) { alert(upErr.message); return; }
    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    const url = data.publicUrl;
    const { error } = await supabase.from("books").update({ cover_url: url }).eq("id", book.id);
    if (!error) setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, cover_url: url } : b));
    setMenuOpenFor(null);
  }

  const canDelete = (b: Book) => {
    return (meId && meId === b.user_id) || (meUsername === "jerryjiang063");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索书名/作者/上传者" className="flex-1 rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
        <form onSubmit={addBook} className="flex gap-2 flex-1 sm:flex-none">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="书名" className="flex-1 rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者" className="flex-1 rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" />
          <button disabled={adding} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity">{adding ? "添加中..." : "添加"}</button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.map((b) => (
          <div key={b.id} className="relative rounded-lg border border-black/10 dark:border-white/20 overflow-visible hover:shadow-lg transition-shadow">
            <Link href={`/books/${b.id}`}>
              <BookCover title={b.title} coverUrl={b.cover_url ?? undefined} size="large" />
            </Link>
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="text-black dark:text-white">
                <div className="font-medium truncate" title={b.title}>{b.title}</div>
                <div className="text-sm text-black/60 dark:text-white/60 truncate" title={b.author ?? undefined}>{b.author}</div>
                <div className="text-xs text-black/50 dark:text-white/50 truncate">
                  上传者：{b.uploader_username ? (
                    <Link className="hover:underline" href={`/${b.uploader_username}`}>@{b.uploader_username}</Link>
                  ) : (
                    <span>用户</span>
                  )}
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                {canDelete(b) && (
                  <button onClick={() => setPendingDeleteBook(b)} className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-600 hover:bg-red-500/10">删除</button>
                )}
                <button onClick={() => setMenuOpenFor(menuOpenFor === b.id ? null : b.id)} className="px-2 py-1 text-xs rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white">封面</button>
                {menuOpenFor === b.id && (
                  <div className="absolute right-0 mt-1 w-44 rounded-md border border-black/10 dark:border-white/10 bg-[color:var(--background)] shadow-lg p-1 text-sm z-30">
                    <button disabled={loadingCoverFor === b.id} onClick={() => autoFetchCover(b)} className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60">{loadingCoverFor === b.id ? "获取中..." : "自动获取封面"}</button>
                    <button disabled={loadingCoverFor === b.id} onClick={() => nextCover(b)} className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60">换一张</button>
                    <label className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 block cursor-pointer">
                      上传封面
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onUploadCover(e, b)} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteBook}
        title="删除书本"
        description={pendingDeleteBook ? `此操作不可恢复，确定要删除《${pendingDeleteBook.title}》及其笔记吗？` : undefined}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onCancel={() => setPendingDeleteBook(null)}
        onConfirm={async () => {
          const id = pendingDeleteBook!.id;
          setPendingDeleteBook(null);
          const { error } = await supabase.from("books").delete().eq("id", id);
          if (error) { alert(error.message); return; }
          setBooks((prev) => prev.filter((x) => x.id !== id));
        }}
      />
    </div>
  );
} 