import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type NoteRow = { id: string; content_html: string; updated_at: string; books: { id: string; title: string; user_id: string } };

type ProfileRow = { id: string; username: string };

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("notes")
    .select("id, content_html, updated_at, books:book_id ( id, title, user_id )")
    .order("updated_at", { ascending: false })
    .limit(12);

  const notes: NoteRow[] = (rows as unknown as NoteRow[] | null)?.filter((n) => n?.books?.id) ?? [];

  const userIds = Array.from(new Set(notes.map((n) => n.books.user_id).filter(Boolean)));
  const usernameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    (profiles as ProfileRow[] | null)?.forEach((p) => usernameById.set(String(p.id), String(p.username)));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-black dark:text-white">推荐笔记</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((n) => (
          <Link key={n.id} href={`/books/${n.books.id}`} className="group rounded-xl border border-black/10 dark:border-white/20 p-4 hover:shadow-lg transition-shadow">
            <div className="text-sm text-black/60 dark:text-white mb-2">
              <span>@{usernameById.get(n.books.user_id) ?? "用户"}</span>
              <span className="mx-2">·</span>
              <span className="truncate inline-block max-w-[60%] align-bottom">{n.books.title}</span>
            </div>
            <div className="text-base opacity-80 italic text-black dark:text-white">“{extractSentence(n.content_html)}”</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function extractSentence(html: string): string {
  try {
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
    const arr = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (arr.length === 0) return "...";
    return arr[0].slice(0, 120);
  } catch {
    return "...";
  }
}
