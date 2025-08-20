import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ENABLED = (process.env.COVERS_ENABLED ?? "1") !== "0";
const COOLDOWN_OK_MIN = Number(process.env.COVERS_OK_TTL_MIN ?? 24 * 60); // 24h
const COOLDOWN_FAIL_MIN = Number(process.env.COVERS_FAIL_TTL_MIN ?? 6 * 60); // 6h

function normalizeTitle(input: string) {
	return input
		.toLowerCase()
		.replace(/[\p{P}\p{S}]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function minutesSince(ts: string | null | undefined): number {
	if (!ts) return Infinity;
	const diffMs = Date.now() - new Date(ts).getTime();
	return diffMs / 60000;
}

function extractFirstGoogleImage(html: string): string | null {
	// Prefer data-iurl or src from <img>
	const dataUrl = html.match(/data-iurl=\"(https?:[^\"]+)\"/i);
	if (dataUrl) return dataUrl[1];
	const imgSrc = html.match(/<img[^>]+src=\"(https?:[^\"]+)\"/i);
	if (imgSrc) return imgSrc[1];
	return null;
}

export async function GET(req: NextRequest) {
	if (!ENABLED) return NextResponse.json({ ok: false, disabled: true }, { status: 503 });
	const supabase = await createSupabaseServerClient();
	const { searchParams } = new URL(req.url);
	const title = (searchParams.get("title") ?? "").trim();
	if (!title) return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });

	const titleNorm = normalizeTitle(title);

	// 1) Check cache
	const { data: cached } = await supabase
		.from("cover_cache")
		.select("title_norm, source_url, storage_path, status, updated_at")
		.eq("title_norm", titleNorm)
		.maybeSingle();

	if (cached) {
		const ageMin = minutesSince(cached.updated_at as any);
		if (cached.status === "ok" && ageMin < COOLDOWN_OK_MIN && cached.storage_path) {
			const { data } = supabase.storage.from("covers").getPublicUrl(cached.storage_path);
			return NextResponse.json({ ok: true, cover: data.publicUrl, cached: true });
		}
		if (cached.status === "fail" && ageMin < COOLDOWN_FAIL_MIN) {
			return NextResponse.json({ ok: false, cached: true, cooldown: true }, { status: 429 });
		}
	}

	// 2) Google Images search
	let imageUrl: string | null = null;
	const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(titleNorm)}`;
	try {
		const resp = await fetch(searchUrl, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
				accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
				referer: "https://www.google.com/",
			},
		});
		if (!resp.ok) throw new Error(`google ${resp.status}`);
		const html = await resp.text();
		imageUrl = extractFirstGoogleImage(html);
	} catch (e) {
		await supabase.from("cover_cache").upsert({
			title_norm: titleNorm,
			status: "fail",
			updated_at: new Date().toISOString(),
		});
		return NextResponse.json({ ok: false, error: "search_failed" }, { status: 502 });
	}

	if (!imageUrl) {
		await supabase.from("cover_cache").upsert({
			title_norm: titleNorm,
			source_url: searchUrl,
			status: "fail",
			updated_at: new Date().toISOString(),
		});
		return NextResponse.json({ ok: false, error: "no_image" }, { status: 404 });
	}

	// 3) Download image and upload to Storage
	try {
		const imgResp = await fetch(imageUrl, { headers: { "user-agent": "Mozilla/5.0" } });
		if (!imgResp.ok) throw new Error(`img ${imgResp.status}`);
		const contentType = imgResp.headers.get("content-type") || "image/jpeg";
		const ab = await imgResp.arrayBuffer();
		const buffer = Buffer.from(ab);
		const path = `google/${encodeURIComponent(titleNorm)}/${Date.now()}`;
		const { error: upErr } = await supabase.storage.from("covers").upload(path, buffer, { contentType, upsert: true });
		if (upErr) throw upErr;
		const { data } = supabase.storage.from("covers").getPublicUrl(path);
		await supabase.from("cover_cache").upsert({
			title_norm: titleNorm,
			source_url: imageUrl,
			storage_path: path,
			status: "ok",
			updated_at: new Date().toISOString(),
		});
		return NextResponse.json({ ok: true, cover: data.publicUrl, cached: false });
	} catch (e) {
		await supabase.from("cover_cache").upsert({
			title_norm: titleNorm,
			source_url: imageUrl,
			status: "fail",
			updated_at: new Date().toISOString(),
		});
		return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 502 });
	}
} 