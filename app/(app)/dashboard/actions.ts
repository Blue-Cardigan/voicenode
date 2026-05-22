"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Visibility } from "@/lib/supabase/types";

// Hand-rolled Database type doesn't yet satisfy postgrest GenericSchema; drop typing
// here until `supabase gen types typescript` output replaces lib/supabase/types.ts.
type AnyClient = SupabaseClient;

function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function anonClient(): Promise<AnyClient> {
  return (await createClient()) as unknown as AnyClient;
}

export async function createBoard(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim() || "Untitled board";
  const supabase = await anonClient();
  const { data, error } = await supabase
    .from("boards")
    .insert({ owner_id: null, title, visibility: "public" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/b/${data.id}`);
}

export async function renameBoard(boardId: string, formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;
  const supabase = await anonClient();
  const { error } = await supabase.from("boards").update({ title }).eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteBoard(boardId: string) {
  const supabase = await anonClient();
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function setVisibility(boardId: string, visibility: Visibility) {
  const supabase = await anonClient();
  const patch: { visibility: Visibility; link_token?: string | null } = { visibility };
  if (visibility === "link") {
    const { data: existing } = await supabase
      .from("boards")
      .select("link_token")
      .eq("id", boardId)
      .single();
    if (!existing?.link_token) patch.link_token = randomToken();
  } else {
    patch.link_token = null;
  }
  const { error } = await supabase.from("boards").update(patch).eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/b/${boardId}`);
}

export async function regenerateLinkToken(boardId: string) {
  const supabase = await anonClient();
  const { error } = await supabase
    .from("boards")
    .update({ link_token: randomToken(), visibility: "link" })
    .eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/b/${boardId}`);
}
