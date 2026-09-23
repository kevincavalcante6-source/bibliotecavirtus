import { BUCKET_ORIGINALS, BUCKET_THUMBNAILS, SUPABASE_URL, supabase } from "@/lib/supabase";

/**
 * Upload via XHR para termos progresso real por arquivo (o SDK não expõe
 * eventos de progresso). Usa o mesmo endpoint e o mesmo token da sessão, então
 * as políticas de storage continuam valendo — quem não é admin recebe 403.
 */
export function uploadWithProgress(
  bucket: string,
  path: string,
  body: Blob,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        reject(new Error("Sessão expirada. Entre novamente."));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      if (body.type) xhr.setRequestHeader("Content-Type", body.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(1);
          resolve();
        } else {
          let message = `Falha no upload (${xhr.status}).`;
          try {
            const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
            message = parsed.message || parsed.error || message;
          } catch {
            /* resposta sem corpo JSON */
          }
          if (xhr.status === 403) message = "Sem permissão para enviar arquivos.";
          reject(new Error(message));
        }
      };
      xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));
      xhr.onabort = () => reject(new DOMException("Upload cancelado", "AbortError"));
      signal?.addEventListener("abort", () => xhr.abort());

      xhr.send(body);
    });
  });
}

export function publicThumbnailUrl(path: string): string {
  return supabase.storage.from(BUCKET_THUMBNAILS).getPublicUrl(path).data.publicUrl;
}

/**
 * O arquivo original vive em bucket privado: a entrega é por URL assinada e
 * de curta duração, emitida para quem está autenticado.
 */
export async function signedOriginalUrl(path: string, downloadAs?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ORIGINALS)
    .createSignedUrl(path, 60, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeOriginals(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET_ORIGINALS).remove(paths);
  if (error) throw error;
}

export async function removeThumbnails(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET_THUMBNAILS).remove(paths);
  if (error) throw error;
}
