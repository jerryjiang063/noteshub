export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NotesClient from "./pageClient";

export default async function BookNotesPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const bookId = id;

	const { data: book } = await supabase
		.from("books")
		.select("id, title, author, cover_url, user_id")
		.eq("id", bookId)
		.single();

	if (!book) redirect("/books");

	const { data: prof } = await supabase
		.from("profiles")
		.select("username")
		.eq("id", book.user_id)
		.maybeSingle();

	const { data: notes } = await supabase
		.from("notes")
		.select("id, title, content_html, font_name, font_url, created_at, updated_at")
		.eq("book_id", bookId)
		.order("updated_at", { ascending: false });

	return <NotesClient book={book} initialNotes={notes ?? []} ownerUsername={(prof as any)?.username ?? null} />;
} 