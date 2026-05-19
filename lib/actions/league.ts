"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireProfileDisplayName } from "@/lib/profile";
import { addGameByName } from "@/lib/actions/games";
import { addKnownMemberToLeague } from "@/lib/actions/members";
import { maybeAutoConcludeLeague } from "@/lib/actions/season";

export type CreateLeagueResult =
  | {
      ok: true;
      leagueId: string;
      inviteToken: string;
      members: {
        id: string;
        user_id: string;
        display_name: string;
        role: "owner" | "member";
      }[];
    }
  | { ok: false; error: string; code?: string };

export async function createLeague(
  formData: FormData
): Promise<CreateLeagueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const endsAt = (formData.get("ends_at") as string)?.trim() || null;
  const year = endsAt
    ? parseInt(endsAt.slice(0, 4), 10) || new Date().getFullYear()
    : new Date().getFullYear();
  const targetWinsRaw = (formData.get("target_wins") as string)?.trim();
  const targetWins =
    targetWinsRaw && parseInt(targetWinsRaw, 10) > 0
      ? parseInt(targetWinsRaw, 10)
      : null;

  let initialGames: { name: string; target_wins: number | null }[] = [];
  try {
    const parsed = JSON.parse((formData.get("games") as string) || "[]");
    if (Array.isArray(parsed)) {
      initialGames = parsed.filter(
        (g): g is { name: string; target_wins: number | null } =>
          typeof g?.name === "string" && g.name.trim().length > 0
      );
    }
  } catch {
    initialGames = [];
  }

  let initialMemberUserIds: string[] = [];
  try {
    const parsed = JSON.parse(
      (formData.get("member_user_ids") as string) || "[]"
    );
    if (Array.isArray(parsed)) {
      initialMemberUserIds = parsed.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
    }
  } catch {
    initialMemberUserIds = [];
  }

  if (!name) {
    return { ok: false, error: "Укажите название лиги", code: "name" };
  }

  const displayName = await requireProfileDisplayName(supabase, user.id);
  if (!displayName) redirect("/profile?redirect=/?create=1");

  const inviteToken = nanoid(24);

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name,
      year,
      ends_at: endsAt,
      target_wins: targetWins,
      invite_token: inviteToken,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (leagueError || !league) {
    console.error("createLeague:", leagueError?.message);
    return {
      ok: false,
      error: leagueError?.message ?? "Не удалось создать лигу",
      code: "create",
    };
  }

  const { data: ownerRows, error: memberError } = await supabase.rpc(
    "insert_league_owner_member",
    {
      p_league_id: league.id,
      p_display_name: displayName,
    }
  );

  const ownerMember = Array.isArray(ownerRows) ? ownerRows[0] : ownerRows;

  if (memberError || !ownerMember?.member_id) {
    console.error("createLeague owner member:", memberError?.message);
    await supabase.from("leagues").delete().eq("id", league.id);
    const msg = memberError?.message ?? "";
    if (
      memberError?.code === "PGRST202" ||
      msg.includes("Could not find the function") ||
      msg.includes("insert_league_owner_member")
    ) {
      return {
        ok: false,
        error:
          "В Supabase выполните миграцию supabase/migrations/008_league_owner_member_rpc.sql",
        code: "member",
      };
    }
    return {
      ok: false,
      error: memberError?.message ?? "Не удалось добавить вас как участника",
      code: "member",
    };
  }

  const members: {
    id: string;
    user_id: string;
    display_name: string;
    role: "owner" | "member";
  }[] = [
    {
      id: ownerMember.member_id as string,
      user_id: ownerMember.user_id as string,
      display_name: ownerMember.display_name as string,
      role: ownerMember.role as "owner" | "member",
    },
  ];

  for (const userId of initialMemberUserIds) {
    if (userId === user.id) continue;
    const addResult = await addKnownMemberToLeague(league.id, userId);
    if (addResult.error || !addResult.member) {
      console.error("createLeague add member:", addResult.error);
      await supabase.from("league_members").delete().eq("league_id", league.id);
      await supabase.from("leagues").delete().eq("id", league.id);
      return {
        ok: false,
        error: addResult.error ?? "Не удалось добавить участника",
        code: "member",
      };
    }
    members.push(addResult.member);
  }

  for (const game of initialGames) {
    const result = await addGameByName(league.id, game.name.trim());
    if (
      result.game &&
      game.target_wins != null &&
      game.target_wins > 0
    ) {
      await supabase
        .from("games")
        .update({ target_wins: game.target_wins })
        .eq("id", result.game.id);
    }
  }

  await maybeAutoConcludeLeague(league.id);

  await supabase.from("audit_logs").insert({
    league_id: league.id,
    action: "league_created",
    payload: { name, year, ends_at: endsAt, target_wins: targetWins },
    actor_id: user.id,
  });

  revalidatePath("/");

  return {
    ok: true,
    leagueId: league.id,
    inviteToken,
    members,
  };
}

export async function joinLeague(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = formData.get("token") as string;

  const displayName = await requireProfileDisplayName(supabase, user.id);
  if (!displayName) redirect(`/profile?redirect=/join/${token}`);

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
    redirect(`/league/${league.id}/today`);
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

  redirect(`/league/${league.id}/today`);
}

export async function updateLeagueName(leagueId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Укажите название" };

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "owner") return { error: "Только создатель может редактировать" };

  const { error } = await supabase
    .from("leagues")
    .update({ name: trimmed })
    .eq("id", leagueId);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "settings_updated",
    payload: { name: trimmed },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function deleteLeague(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "owner") {
    return { error: "Только создатель может удалить лигу" };
  }

  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/league/${leagueId}`);

  return { success: true };
}
