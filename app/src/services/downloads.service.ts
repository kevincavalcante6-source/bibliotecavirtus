import { supabase } from "@/lib/supabase";
import type { Content, DownloadRow } from "@/types/models";

/**
 * O registro e o incremento do contador acontecem no banco, numa função
 * SECURITY DEFINER. O cliente não tem UPDATE em content.download_count.
 */
export async function registerDownload(contentId: string): Promise<number> {
  const { data, error } = await supabase.rpc("register_download", { p_content_id: contentId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function listDownloads(userId: string): Promise<{ at: string; content: Content }[]> {
  const { data, error } = await supabase
    .from("downloads")
    .select(
      "id,user_id,content_id,created_at,content:content_id(id,title,type,file_url,thumbnail_url,width,height,file_size,mime_type,checksum,download_count,created_at,updated_at)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = (data ?? []) as unknown as DownloadRow[];
  const seen = new Set<string>();
  const result: { at: string; content: Content }[] = [];
  for (const row of rows) {
    if (!row.content || seen.has(row.content.id)) continue;
    seen.add(row.content.id);
    result.push({ at: row.created_at, content: row.content });
  }
  return result;
}

export async function countDownloads(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("downloads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
