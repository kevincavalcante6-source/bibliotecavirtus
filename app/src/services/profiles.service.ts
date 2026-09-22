import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/models";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,role,created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/**
 * Só display_name e avatar_url são atualizáveis: o privilégio de coluna no
 * banco impede qualquer tentativa de mudar role ou email pelo cliente.
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", userId)
    .select("id,email,display_name,avatar_url,role,created_at")
    .single();
  if (error) throw error;
  return data as Profile;
}
