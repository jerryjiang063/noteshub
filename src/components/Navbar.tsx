"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
        const name = profile?.username ?? null;
        setUsername(name);
        // show tip if username missing or looks default-like
        const looksDefault = !name || /^user[_-]?\w{6,}$/.test(name);
        if (looksDefault) setShowTip(true);
      }
    })();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const myHomeHref = useMemo(() => (username ? `/${username}` : "/settings"), [username]);

  if (!mounted) return null;

  return (
    <div className="w-full border-b border-black/10 dark:border-white/10 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight text-black dark:text-white hover:opacity-90">NotesHub</Link>
          <Link href="/books" className="text-sm text-black dark:text-white hover:opacity-90">书库</Link>
          <Link href={email ? myHomeHref : "/login"} className="text-sm text-black dark:text-white hover:opacity-90">我的主页</Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {email ? (
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => (window.location.href = "/settings")} className="text-black/80 dark:text-white/80 hover:underline hidden sm:inline" title="前往设置">
                {email}
              </button>
              <button onClick={signOut} className="px-2 py-1 rounded-md text-sm bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20">退出</button>
            </div>
          ) : (
            <Link href="/login" className="px-2 py-1 rounded-md text-sm bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20">登录</Link>
          )}
        </div>
      </div>

      {showTip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTip(false)}>
          <div className="bg-[color:var(--background)] rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold text-black dark:text-white mb-2">提示</div>
            <div className="text-sm text-black/70 dark:text-white/70 mb-4">
              建议完善个人资料。你可以在
              <Link href={myHomeHref} className="mx-1 underline">自己的主页</Link>
              更改用户名等信息。
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTip(false)} className="px-3 py-2 rounded-md bg-black/5 dark:bg-white/10">稍后</button>
              <button onClick={() => (window.location.href = "/settings")} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">去设置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 