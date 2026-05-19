import Link from "next/link";
import { Trophy, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";

export default async function HomePage() {
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

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, display_name, leagues(id, name, year)")
    .eq("user_id", user.id);

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
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
        <Link href="/league/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Новая
          </Button>
        </Link>
      </header>

      {leagues.length === 0 ? (
        <Card className="text-center">
          <p className="mb-4 text-zinc-400">Пока нет лиг</p>
          <Link href="/league/new">
            <Button>Создать лигу</Button>
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {leagues.map((league) => (
            <li key={league!.id}>
              <Link href={`/league/${league!.id}`}>
                <Card className="flex items-center justify-between transition-colors hover:border-violet-600/50">
                  <div>
                    <p className="font-semibold">{league!.name}</p>
                    {league!.year && (
                      <p className="text-sm text-zinc-500">{league!.year}</p>
                    )}
                  </div>
                  <Trophy className="h-5 w-5 text-violet-400" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
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
