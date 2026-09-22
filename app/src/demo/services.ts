import { SEED_CONTENT } from "@/demo/data";
import { makeThumbnail, readImageSize, sha256, validateImage } from "@/lib/files";
import type { AdminStats, Content, ContentType, NewContentInput, Profile } from "@/types/models";

/**
 * MODO DEMONSTRAÇÃO — implementação em memória dos serviços.
 * A build de produção usa `src/services/*`, que fala com o Supabase; estes
 * módulos só entram no bundle publicado como artefato, onde não há rede.
 */

export const PAGE_SIZE = 24;

const store = {
  content: [...SEED_CONTENT],
  favorites: new Set<string>(read("virtus.demo.favs", [] as string[])),
  downloads: read("virtus.demo.downloads", [] as { id: string; at: string }[]),
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navegação privada: o demo segue sem persistir */
  }
}

/** Latência curta só para os estados de carregando aparecerem como no real. */
const delay = (ms = 260) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ----------------------------------------------------------------- content --
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

function sorted(): Content[] {
  return [...store.content].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listContent({
  type,
  search,
  page = 0,
  pageSize = PAGE_SIZE,
}: ListParams): Promise<Page<Content>> {
  await delay();
  let rows = sorted();
  if (type) rows = rows.filter((item) => item.type === type);
  const term = search?.trim().toLowerCase();
  if (term) rows = rows.filter((item) => item.title.toLowerCase().includes(term));

  const total = rows.length;
  const items = rows.slice(page * pageSize, page * pageSize + pageSize);
  return { items, total, hasMore: (page + 1) * pageSize < total };
}

export async function getContent(id: string): Promise<Content | null> {
  await delay(160);
  return store.content.find((item) => item.id === id) ?? null;
}

export async function listRecent(limit = 6, type?: ContentType): Promise<Content[]> {
  await delay();
  const rows = type ? sorted().filter((item) => item.type === type) : sorted();
  return rows.slice(0, limit);
}

export async function listByIds(ids: string[]): Promise<Content[]> {
  await delay(120);
  return store.content.filter((item) => ids.includes(item.id));
}

export async function createContent(input: NewContentInput): Promise<Content> {
  const now = new Date().toISOString();
  const content: Content = {
    ...input,
    id: `demo-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    download_count: 0,
    created_at: now,
    updated_at: now,
  };
  store.content.unshift(content);
  return content;
}

export async function findExistingChecksums(checksums: string[]): Promise<Set<string>> {
  const existing = new Set(store.content.map((item) => item.checksum).filter(Boolean) as string[]);
  return new Set(checksums.filter((value) => existing.has(value)));
}

export async function deleteContent(id: string): Promise<void> {
  store.content = store.content.filter((item) => item.id !== id);
}

// --------------------------------------------------------------- favorites --
export async function listFavoriteIds(): Promise<string[]> {
  await delay(120);
  return [...store.favorites];
}

export async function listFavorites(): Promise<Content[]> {
  await delay();
  return sorted().filter((item) => store.favorites.has(item.id));
}

export async function addFavorite(_userId: string, contentId: string): Promise<void> {
  store.favorites.add(contentId);
  write("virtus.demo.favs", [...store.favorites]);
}

export async function removeFavorite(_userId: string, contentId: string): Promise<void> {
  store.favorites.delete(contentId);
  write("virtus.demo.favs", [...store.favorites]);
}

export async function countFavorites(): Promise<number> {
  return store.favorites.size;
}

// --------------------------------------------------------------- downloads --
export async function registerDownload(contentId: string): Promise<number> {
  const item = store.content.find((entry) => entry.id === contentId);
  if (!item) throw new Error("Conteúdo não encontrado.");
  item.download_count += 1;
  store.downloads = [
    { id: contentId, at: new Date().toISOString() },
    ...store.downloads.filter((entry) => entry.id !== contentId),
  ];
  write("virtus.demo.downloads", store.downloads);
  return item.download_count;
}

export async function listDownloads(): Promise<{ at: string; content: Content }[]> {
  await delay();
  return store.downloads
    .map((entry) => {
      const content = store.content.find((item) => item.id === entry.id);
      return content ? { at: entry.at, content } : null;
    })
    .filter((entry): entry is { at: string; content: Content } => entry !== null);
}

export async function countDownloads(): Promise<number> {
  return store.downloads.length;
}

// ----------------------------------------------------------------- storage --
export async function uploadWithProgress(
  _bucket: string,
  _path: string,
  body: Blob,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  // Progresso proporcional ao tamanho real do arquivo, para a fila se comportar
  // como na aplicação conectada.
  const steps = 12;
  const pace = Math.min(40, Math.max(8, body.size / 400_000));
  for (let step = 1; step <= steps; step += 1) {
    await delay(pace);
    onProgress?.(step / steps);
  }
}

export function publicThumbnailUrl(path: string): string {
  return path;
}

export async function signedOriginalUrl(path: string): Promise<string> {
  return path;
}

export async function removeOriginals(): Promise<void> {}

// ---------------------------------------------------------------- profiles --
const DEMO_PROFILE: Profile = {
  id: "demo-user",
  email: "voce@virtusmind.com",
  display_name: "Visitante Virtus",
  avatar_url: null,
  role: "admin",
  created_at: new Date(Date.now() - 42 * 86_400_000).toISOString(),
};

export async function getProfile(): Promise<Profile> {
  return { ...DEMO_PROFILE, display_name: read("virtus.demo.name", DEMO_PROFILE.display_name) };
}

export async function updateDisplayName(_userId: string, displayName: string): Promise<Profile> {
  write("virtus.demo.name", displayName);
  return { ...DEMO_PROFILE, display_name: displayName };
}

// ------------------------------------------------------------------- admin --
export async function fetchAdminStats(): Promise<AdminStats> {
  await delay();
  const byDownloads = [...store.content].sort((a, b) => b.download_count - a.download_count);
  return {
    wallpapers: store.content.filter((item) => item.type === "wallpaper").length,
    widgets: store.content.filter((item) => item.type === "widget").length,
    users: 1,
    downloads: store.content.reduce((sum, item) => sum + item.download_count, 0),
    favorites: store.favorites.size,
    most_downloaded: byDownloads.slice(0, 8).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      thumbnail_url: item.thumbnail_url,
      download_count: item.download_count,
    })),
    most_favorited: sorted()
      .filter((item) => store.favorites.has(item.id))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        thumbnail_url: item.thumbnail_url,
        favorite_count: 1,
      })),
    recent: sorted()
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        thumbnail_url: item.thumbnail_url,
        created_at: item.created_at,
      })),
  };
}

// ------------------------------------------------------------------ upload --
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
}

/**
 * O caminho do arquivo é o mesmo da produção — validação, SHA-256, dimensões e
 * geração de prévia acontecem de verdade no navegador. Só o destino muda: em
 * vez de subir para o storage, o conteúdo fica nesta sessão.
 */
export async function uploadContentFile({
  file,
  title,
  type,
  onProgress,
}: UploadParams): Promise<Content> {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);

  const checksum = await sha256(file);
  onProgress?.(0.08);
  if (store.content.some((item) => item.checksum === checksum)) throw new DuplicateError();

  const size = await readImageSize(file).catch(() => null);
  const thumbnail = await makeThumbnail(file);
  onProgress?.(0.14);

  await uploadWithProgress("demo", "demo", file, (ratio) => onProgress?.(0.14 + ratio * 0.8));

  const url = URL.createObjectURL(thumbnail ?? file);
  const content = await createContent({
    title: title.trim(),
    type,
    file_url: url,
    thumbnail_url: url,
    width: size?.width ?? null,
    height: size?.height ?? null,
    file_size: file.size,
    mime_type: file.type,
    checksum,
  });
  onProgress?.(1);
  return content;
}
