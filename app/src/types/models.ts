export type ContentType = "wallpaper" | "widget";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  /** Caminho do objeto no bucket privado content-originals. */
  file_url: string;
  /** URL pública do thumbnail (bucket content-thumbnails). */
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  checksum: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  content_id: string;
  created_at: string;
  content: Content | null;
}

export interface DownloadRow {
  id: string;
  user_id: string;
  content_id: string;
  created_at: string;
  content: Content | null;
}

export interface AdminRankItem {
  id: string;
  title: string;
  type: ContentType;
  thumbnail_url: string | null;
  download_count?: number;
  favorite_count?: number;
  created_at?: string;
}

export interface AdminStats {
  wallpapers: number;
  widgets: number;
  users: number;
  downloads: number;
  favorites: number;
  most_downloaded: AdminRankItem[];
  most_favorited: AdminRankItem[];
  recent: AdminRankItem[];
}

export interface NewContentInput {
  title: string;
  type: ContentType;
  file_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number;
  mime_type: string;
  checksum: string;
}
