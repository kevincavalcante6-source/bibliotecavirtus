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

/** Gera a prévia leve usada nas listagens (o original fica no bucket privado). */
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

/** Qualidade do JPG otimizado: alta o bastante para não se notar na tela do celular. */
export const OPTIMIZE_QUALITY = 0.92;
/** Abaixo disso não vale mexer: o arquivo já é leve. */
const OPTIMIZE_FROM_BYTES = 1.5 * 1024 * 1024;
/** A versão otimizada só é usada se ficar ao menos 10% menor. */
const MIN_GAIN = 0.9;

export type OptimizeOutcome = "converted" | "transparent" | "already-light" | "not-smaller" | "failed";

export interface OptimizedFile {
  file: File;
  outcome: OptimizeOutcome;
}

/**
 * Converte o original para JPG de alta qualidade, na MESMA resolução, quando
 * isso economiza espaço. Arquivos com transparência (widgets recortados)
 * ficam como vieram: JPG não tem transparência. Qualquer falha devolve o
 * arquivo original — otimizar nunca impede um envio.
 */
export async function optimizeOriginal(file: File): Promise<OptimizedFile> {
  if (file.size < OPTIMIZE_FROM_BYTES) return { file, outcome: "already-light" };
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { file, outcome: "failed" };
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    if (file.type !== "image/jpeg" && hasTransparency(ctx, canvas.width, canvas.height)) {
      return { file, outcome: "transparent" };
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/jpeg", OPTIMIZE_QUALITY),
    );
    if (!blob || blob.size > file.size * MIN_GAIN) return { file, outcome: "not-smaller" };

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { file: new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified }), outcome: "converted" };
  } catch {
    return { file, outcome: "failed" };
  }
}

/** Algum pixel (quase) transparente? Lido em faixas para não pesar na memória. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const band = 256;
  for (let y = 0; y < height; y += band) {
    const rows = Math.min(band, height - y);
    const data = ctx.getImageData(0, y, width, rows).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  }
  return false;
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

/** Sufixo do original trocado por uma versão otimizada que já era JPG. */
export const OPTIMIZED_SUFFIX = "-otimizado";

/**
 * O thumbnail mora no bucket público com o mesmo nome do original, em WebP.
 * Um original otimizado depois do envio mantém o thumbnail de antes.
 */
export function thumbnailPathFor(originalPath: string): string {
  return `${originalPath.replace(/\.[^.]+$/, "").replace(/(-otimizado)+$/, "")}.webp`;
}

export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Sem título";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
