import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import BookCover from "@/components/BookCover";

export const dynamic = "force-dynamic";

export default async function UserHome({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return <div className="text-sm text-black/60 dark:text-white/60">用户不存在</div>;
  }

  const { data: me } = await supabase.auth.getUser();
  const isOwner = me.user?.id === profile.id;

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, cover_url")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-white">{username} 的书籍</h1>
        {isOwner && (
          <Link href="/books" className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm">编辑</Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {(books ?? []).map((b) => (
          <Link key={b.id} href={`/books/${b.id}`} className="rounded-lg border border-black/10 dark:border-white/20 overflow-hidden hover:shadow-sm transition-shadow">
            <BookCover title={b.title} coverUrl={b.cover_url ?? undefined} />
            <div className="p-3">
              <div className="font-medium truncate text-black dark:text-white" title={b.title}>{b.title}</div>
              <div className="text-sm text-black/60 dark:text-white/60 truncate" title={b.author ?? undefined}>{b.author}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 