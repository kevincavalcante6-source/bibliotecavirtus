/** SHA-256 do arquivo — usado para impedir que o mesmo arquivo entre duas vezes. */
export async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ImageSize {
  width: number;
  height: number;
}

export function readImageSize(file: File): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido."));
    };
    img.src = url;
  });
}

/**
 * Gera a prévia leve usada nas listagens. O arquivo original nunca é tocado:
 * ele sobe íntegro para o bucket privado.
 */
export async function makeThumbnail(file: File, maxEdge = 800): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.86),
    );
  } catch {
    return null;
  }
}

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 40 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return "Formato não suportado (use PNG, JPG ou WebP).";
  if (file.size > MAX_BYTES) return "Arquivo acima de 40 MB.";
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

/** Nome de objeto estável e sem caracteres problemáticos. */
export function objectPath(prefix: string, file: File, checksum: string): string {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${prefix}/${checksum.slice(0, 32)}.${ext}`;
}

/** O thumbnail mora no bucket público com o mesmo nome do original, em WebP. */
export function thumbnailPathFor(originalPath: string): string {
  return `${originalPath.replace(/\.[^.]+$/, "")}.webp`;
}

export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Sem título";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
