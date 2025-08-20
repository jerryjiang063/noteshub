import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BooksJoin = { id: string; title: string; user_id: string } | { id: string; title: string; user_id: string }[] | null;

type NoteRow = { id: string; content_html: string; books: BooksJoin };

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: latest } = await supabase
    .from("notes")
    .select("id, content_html, book_id, books:book_id ( id, title, user_id )")
    .order("updated_at", { ascending: false })
    .limit(50);
  const rows: NoteRow[] = (latest as unknown as NoteRow[]) ?? [];
  if (rows.length === 0) return NextResponse.json({ note: null });

  const pick = rows[Math.floor(Math.random() * rows.length)];
  const booksJoin = pick.books;
  const book = Array.isArray(booksJoin) ? booksJoin[0] : booksJoin;

  let username = "用户";
  if (book?.user_id) {
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", book.user_id).maybeSingle();
    username = profile?.username ?? username;
  }

  return NextResponse.json({
    note: {
      id: pick.id,
      bookId: book?.id,
      bookTitle: book?.title,
      username,
      quote: extractSentence(pick.content_html),
    },
  });
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
    return arr[Math.floor(Math.random() * arr.length)].slice(0, 140);
  } catch {
    return "...";
  }
} 