import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "@/lib/supabase/types";

type AnyClient = SupabaseClient;

export interface DashboardBoard extends Board {
  shared: boolean;
}

export async function listDashboardBoards(userId: string): Promise<DashboardBoard[]> {
  const supabase = (await createClient()) as unknown as AnyClient;

  const [ownedRes, collabRes] = await Promise.all([
    supabase
      .from("boards")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("board_collaborators")
      .select("board_id, boards:board_id(*)")
      .eq("user_id", userId),
  ]);

  if (ownedRes.error) throw new Error(ownedRes.error.message);
  if (collabRes.error) throw new Error(collabRes.error.message);

  const owned: DashboardBoard[] = (ownedRes.data ?? []).map((b) => ({ ...b, shared: false }));

  const sharedRows = (collabRes.data ?? []) as unknown as Array<{
    board_id: string;
    boards: Board | null;
  }>;
  const shared: DashboardBoard[] = sharedRows
    .map((r) => r.boards)
    .filter((b): b is Board => Boolean(b))
    .map((b) => ({ ...b, shared: true }));

  const seen = new Set(owned.map((b) => b.id));
  return [...owned, ...shared.filter((b) => !seen.has(b.id))].sort(
    (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
  );
}
