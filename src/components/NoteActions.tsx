"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Heart, Star, MessageCircle } from "lucide-react";

export default function NoteActions({ noteId }: { noteId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [liked, setLiked] = useState(false);
  const [fav, setFav] = useState(false);
  const [likes, setLikes] = useState(0);
  const [favs, setFavs] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  async function loadState() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    const [{ count: likesCount }, { count: favsCount }, { count: cmtsCount }] = await Promise.all([
      supabase.from("notes_likes").select("*", { count: "exact", head: true }).eq("note_id", noteId),
      supabase.from("notes_favorites").select("*", { count: "exact", head: true }).eq("note_id", noteId),
      supabase.from("notes_comments").select("*", { count: "exact", head: true }).eq("note_id", noteId),
    ]);
    setLikes(likesCount || 0);
    setFavs(favsCount || 0);
    setCommentsCount(cmtsCount || 0);
    if (userId) {
      const [{ data: meLike }, { data: meFav }] = await Promise.all([
        supabase.from("notes_likes").select("note_id").eq("note_id", noteId).eq("user_id", userId),
        supabase.from("notes_favorites").select("note_id").eq("note_id", noteId).eq("user_id", userId),
      ]);
      setLiked(!!meLike && meLike.length > 0);
      setFav(!!meFav && meFav.length > 0);
    }
  }

  useEffect(() => {
    loadState();
  }, [noteId]);

  async function toggleLike() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) { window.location.href = "/login"; return; }
    if (liked) {
      await supabase.from("notes_likes").delete().eq("note_id", noteId).eq("user_id", userId);
      setLiked(false); setLikes((v) => Math.max(0, v - 1));
    } else {
      await supabase.from("notes_likes").insert({ note_id: noteId, user_id: userId });
      setLiked(true); setLikes((v) => v + 1);
    }
  }

  async function toggleFav() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) { window.location.href = "/login"; return; }
    if (fav) {
      await supabase.from("notes_favorites").delete().eq("note_id", noteId).eq("user_id", userId);
      setFav(false); setFavs((v) => Math.max(0, v - 1));
    } else {
      await supabase.from("notes_favorites").insert({ note_id: noteId, user_id: userId });
      setFav(true); setFavs((v) => v + 1);
    }
  }

  return (
    <div className="flex items-center gap-4 text-sm mt-2">
      <button onClick={toggleLike} className={`inline-flex items-center gap-1 ${liked ? "text-red-600 dark:text-red-400" : "text-black/70 dark:text-white/80"}`}>
        <Heart size={16} /> {likes}
      </button>
      <button onClick={toggleFav} className={`inline-flex items-center gap-1 ${fav ? "text-yellow-600 dark:text-yellow-400" : "text-black/70 dark:text-white/80"}`}>
        <Star size={16} /> {favs}
      </button>
      <div className="inline-flex items-center gap-1 text-black/70 dark:text-white/80">
        <MessageCircle size={16} /> {commentsCount}
      </div>
    </div>
  );
} 