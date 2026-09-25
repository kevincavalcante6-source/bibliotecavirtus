import { BUCKET_ORIGINALS, BUCKET_THUMBNAILS } from "@/lib/supabase";
import { makeThumbnail, objectPath, optimizeOriginal, readImageSize, sha256, thumbnailPathFor, validateImage } from "@/lib/files";
import { createContent, findExistingChecksums } from "@/services/content.service";
import { publicThumbnailUrl, uploadWithProgress } from "@/services/storage.service";
import type { Content, ContentType } from "@/types/models";

export class DuplicateError extends Error {
  constructor() {
    super("Este arquivo já está na biblioteca.");
    this.name = "DuplicateError";
  }
}

export interface UploadParams {
  file: File;
  title: string;
  type: ContentType;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

/**
 * Pipeline de um conteúdo, usado tanto pelo envio individual quanto pela fila:
 * hash → duplicidade → dimensões → thumbnail → original → registro.
 *
 * A resolução do original nunca muda. Arquivos pesados (PNG de foto, JPG em
 * qualidade máxima) viram JPG de alta qualidade na mesma resolução — ocupam
 * uma fração do espaço e do tráfego; com transparência, sobem como vieram.
 * A duplicidade é checada pelo arquivo recebido, antes de otimizar: o mesmo
 * PNG enviado de novo é reconhecido.
 */
export async function uploadContentFile({
  file,
  title,
  type,
  onProgress,
  signal,
}: UploadParams): Promise<Content> {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);

  const checksum = await sha256(file);
  onProgress?.(0.08);

  const existing = await findExistingChecksums([checksum]);
  if (existing.has(checksum)) throw new DuplicateError();

  const size = await readImageSize(file).catch(() => null);
  const thumbnail = await makeThumbnail(file);
  const { file: stored } = await optimizeOriginal(file);
  onProgress?.(0.14);

  const originalPath = objectPath(type === "widget" ? "widgets" : "wallpapers", stored, checksum);
  await uploadWithProgress(
    BUCKET_ORIGINALS,
    originalPath,
    stored,
    (ratio) => onProgress?.(0.14 + ratio * 0.72),
    signal,
  );

  let thumbnailUrl: string | null = null;
  if (thumbnail) {
    const thumbPath = thumbnailPathFor(originalPath);
    await uploadWithProgress(BUCKET_THUMBNAILS, thumbPath, thumbnail, undefined, signal);
    thumbnailUrl = publicThumbnailUrl(thumbPath);
  }
  onProgress?.(0.94);

  try {
    const content = await createContent({
      title: title.trim(),
      type,
      file_url: originalPath,
      thumbnail_url: thumbnailUrl,
      width: size?.width ?? null,
      height: size?.height ?? null,
      file_size: stored.size,
      mime_type: stored.type,
      checksum,
    });
    onProgress?.(1);
    return content;
  } catch (error) {
    // O índice único é a última linha de defesa contra duplicidade.
    if ((error as { message?: string }).message?.includes("duplicate key")) throw new DuplicateError();
    throw error;
  }
}
