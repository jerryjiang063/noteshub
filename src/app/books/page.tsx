export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BooksClient from "./pageClient";

export default async function BooksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, cover_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <BooksClient initialBooks={books ?? []} />;
} 