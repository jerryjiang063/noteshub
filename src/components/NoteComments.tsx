"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";

type Comment = { id: string; content: string; user_id: string; created_at: string; username?: string };

type ProfileRow = { id: string; username: string };

export default function NoteComments({ noteId }: { noteId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [list, setList] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [meUsername, setMeUsername] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);

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

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notes_comments")
      .select("id, content, user_id, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });
    const userIds = Array.from(new Set((data ?? []).map((c) => c.user_id)));
    const nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username").in("id", userIds);
      (ps as ProfileRow[] | null)?.forEach((p) => nameMap.set(String(p.id), String(p.username)));
    }
    setList((data ?? []).map((c) => ({ ...c, username: nameMap.get(c.user_id) })) as Comment[]);
  }, [noteId, supabase]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function submit() {
    const text = input.trim();
    if (!text) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    const { error } = await supabase.from("notes_comments").insert({ note_id: noteId, user_id: userId, content: text });
    if (error) {
      alert(error.message);
      return;
    }
    setInput("");
    load();
  }

  const canDelete = (c: Comment) => {
    return (meId && meId === c.user_id) || meUsername === "jerryjiang063";
  };

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-black/60 dark:text-white/60">
        {open ? "收起评论" : "展开评论"}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="写下你的评论..." className="flex-1 rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
            <button onClick={submit} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">发送</button>
          </div>
          <div className="space-y-2">
            {list.map((c) => (
              <div key={c.id} className="rounded-md border border-black/10 dark:border-white/10 p-2 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-xs text-black/60 dark:text-white/60">@{c.username ?? c.user_id} · {new Date(c.created_at).toLocaleString()}</div>
                  {canDelete(c) && (
                    <button onClick={() => setPendingDelete(c)} className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-600 hover:bg-red-500/10">删除</button>
                  )}
                </div>
                <div>{c.content}</div>
              </div>
            ))}
            {list.length === 0 && <div className="text-xs text-black/50 dark:text-white/50">还没有评论</div>}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title="删除评论"
        description="此操作不可恢复，确定要删除该评论吗？"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const id = pendingDelete!.id;
          setPendingDelete(null);
          const { error } = await supabase.from("notes_comments").delete().eq("id", id);
          if (error) { alert(error.message); return; }
          load();
        }}
      />
    </div>
  );
} 