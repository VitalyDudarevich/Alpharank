import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/profile";
import { HomeLeaguesList } from "@/components/home/home-leagues-list";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { highlight } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  const { data: memberships, error: membershipsError } = await supabase
    .from("league_members")
    .select("league_id, display_name, leagues(id, name, year)")
    .eq("user_id", user.id);

  if (membershipsError) {
    console.error("load leagues:", membershipsError.message);
  }

  const leagues =
    memberships
      ?.map((m) => {
        const league = m.leagues as
          | { id: string; name: string; year: number }
          | { id: string; name: string; year: number }[]
          | null;
        const l = Array.isArray(league) ? league[0] : league;
        return l ? { ...l, memberName: m.display_name } : null;
      })
      .filter(Boolean) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pl-12 pt-8 md:max-w-2xl md:pb-28">
      <Link
        href="/arena"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-600/10 px-4 py-4 transition-colors hover:border-violet-500/50 hover:bg-violet-600/15"
      >
        <Swords className="h-8 w-8 shrink-0 text-violet-400" />
        <div className="min-w-0 text-left">
          <p className="font-semibold text-violet-100">Быстрое сражение</p>
          <p className="text-sm text-zinc-500">
            Без лиги — игра и участники на лету
          </p>
        </div>
      </Link>

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои лиги</h1>
          <Link
            href="/profile"
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            {profile?.display_name ?? "Заполнить профиль"}
          </Link>
        </div>
        <Link href="/league/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Новая
          </Button>
        </Link>
      </header>

      {membershipsError && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Не удалось загрузить лиги. Выполните миграции в Supabase (папка supabase/migrations).
        </div>
      )}

      {leagues.length === 0 ? (
        <Card className="text-center">
          <p className="mb-4 text-zinc-400">Пока нет лиг</p>
          <Link href="/league/new">
            <Button>Создать лигу</Button>
          </Link>
        </Card>
      ) : (
        <HomeLeaguesList
          leagues={leagues.map((league) => ({
            id: league!.id,
            name: league!.name,
            year: league!.year ?? null,
          }))}
          highlightLeagueId={highlight}
        />
      )}

    </main>
  );
}
