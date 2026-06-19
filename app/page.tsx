import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/profile";
import { fetchArenaState } from "@/lib/actions/arena";
import { ArenaPageClient } from "@/components/arena/arena-page-client";

type HomePageProps = {
  searchParams: Promise<{ battle?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { battle: initialBattleId } = await searchParams;
  const user = await getAuthUser();

  // Список арены читается на сервере и отдаётся как initial-проп, чтобы клиент
  // сразу показывал данные, а не «Загрузка…» + отдельный round-trip в useEffect.
  const arena = await fetchArenaState();
  const initialArena = "error" in arena ? null : arena;

  if (!user) {
    return (
      <ArenaPageClient
        userId={null}
        initialBattleId={initialBattleId?.trim() || null}
        initialArena={initialArena}
      />
    );
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase, user.id);
  const metaName = (user.user_metadata?.display_name as string | undefined)?.trim();
  const displayName = profile?.display_name?.trim() || metaName || "";
  if (!displayName) {
    redirect("/profile?redirect=/");
  }

  return (
    <ArenaPageClient
      userId={user.id}
      initialBattleId={initialBattleId?.trim() || null}
      initialArena={initialArena}
    />
  );
}
