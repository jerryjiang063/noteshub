"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Preview = { username: string; bookTitle: string; quote: string; bookId: string } | null;

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>(null);

  useEffect(() => {
    fetch("/api/recommend/random").then(r => r.json()).then((d) => {
      if (d?.note) setPreview(d.note);
    }).catch(() => {});
  }, []);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = "/books";
  }

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    alert("注册成功，请查收邮箱进行验证（如已开启）。");
  }

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-2xl border border-black/10 dark:border-white/10">
      <h1 className="text-xl font-semibold mb-4">登录 NotesHub</h1>
      <form className="space-y-3" onSubmit={signInWithEmail}>
        <input type="email" required placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
        <input type="password" required placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={loading} className="w-full rounded-md px-3 py-2 bg-black text-white dark:bg-white dark:text-black">{loading ? "处理中..." : "登录"}</button>
      </form>
      <button onClick={signUpWithEmail} className="w-full mt-2 rounded-md px-3 py-2 bg-black/80 text-white dark:bg-white/80 dark:text-black">注册</button>
      <div className="h-[1px] bg-black/10 dark:bg-white/10 my-4" />
      <button onClick={signInWithGoogle} className="w-full rounded-md px-3 py-2 bg-[#4285F4] text-white">使用 Google 登录</button>

      {preview && (
        <div className="mt-10 p-5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
          <div className="text-2xl md:text-3xl leading-relaxed opacity-90 italic" style={{ fontFamily: "FangZhengXiaoBiaoSong, Georgia, serif" }}>
            “{preview.quote}”
          </div>
          <div className="mt-3 text-xs text-black/60 dark:text-white/60">
            @{preview.username} · {preview.bookTitle}
          </div>
        </div>
      )}
    </div>
  );
} 