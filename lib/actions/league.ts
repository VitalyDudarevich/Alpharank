"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

export async function createLeague(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const year = parseInt(formData.get("year") as string) || new Date().getFullYear();
  const displayName = (formData.get("display_name") as string)?.trim() || "Игрок";

  if (!name) redirect("/league/new?error=name");

  const inviteToken = nanoid(24);

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({
      name,
      year,
      invite_token: inviteToken,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !league) redirect("/league/new?error=create");

  await supabase.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    display_name: displayName,
    role: "owner",
  });

  await supabase.from("audit_logs").insert({
    league_id: league.id,
    action: "league_created",
    payload: { name, year },
    actor_id: user.id,
  });

  revalidatePath("/");
  redirect(`/league/${league.id}`);
}

export async function joinLeague(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = formData.get("token") as string;
  const displayName = (formData.get("display_name") as string)?.trim();

  if (!displayName) redirect(`/join/${token}?error=name`);

  const { data: leagues } = await supabase.rpc("get_league_by_invite", {
    p_token: token,
  });

  const league = leagues?.[0];
  if (!league) redirect("/?error=invite");

  const { data: existing } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/league/${league.id}`);
  }

  const { error } = await supabase.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    display_name: displayName,
    role: "member",
  });

  if (error) redirect(`/join/${token}?error=join`);

  await supabase.from("audit_logs").insert({
    league_id: league.id,
    action: "member_joined",
    payload: { display_name: displayName },
    actor_id: user.id,
  });

  redirect(`/league/${league.id}`);
}

export async function updateLeagueSettings(leagueId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const eloEnabled = formData.get("elo_enabled") === "on";
  const eloK = parseInt(formData.get("elo_k") as string) || 32;

  const { error } = await supabase
    .from("leagues")
    .update({ name, elo_enabled: eloEnabled, elo_k: eloK })
    .eq("id", leagueId);

  if (error) redirect(`/league/${leagueId}/settings?error=1`);

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "settings_updated",
    payload: { name, elo_enabled: eloEnabled, elo_k: eloK },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}`);
  redirect(`/league/${leagueId}/settings`);
}
