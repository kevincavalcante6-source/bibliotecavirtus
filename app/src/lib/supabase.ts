import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** O app inteiro checa isto antes de renderizar, para não falhar em silêncio. */
export const isConfigured = Boolean(url && anonKey);

export const SUPABASE_URL = url ?? "";

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  auth: {
    // A sessão é gerida pelo Supabase (JWT + refresh token), não por um
    // booleano nosso no localStorage.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const BUCKET_ORIGINALS = "content-originals";
export const BUCKET_THUMBNAILS = "content-thumbnails";

/** Mensagem legível para o usuário a partir de um erro do Supabase. */
export function readableError(error: unknown, fallback = "Não foi possível completar a operação."): string {
  if (!error) return fallback;
  const message = typeof error === "string" ? error : (error as { message?: string }).message;
  if (!message) return fallback;

  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Email not confirmed": "Confirme o e-mail antes de entrar.",
    "Password should be at least 6 characters.": "A senha precisa de ao menos 6 caracteres.",
  };
  if (map[message]) return map[message];
  if (message.includes("duplicate key")) return "Esse conteúdo já está na biblioteca.";
  if (message.includes("acesso não liberado")) return "Seu acesso ainda não foi liberado para este e-mail.";
  if (message.includes("row-level security") || message.includes("42501")) {
    return "Você não tem permissão para esta operação.";
  }
  if (message.includes("Failed to fetch")) return "Sem conexão com o servidor.";
  return message;
}
