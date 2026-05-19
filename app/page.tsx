import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HomeLeaguesList } from "@/components/home/home-leagues-list";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";
import { cn } from "@/lib/utils";

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
    <main className={appPageClass}>
      <div className={cn(appPageContentClass, appMainClass)}>
      <AppPageHeader title="Мои лиги" titleClassName="text-2xl" />

      {membershipsError && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Не удалось загрузить лиги. Выполните миграции в Supabase (папка supabase/migrations).
        </div>
      )}

      {leagues.length === 0 ? (
        <Card className="text-center">
          <p className="text-zinc-400">Пока нет лиг</p>
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

      <div className="mt-6">
        <Link href="/league/new" className="block w-full">
          <Button className="h-12 w-full text-base font-semibold">
            <Plus className="h-5 w-5" />
            Новая лига
          </Button>
        </Link>
      </div>
      </div>
    </main>
  );
}
