import type { SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data;
}

export async function getProfileDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const profile = await getProfile(supabase, userId);
  return profile?.display_name?.trim() || null;
}

export async function requireProfileDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const name = await getProfileDisplayName(supabase, userId);
  if (name) return name;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fromMeta = (
    user?.user_metadata?.display_name as string | undefined
  )?.trim();

  if (!fromMeta) return null;

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: fromMeta,
    updated_at: new Date().toISOString(),
  });

  if (error) return null;
  return fromMeta;
}
