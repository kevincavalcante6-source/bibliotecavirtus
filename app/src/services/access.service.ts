import { supabase } from "@/lib/supabase";

/**
 * Pergunta ao banco se a sessão atual pode usar a biblioteca: admin, ou
 * e-mail confirmado com compra aprovada. A decisão é do banco — este valor
 * só decide o que a interface mostra; as políticas de RLS recusam o resto.
 */
export async function checkAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_access");
  if (error) throw error;
  return data === true;
}
