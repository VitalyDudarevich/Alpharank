import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { joinLeague } from "@/lib/actions/league";
import { getProfileDisplayName } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: leagues } = await supabase.rpc("get_league_by_invite", {
    p_token: token,
  });

  const league = leagues?.[0];

  if (!league) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="text-center">
          <p className="text-red-400">Ссылка недействительна</p>
        </Card>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/join/${token}`);
  }

  const { data: existing } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/league/${league.id}`);
  }

  const profileName = await getProfileDisplayName(supabase, user.id);
  if (!profileName) {
    redirect(`/profile?redirect=/join/${token}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <Card>
        <h1 className="mb-2 text-xl font-bold">Присоединиться</h1>
        <p className="mb-6 text-zinc-400">
          Лига: <span className="text-zinc-100">{league.name}</span>
          {league.year && ` (${league.year})`}
        </p>
        <p className="mb-4 text-sm text-zinc-400">
          Вы вступите как{" "}
          <span className="font-medium text-zinc-100">{profileName}</span>
        </p>
        <form action={joinLeague} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full">
            Вступить
          </Button>
        </form>
      </Card>
    </main>
  );
}
