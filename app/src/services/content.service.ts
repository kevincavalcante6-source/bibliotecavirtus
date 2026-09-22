import { supabase } from "@/lib/supabase";
import type { Content, ContentType, NewContentInput } from "@/types/models";

export const PAGE_SIZE = 24;

const COLUMNS =
  "id,title,type,file_url,thumbnail_url,width,height,file_size,mime_type,checksum,download_count,created_at,updated_at";

export interface ListParams {
  type?: ContentType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/** Listagem paginada por range — o cliente nunca baixa a tabela inteira. */
export async function listContent({
  type,
  search,
  page = 0,
  pageSize = PAGE_SIZE,
}: ListParams): Promise<Page<Content>> {
  let query = supabase
    .from("content")
    .select(COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (type) query = query.eq("type", type);
  const term = search?.trim();
  if (term) query = query.ilike("title", `%${term}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []) as Content[];
  const total = count ?? items.length;
  return { items, total, hasMore: (page + 1) * pageSize < total };
}

export async function getContent(id: string): Promise<Content | null> {
  const { data, error } = await supabase.from("content").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Content) ?? null;
}

/** Recém-adicionados: sempre derivado de created_at, nunca de lista manual. */
export async function listRecent(limit = 6): Promise<Content[]> {
  const { data, error } = await supabase
    .from("content")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Content[];
}

export async function listByIds(ids: string[]): Promise<Content[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("content").select(COLUMNS).in("id", ids);
  if (error) throw error;
  return (data ?? []) as Content[];
}

export async function createContent(input: NewContentInput): Promise<Content> {
  const { data, error } = await supabase.from("content").insert(input).select(COLUMNS).single();
  if (error) throw error;
  return data as Content;
}

/** Checagem de duplicidade antes do upload (o índice único é a garantia final). */
export async function findExistingChecksums(checksums: string[]): Promise<Set<string>> {
  if (checksums.length === 0) return new Set();
  const { data, error } = await supabase.from("content").select("checksum").in("checksum", checksums);
  if (error) throw error;
  return new Set((data ?? []).map((row) => (row as { checksum: string }).checksum));
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase.from("content").delete().eq("id", id);
  if (error) throw error;
}
