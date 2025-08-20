export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./pageClient";

export default async function SettingsPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	// Ensure profile row exists
	let { data: profile, error } = await supabase
		.from("profiles")
		.select("id, username, avatar_url, bio, banner_url")
		.eq("id", user.id)
		.maybeSingle();

	if (!profile) {
		const fallback = (user.email?.split("@")[0] || "user")
			.replace(/[^a-zA-Z0-9_\-]/g, "_")
			.slice(0, 16);
		const seed = (user.id || "").replace(/-/g, "").slice(0, 6);
		const defaultUsername = `${fallback || "user"}_${seed || "000000"}`;
		await supabase.from("profiles").insert({ id: user.id, username: defaultUsername }).select().maybeSingle();
		const re = await supabase
			.from("profiles")
			.select("id, username, avatar_url, bio, banner_url")
			.eq("id", user.id)
			.maybeSingle();
		profile = re.data as any;
	}

	return (
		<SettingsClient
			initialProfile={{ id: user.id, username: (profile as any)?.username ?? "", avatar_url: (profile as any)?.avatar_url ?? null, bio: (profile as any)?.bio ?? null, banner_url: (profile as any)?.banner_url ?? null }}
		/>
	);
} 