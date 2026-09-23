import type { Content } from "@/types/models";

/**
 * Dados do MODO DEMONSTRAÇÃO — usados só na build publicada como artefato,
 * onde não há rede para o Supabase. A aplicação de produção nunca importa
 * este arquivo.
 */

const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const wallpaperArt = (a: string, b: string, word: string) =>
  svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1290 2796"><defs><radialGradient id="g" cx="50%" cy="8%" r="92%"><stop offset="0" stop-color="${a}"/><stop offset="55%" stop-color="${b}"/><stop offset="100%" stop-color="#060606"/></radialGradient></defs><rect width="1290" height="2796" fill="url(#g)"/><text x="645" y="1400" fill="#F5F5F0" fill-opacity="0.92" font-family="Inter,sans-serif" font-size="82" font-weight="500" letter-spacing="28" text-anchor="middle">${word}</text><rect x="545" y="1548" width="200" height="2" fill="#806B42"/></svg>`,
  );

const widgetArt = (bg: string, card: string, label: string, value: string) =>
  svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><rect x="80" y="240" width="640" height="320" rx="56" fill="${card}" stroke="rgba(255,255,255,0.10)"/><text x="140" y="362" fill="#C8A96A" font-family="Inter,sans-serif" font-size="32" letter-spacing="9">${label}</text><text x="140" y="462" fill="#F5F5F0" font-family="Inter,sans-serif" font-size="78" font-weight="600">${value}</text></svg>`,
  );

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

interface Seed {
  title: string;
  type: Content["type"];
  art: string;
  width: number;
  height: number;
  downloads: number;
  age: number;
}

const SEEDS: Seed[] = [
  { title: "Disciplina", type: "wallpaper", art: wallpaperArt("#242421", "#0C0C0B", "DISCIPLINA"), width: 1290, height: 2796, downloads: 0, age: 0 },
  { title: "Propósito", type: "wallpaper", art: wallpaperArt("#26211A", "#0A0A09", "PROPÓSITO"), width: 1290, height: 2796, downloads: 0, age: 1 },
  { title: "Origem", type: "widget", art: widgetArt("#0A0A0A", "#141412", "PROPÓSITO", "Construir"), width: 800, height: 800, downloads: 0, age: 2 },
  { title: "Fé", type: "wallpaper", art: wallpaperArt("#1F1D24", "#09090A", "FÉ"), width: 1290, height: 2796, downloads: 0, age: 3 },
  { title: "Silêncio", type: "wallpaper", art: wallpaperArt("#1B1B1A", "#0A0A09", "SILÊNCIO"), width: 1290, height: 2796, downloads: 0, age: 5 },
  { title: "Rotina", type: "widget", art: widgetArt("#0A0A0A", "#16140F", "HOJE", "Uma coisa"), width: 800, height: 800, downloads: 0, age: 6 },
  { title: "Foco", type: "wallpaper", art: wallpaperArt("#231F19", "#0B0B0A", "FOCO"), width: 1290, height: 2796, downloads: 0, age: 8 },
  { title: "Constância", type: "wallpaper", art: wallpaperArt("#1E1E1C", "#0A0A09", "CONSTÂNCIA"), width: 1290, height: 2796, downloads: 0, age: 10 },
  { title: "Norte", type: "wallpaper", art: wallpaperArt("#20201D", "#090909", "NORTE"), width: 1290, height: 2796, downloads: 0, age: 12 },
  { title: "Ordem", type: "wallpaper", art: wallpaperArt("#1C1B18", "#0A0A09", "ORDEM"), width: 1290, height: 2796, downloads: 0, age: 14 },
  { title: "Amanhecer", type: "wallpaper", art: wallpaperArt("#2A231A", "#0B0A09", "AMANHECER"), width: 1290, height: 2796, downloads: 0, age: 16 },
  { title: "Virtus", type: "wallpaper", art: wallpaperArt("#222220", "#0A0A09", "VIRTUS"), width: 1290, height: 2796, downloads: 0, age: 18 },
];

export const SEED_CONTENT: Content[] = SEEDS.map((seed, index) => ({
  id: `demo-${index + 1}`,
  title: seed.title,
  type: seed.type,
  file_url: seed.art,
  thumbnail_url: seed.art,
  width: seed.width,
  height: seed.height,
  file_size: 2_300_000 + index * 190_000,
  mime_type: "image/png",
  checksum: `seed-${index + 1}`,
  download_count: seed.downloads,
  created_at: daysAgo(seed.age),
  updated_at: daysAgo(seed.age),
}));
