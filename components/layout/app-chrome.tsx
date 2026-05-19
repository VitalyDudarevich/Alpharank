"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppBurgerMenu } from "@/components/layout/app-burger-menu";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNavShell } from "@/components/layout/bottom-nav-shell";
import { shouldShowAppNav } from "@/lib/app-nav";
import {
  readLastLeagueId,
  readLeagueIdFromPath,
  writeLastLeagueId,
} from "@/lib/last-league";

async function fetchDefaultLeagueId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  return data?.[0]?.league_id ?? null;
}

export function AppChrome() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldShowAppNav(pathname)) {
      setAuthed(false);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
    });
  }, [pathname]);

  const resolveLeagueId = useCallback(async () => {
    if (!shouldShowAppNav(pathname)) {
      setLeagueId(null);
      return;
    }

    const fromUrl = readLeagueIdFromPath(pathname);
    if (fromUrl) {
      writeLastLeagueId(fromUrl);
      setLeagueId(fromUrl);
      return;
    }

    const stored = readLastLeagueId();
    if (stored) {
      setLeagueId(stored);
      return;
    }

    const fallback = await fetchDefaultLeagueId();
    if (fallback) {
      writeLastLeagueId(fallback);
      setLeagueId(fallback);
    } else {
      setLeagueId(null);
    }
  }, [pathname]);

  useLayoutEffect(() => {
    void resolveLeagueId();
  }, [resolveLeagueId]);

  if (!authed || !shouldShowAppNav(pathname)) {
    return null;
  }

  return (
    <>
      <AppSidebar leagueId={leagueId} />
      <AppBurgerMenu leagueId={leagueId} />
      <BottomNavShell leagueId={leagueId} />
    </>
  );
}
