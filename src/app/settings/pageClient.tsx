"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AvatarCropDialog from "@/components/avatar/AvatarCropDialog";
import BannerCropDialog from "@/components/avatar/BannerCropDialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Profile = { id: string; username: string; avatar_url: string | null; bio?: string | null; banner_url?: string | null };

export default function SettingsClient({ initialProfile }: { initialProfile: Profile }) {
	const supabase = createSupabaseBrowserClient();
	const [profile, setProfile] = useState<Profile>({ ...initialProfile });
	const [saving, setSaving] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement | null>(null);
	const [cropOpen, setCropOpen] = useState(false);
	const [rawImage, setRawImage] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const bannerRef = useRef<HTMLInputElement | null>(null);
	const [bannerCropOpen, setBannerCropOpen] = useState(false);
	const [rawBanner, setRawBanner] = useState<string | null>(null);
	const [uploadingBanner, setUploadingBanner] = useState(false);
	const [bioSaving, setBioSaving] = useState(false);

	useEffect(() => {
		supabase.auth.getUser().then(async ({ data }) => {
			const uid = data.user?.id ?? null;
			setUserId(uid);
			if (uid) {
				const { data: p } = await supabase.from("profiles").select("username, avatar_url, bio, banner_url").eq("id", uid).maybeSingle();
				if (p) setProfile((prev) => ({ ...prev, bio: (p as any).bio ?? null, banner_url: (p as any).banner_url ?? null }));
			}
		});
	}, [supabase]);

	async function saveUsername() {
		if (!userId) return;
		const name = profile.username.trim();
		if (!name) {
			setError("用户名不能为空");
			return;
		}
		setError(null);
		setSaving(true);
		// 可选：检测重名（排除自己）
		const { data: dup } = await supabase
			.from("profiles")
			.select("id")
			.eq("username", name);
		if ((dup ?? []).some((r: any) => r.id !== userId)) {
			setSaving(false);
			setError("该用户名已被占用");
			return;
		}
		const { error: upErr } = await supabase.from("profiles").update({ username: name }).eq("id", userId);
		setSaving(false);
		if (upErr) {
			setError(upErr.message);
			return;
		}
		// 读取最新数据刷新 UI
		const { data: p } = await supabase.from("profiles").select("username, avatar_url, bio, banner_url").eq("id", userId).maybeSingle();
		if (p) setProfile((prev) => ({ ...prev, username: (p as any).username ?? prev.username }));
		alert("用户名已更新");
	}

	function onPickAvatar() {
		fileRef.current?.click();
	}

	function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files || e.target.files.length === 0) return;
		const file = e.target.files[0];
		const reader = new FileReader();
		reader.onload = () => {
			setRawImage(reader.result as string);
			setCropOpen(true);
		};
		reader.readAsDataURL(file);
		// reset input so same file can trigger again next time
		e.currentTarget.value = "";
	}

	async function uploadAvatar(blob: Blob) {
		if (!userId) return;
		setUploading(true);
		const path = `avatars/${userId}/${Date.now()}.jpg`;
		const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
			upsert: true,
			contentType: "image/jpeg",
		});
		if (upErr) {
			setUploading(false);
			alert(upErr.message);
			return;
		}
		const { data } = supabase.storage.from("avatars").getPublicUrl(path);
		const url = data.publicUrl;
		const { error: profErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
		setUploading(false);
		if (profErr) {
			alert(profErr.message);
			return;
		}
		// 读取最新数据刷新 UI
		const { data: p } = await supabase.from("profiles").select("username, avatar_url, bio, banner_url").eq("id", userId).maybeSingle();
		setProfile((prev) => ({ ...prev, avatar_url: p?.avatar_url ?? url }));
		alert("头像已更新");
	}

	function onPickBanner() {
		bannerRef.current?.click();
	}

	function onBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files || e.target.files.length === 0) return;
		const file = e.target.files[0];
		const reader = new FileReader();
		reader.onload = () => { setRawBanner(reader.result as string); setBannerCropOpen(true); };
		reader.readAsDataURL(file);
		e.currentTarget.value = "";
	}

	async function uploadBanner(blob: Blob) {
		if (!userId) return;
		setUploadingBanner(true);
		const path = `banners/${userId}/${Date.now()}.jpg`;
		const { error: upErr } = await supabase.storage.from("banners").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
		if (upErr) { setUploadingBanner(false); alert(upErr.message); return; }
		const { data } = supabase.storage.from("banners").getPublicUrl(path);
		const url = data.publicUrl;
		const { error: profErr } = await supabase.from("profiles").update({ banner_url: url }).eq("id", userId);
		setUploadingBanner(false);
		if (profErr) { alert(profErr.message); return; }
		const { data: p } = await supabase.from("profiles").select("username, avatar_url, bio, banner_url").eq("id", userId).maybeSingle();
		setProfile((prev) => ({ ...prev, banner_url: p?.banner_url ?? url }));
		alert("横幅已更新");
	}

	async function saveBio() {
		if (!userId) return;
		setBioSaving(true);
		const { error: upErr } = await supabase.from("profiles").update({ bio: profile.bio ?? null }).eq("id", userId);
		setBioSaving(false);
		if (upErr) { alert(upErr.message); return; }
		const { data: p } = await supabase.from("profiles").select("username, avatar_url, bio, banner_url").eq("id", userId).maybeSingle();
		if (p) setProfile((prev) => ({ ...prev, bio: (p as any).bio ?? prev.bio }));
		alert("简介已更新");
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<h1 className="text-xl font-semibold text-black dark:text-white">个人主页设置</h1>

			{/* Banner */}
			<div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
				<div className="relative h-32 md:h-40 bg-black/5 dark:bg-white/10">
					{profile.banner_url && (
						<Image src={profile.banner_url} alt="banner" fill sizes="100vw" style={{ objectFit: "cover" }} unoptimized referrerPolicy="no-referrer" />
					)}
				</div>
				<div className="p-3 flex items-center justify-between">
					<div className="text-sm text-black/60 dark:text-white/60">主页横幅图</div>
					<div>
						<button onClick={onPickBanner} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-60" disabled={uploadingBanner}>
							{uploadingBanner ? "上传中..." : "更换横幅"}
						</button>
						<input ref={bannerRef} type="file" accept="image/*" onChange={onBannerFileChange} className="hidden" />
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex items-center gap-4">
				<div className="relative w-24 h-24 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
					{profile.avatar_url ? (
						<Image src={profile.avatar_url} alt="avatar" fill sizes="96px" style={{ objectFit: "cover" }} unoptimized referrerPolicy="no-referrer" />
					) : (
						<div className="w-full h-full flex items-center justify-center text-black/60 dark:text-white/60 text-sm">无头像</div>
					)}
				</div>
				<div className="space-y-2">
					<button onClick={onPickAvatar} className="px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black text-sm disabled:opacity-60" disabled={uploading}>
						{uploading ? "上传中..." : "更换头像"}
					</button>
					<input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
					<p className="text-xs text-black/50 dark:text-white/50">建议使用方形图片。支持裁剪。</p>
				</div>
			</div>

			<div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
				<label className="block text-sm text-black/60 dark:text-white/60">用户名</label>
				<input
					value={profile.username}
					onChange={(e) => setProfile({ ...profile, username: e.target.value })}
					placeholder="输入新的用户名"
					className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none"
				/>
				{error && <div className="text-sm text-red-500">{error}</div>}
				<div className="flex justify-end">
					<button onClick={saveUsername} disabled={saving} className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">
						{saving ? "保存中..." : "保存用户名"}
					</button>
				</div>
				<p className="text-xs text-black/50 dark:text-white/50">修改后，你的主页地址将变为 /{profile.username}。</p>
			</div>

			<div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
				<label className="block text-sm text-black/60 dark:text-white/60">简介</label>
				<textarea
					value={profile.bio ?? ""}
					onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
					placeholder="写点你的介绍..."
					rows={4}
					className="w-full rounded-md px-3 py-2 bg-black/5 dark:bg-white/10 outline-none"
				/>
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{profile.bio ?? ""}</ReactMarkdown>
				</div>
				<div className="flex justify-end">
					<button onClick={saveBio} disabled={bioSaving} className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">
						{bioSaving ? "保存中..." : "保存简介"}
					</button>
				</div>
			</div>

			{cropOpen && rawImage && (
				<AvatarCropDialog
					image={rawImage}
					onCancel={() => {
						setCropOpen(false);
						setRawImage(null);
					}}
					onConfirm={(blob) => {
						setCropOpen(false);
						setRawImage(null);
						uploadAvatar(blob);
					}}
				/>
			)}

			{bannerCropOpen && rawBanner && (
				<BannerCropDialog
					image={rawBanner}
					onCancel={() => { setBannerCropOpen(false); setRawBanner(null); }}
					onConfirm={(blob) => { setBannerCropOpen(false); setRawBanner(null); uploadBanner(blob); }}
				/>
			)}
		</div>
	);
} 