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

	const { data: profile } = await supabase
		.from("profiles")
		.select("id, username, avatar_url")
		.eq("id", user.id)
		.maybeSingle();

	return (
		<SettingsClient
			initialProfile={{ id: user.id, username: profile?.username ?? "", avatar_url: (profile as any)?.avatar_url ?? null }}
		/>
	);
} 