/**
 * MODO DEMONSTRAÇÃO — substitui `src/lib/supabase.ts` na build do artefato.
 * Nenhuma chamada de rede sai daqui.
 */

export const isConfigured = true;
export const SUPABASE_URL = "";
export const BUCKET_ORIGINALS = "content-originals";
export const BUCKET_THUMBNAILS = "content-thumbnails";

export const supabase = {} as never;

export function readableError(error: unknown, fallback = "Não foi possível completar a operação."): string {
  if (!error) return fallback;
  const message = typeof error === "string" ? error : (error as { message?: string }).message;
  return message || fallback;
}
