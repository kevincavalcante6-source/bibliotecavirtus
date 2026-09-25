import { supabase } from "@/lib/supabase";
import { OPTIMIZED_SUFFIX, optimizeOriginal, thumbnailPathFor } from "@/lib/files";
import type { OptimizeOutcome } from "@/lib/files";
import { CONTENT_COLUMNS, deleteContent } from "@/services/content.service";
import { BUCKET_ORIGINALS } from "@/lib/supabase";
import { removeOriginals, removeThumbnails, signedOriginalUrl, uploadWithProgress } from "@/services/storage.service";
import type { Content, ContentType } from "@/types/models";

/**
 * Operações de manutenção do acervo. Todas passam pelas políticas de admin no
 * banco e no storage: um usuário comum recebe recusa mesmo chamando direto.
 */

export interface ContentChanges {
  title: string;
  type: ContentType;
}

export async function updateContent(id: string, changes: ContentChanges): Promise<Content> {
  const { data, error } = await supabase
    .from("content")
    .update({ title: changes.title.trim(), type: changes.type })
    .eq("id", id)
    .select(CONTENT_COLUMNS)
    .single();
  if (error) throw error;
  return data as Content;
}

/**
 * Apaga o registro primeiro e os arquivos depois. Nessa ordem, o pior caso é
 * um arquivo órfão no storage — nunca um conteúdo na biblioteca apontando para
 * um arquivo que já não existe. Favoritos e histórico caem junto por cascata.
 */
export async function deleteContentAndFiles(content: Content): Promise<{ filesRemoved: boolean }> {
  await deleteContent(content.id);

  try {
    await removeOriginals([content.file_url]);
    await removeThumbnails([thumbnailPathFor(content.file_url)]);
    return { filesRemoved: true };
  } catch {
    return { filesRemoved: false };
  }
}

/** Acima disso o original vale ser otimizado (ver optimizeOriginal). */
export const HEAVY_BYTES = 1.5 * 1024 * 1024;

/** Conteúdos com original pesado — candidatos à otimização. */
export async function listHeavyContent(): Promise<Content[]> {
  const { data, error } = await supabase
    .from("content")
    .select(CONTENT_COLUMNS)
    .gt("file_size", HEAVY_BYTES)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Content[];
}

export interface ReoptimizeResult {
  content: Content;
  before: number;
  after: number;
  outcome: OptimizeOutcome;
}

/**
 * Troca o original publicado por uma versão otimizada, na mesma resolução.
 * Ordem segura: sobe o novo → aponta o conteúdo para ele → apaga o antigo.
 * Se algo falhar no meio, o conteúdo continua apontando para um arquivo que
 * existe. Título, data, favoritos e contagem de downloads não mudam.
 */
export async function reoptimizeContent(content: Content): Promise<ReoptimizeResult> {
  const before = content.file_size ?? 0;
  const url = await signedOriginalUrl(content.file_url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível baixar o original.");
  const blob = await response.blob();
  const name = content.file_url.split("/").pop() ?? "original";
  const source = new File([blob], name, { type: content.mime_type || blob.type });

  const { file, outcome } = await optimizeOriginal(source);
  if (outcome !== "converted") return { content, before, after: before, outcome };

  // Mesmo nome com .jpg; se já era .jpg, ganha um sufixo para não sobrescrever
  // o arquivo em uso antes de o conteúdo apontar para o novo.
  const base = content.file_url.replace(/\.[^.]+$/, "");
  const nextPath = content.file_url.endsWith(".jpg") ? `${base}${OPTIMIZED_SUFFIX}.jpg` : `${base}.jpg`;
  await uploadWithProgress(BUCKET_ORIGINALS, nextPath, file);

  const { data, error } = await supabase
    .from("content")
    .update({ file_url: nextPath, file_size: file.size, mime_type: file.type })
    .eq("id", content.id)
    .select(CONTENT_COLUMNS)
    .single();
  if (error) {
    await removeOriginals([nextPath]).catch(() => undefined);
    throw error;
  }

  await removeOriginals([content.file_url]).catch(() => undefined);
  return { content: data as Content, before, after: file.size, outcome };
}
