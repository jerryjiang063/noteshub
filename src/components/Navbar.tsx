"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
        setUsername(profile?.username ?? null);
      }
    })();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!mounted) return null;

  return (
    <div className="w-full border-b border-black/10 dark:border-white/10 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight text-black dark:text-white hover:opacity-90">NotesHub</Link>
          <Link href="/books" className="text-sm text-black dark:text-white hover:opacity-90">书库</Link>
          {username && (
            <Link href={`/${username}`} className="text-sm text-black dark:text-white hover:opacity-90">我的主页</Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {email ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-black/80 dark:text-white/80 hidden sm:inline">{email}</span>
              <button onClick={signOut} className="px-2 py-1 rounded-md text-sm bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20">退出</button>
            </div>
          ) : (
            <Link href="/login" className="px-2 py-1 rounded-md text-sm bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20">登录</Link>
          )}
        </div>
      </div>
    </div>
  );
} 