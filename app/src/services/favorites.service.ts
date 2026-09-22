import { supabase } from "@/lib/supabase";
import type { Content, FavoriteRow } from "@/types/models";

/** Só os ids: é o que as listagens precisam para marcar o coração. */
export async function listFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("favorites").select("content_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => (row as { content_id: string }).content_id);
}

export async function listFavorites(userId: string): Promise<Content[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(
      "id,user_id,content_id,created_at,content:content_id(id,title,type,file_url,thumbnail_url,width,height,file_size,mime_type,checksum,download_count,created_at,updated_at)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as FavoriteRow[])
    .map((row) => row.content)
    .filter((item): item is Content => Boolean(item));
}

export async function addFavorite(userId: string, contentId: string): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, content_id: contentId });
  if (error && !error.message.includes("duplicate key")) throw error;
}

export async function removeFavorite(userId: string, contentId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("content_id", contentId);
  if (error) throw error;
}

export async function countFavorites(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
