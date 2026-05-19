import Link from "next/link";
import { Trophy, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";
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
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Trophy className="mb-4 h-12 w-12 text-violet-400" />
        <h1 className="text-3xl font-bold">alphaRank</h1>
        <p className="mt-2 mb-8 text-center text-zinc-400">
          Быстрый учёт побед с друзьями
        </p>
        <Link href="/login">
          <Button size="lg">Войти</Button>
        </Link>
      </main>
    );
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
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-8 pt-8">
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

      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          Выйти
        </button>
      </form>
    </main>
  );
}
