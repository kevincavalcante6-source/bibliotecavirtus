import { supabase } from "@/lib/supabase";

/**
 * Registra a visita e devolve quando foi a visita anterior (null na primeira).
 * Uma visita dura enquanto houver atividade com menos de 30 minutos de
 * intervalo — a regra mora no banco, em `register_visit`.
 */
export async function registerVisit(): Promise<string | null> {
  const { data, error } = await supabase.rpc("register_visit");
  if (error) throw error;
  return (data as string | null) ?? null;
}
