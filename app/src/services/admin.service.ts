import { supabase } from "@/lib/supabase";
import type { AdminStats } from "@/types/models";

/**
 * Uma chamada só, e a autorização é verificada dentro da função no banco:
 * um usuário comum recebe erro 42501 mesmo chamando a RPC diretamente.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw error;
  return data as AdminStats;
}
