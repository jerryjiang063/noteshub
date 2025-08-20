import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import BookCover from "@/components/BookCover";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

export default async function UserHome({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, banner_url")
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
      <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
        <div className="relative h-40 md:h-48 bg-black/5 dark:bg-white/10">
          {profile.banner_url && (
            <Image src={profile.banner_url} alt="banner" fill sizes="100vw" style={{ objectFit: "cover" }} unoptimized referrerPolicy="no-referrer" />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-white">@{profile.username}</h1>
          {profile.bio && (
            <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{profile.bio}</ReactMarkdown>
            </div>
          )}
        </div>
        {isOwner && (
          <Link href="/settings" className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm">编辑</Link>
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