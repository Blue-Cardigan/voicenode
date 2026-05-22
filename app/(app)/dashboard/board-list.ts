import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "@/lib/supabase/types";

type AnyClient = SupabaseClient;

export interface DashboardBoard extends Board {
  shared: boolean;
}

/**
 * Returns up to 100 boards. Fails soft: on any Supabase error (env missing,
 * RLS denial, migration not applied) returns [] so the dashboard renders an
 * empty state instead of throwing a Server Component render error.
 */
export async function listAllBoards(): Promise<DashboardBoard[]> {
  try {
    const supabase = (await createClient()) as unknown as AnyClient;
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      console.warn("[dashboard] listAllBoards failed:", error.message);
      return [];
    }
    return (data ?? []).map((b: Board) => ({ ...b, shared: false }));
  } catch (e) {
    console.warn("[dashboard] listAllBoards exception:", e);
    return [];
  }
}
