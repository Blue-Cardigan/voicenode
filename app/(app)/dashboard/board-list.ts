import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "@/lib/supabase/types";

type AnyClient = SupabaseClient;

export interface DashboardBoard extends Board {
  shared: boolean;
}

export async function listAllBoards(): Promise<DashboardBoard[]> {
  const supabase = (await createClient()) as unknown as AnyClient;
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: Board) => ({ ...b, shared: false }));
}
