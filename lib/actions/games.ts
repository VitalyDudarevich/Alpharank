"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  catalogNotInNames,
  mergeCatalogGames,
  type CatalogGameItem,
} from "@/lib/user-games-catalog";
import type { Game } from "@/lib/types";

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

function findGameByName(games: Game[], name: string): Game | undefined {
  const lower = name.toLowerCase();
  return games.find((g) => g.name.toLowerCase() === lower);
}

/** Добавляет игру во все лиги пользователя, если такого названия ещё нет. */
async function syncGameToUserLeagues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  originLeagueId: string
): Promise<Game | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const leagueIds = await getUserLeagueIds(supabase, userId);
  if (leagueIds.length === 0) return null;

  const { data: allGames } = await supabase
    .from("games")
    .select("*")
    .in("league_id", leagueIds);

  const byLeague = new Map<string, Game[]>();
  for (const g of allGames ?? []) {
    const list = byLeague.get(g.league_id) ?? [];
    list.push(g as Game);
    byLeague.set(g.league_id, list);
  }

  let originGame: Game | null = null;

  for (const leagueId of leagueIds) {
    const leagueGames = byLeague.get(leagueId) ?? [];
    const existing = findGameByName(leagueGames, trimmed);
    if (existing) {
      if (leagueId === originLeagueId) originGame = existing;
      continue;
    }

    const maxOrder = leagueGames.reduce((m, g) => Math.max(m, g.sort_order), 0);
    const { data: created, error } = await supabase
      .from("games")
      .insert({
        league_id: leagueId,
        name: trimmed,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) continue;

    const game = created as Game;
    if (leagueId === originLeagueId) originGame = game;
    leagueGames.push(game);
    byLeague.set(leagueId, leagueGames);
  }

  return originGame;
}

/** Все уникальные игры из лиг пользователя (для новой лиги и подсказок). */
export async function fetchUserGamesCatalog(excludeLeagueId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Не авторизован" as const, catalog: [] as CatalogGameItem[] };
  }

  const leagueIds = await getUserLeagueIds(supabase, user.id);
  if (leagueIds.length === 0) {
    return { catalog: [] as CatalogGameItem[] };
  }

  const { data: rows, error } = await supabase
    .from("games")
    .select("name, target_wins, league_id")
    .in("league_id", leagueIds);

  if (error) {
    return { error: error.message, catalog: [] as CatalogGameItem[] };
  }

  return {
    catalog: mergeCatalogGames(rows ?? [], excludeLeagueId),
  };
}

/** Игры лиги + названия из других лиг (без автодобавления в БД). */
export async function fetchLeagueGamesWithCatalog(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Не авторизован" as const,
      games: [] as Game[],
      catalog: [] as CatalogGameItem[],
    };
  }

  const leagueIds = await getUserLeagueIds(supabase, user.id);
  if (!leagueIds.includes(leagueId)) {
    return {
      error: "Нет доступа" as const,
      games: [] as Game[],
      catalog: [] as CatalogGameItem[],
    };
  }

  const [{ data: currentGames }, catalogRes] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("league_id", leagueId)
      .order("sort_order"),
    fetchUserGamesCatalog(leagueId),
  ]);

  const games = (currentGames ?? []) as Game[];
  const existing = new Set(games.map((g) => g.name.toLowerCase()));
  const catalog = catalogRes.catalog
    ? catalogNotInNames(catalogRes.catalog, existing)
    : [];

  return { games, catalog };
}

/** @deprecated Используйте fetchLeagueGamesWithCatalog */
export async function fetchMergedGamesForLeague(leagueId: string) {
  const result = await fetchLeagueGamesWithCatalog(leagueId);
  if (result.error) return { error: result.error, games: [] as Game[] };

  const games = [...result.games];
  if (result.catalog.length === 0) return { games };

  let maxOrder = games.reduce((m, g) => Math.max(m, g.sort_order), 0);
  const supabase = await createClient();

  for (const item of result.catalog) {
    maxOrder += 1;
    const { data: created } = await supabase
      .from("games")
      .insert({
        league_id: leagueId,
        name: item.name,
        sort_order: maxOrder,
        target_wins: item.target_wins,
      })
      .select()
      .single();
    if (created) games.push(created as Game);
  }

  games.sort((a, b) => a.sort_order - b.sort_order);
  return { games };
}

export async function addGame(leagueId: string, formData: FormData) {
  const supabase = await createClient();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await syncGameToUserLeagues(supabase, user.id, name, leagueId);
  revalidatePath(`/league/${leagueId}`);
}

export async function addGameByName(leagueId: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Введите название" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const game = await syncGameToUserLeagues(supabase, user.id, trimmed, leagueId);
  if (!game) return { error: "Не удалось добавить игру" };

  const leagueIds = await getUserLeagueIds(supabase, user.id);
  for (const lid of leagueIds) {
    revalidatePath(`/league/${lid}`);
  }

  return { game };
}

export async function deleteGame(leagueId: string, gameId: string) {
  const supabase = await createClient();
  await supabase.from("games").delete().eq("id", gameId);
  revalidatePath(`/league/${leagueId}`);
}
