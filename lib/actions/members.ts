"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  mergePeopleCatalog,
  peopleNotInLeague,
  type CatalogPersonItem,
} from "@/lib/user-people-catalog";

async function getUserLeagueIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", userId);

  return data?.map((m) => m.league_id) ?? [];
}

/** Люди из других лиг пользователя (по ссылке и т.д.), ещё не в указанной лиге. */
export async function fetchUserPeopleCatalog(excludeLeagueId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Не авторизован" as const, catalog: [] as CatalogPersonItem[] };
  }

  const leagueIds = await getUserLeagueIds(supabase, user.id);
  if (leagueIds.length === 0) {
    return { catalog: [] as CatalogPersonItem[] };
  }

  const { data: rows, error } = await supabase
    .from("league_members")
    .select("user_id, display_name, league_id")
    .in("league_id", leagueIds);

  if (error) {
    return { error: error.message, catalog: [] as CatalogPersonItem[] };
  }

  let catalog = mergePeopleCatalog(rows ?? [], {
    excludeUserIds: new Set([user.id]),
  });

  if (excludeLeagueId) {
    const { data: inLeague } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", excludeLeagueId);

    const memberUserIds = new Set((inLeague ?? []).map((m) => m.user_id));
    catalog = peopleNotInLeague(catalog, memberUserIds);
  }

  return { catalog };
}

export async function addKnownMemberToLeague(leagueId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase.rpc("add_known_member_to_league", {
    p_league_id: leagueId,
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("already_member")) {
      return { error: "Уже в лиге" };
    }
    if (msg.includes("not_in_network")) {
      return { error: "Этого человека нельзя добавить" };
    }
    if (msg.includes("not_owner")) {
      return { error: "Только создатель может добавлять" };
    }
    return { error: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.member_id) {
    return { error: "Не удалось добавить участника" };
  }

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "member_added",
    payload: { display_name: row.display_name, user_id: userId },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/members`);

  return {
    member: {
      id: row.member_id as string,
      user_id: userId,
      display_name: row.display_name as string,
      role: row.role as "owner" | "member",
    },
  };
}
