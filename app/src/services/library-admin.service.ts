import { supabase } from "@/lib/supabase";
import { thumbnailPathFor } from "@/lib/files";
import { CONTENT_COLUMNS, deleteContent } from "@/services/content.service";
import { removeOriginals, removeThumbnails } from "@/services/storage.service";
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
