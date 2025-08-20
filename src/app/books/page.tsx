export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import BooksClient from "./pageClient";

export default async function BooksPage() {
	const supabase = await createSupabaseServerClient();

	const { data: booksRows } = await supabase
		.from("books")
		.select("id, title, author, cover_url, user_id")
		.order("created_at", { ascending: false });

	const books = (booksRows ?? []) as { id: string; title: string; author: string | null; cover_url: string | null; user_id: string }[];
	const userIds = Array.from(new Set(books.map((b) => b.user_id)));
	const usernameMap = new Map<string, string>();
	if (userIds.length > 0) {
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, username")
			.in("id", userIds);
		(profiles ?? []).forEach((p: any) => usernameMap.set(String(p.id), String(p.username)));
	}

	const enriched = books.map((b) => ({ ...b, uploader_username: usernameMap.get(b.user_id) ?? null }));
	return <BooksClient initialBooks={enriched as any} />;
} 