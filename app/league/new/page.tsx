import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfileDisplayName } from "@/lib/profile";
import { NewLeagueForm } from "@/components/league/new-league-form";

const errorMessages: Record<string, string> = {
  name: "Укажите название лиги",
  create: "Не удалось создать лигу. Проверьте, что выполнена SQL-миграция в Supabase.",
  member: "Лига создана, но не удалось добавить вас как участника.",
};

export default async function NewLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const { error, msg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = await requireProfileDisplayName(supabase, user.id);
  if (!displayName) redirect("/profile?redirect=/league/new");

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Новая лига</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <p>{errorMessages[error] ?? "Ошибка создания"}</p>
          {msg && (
            <p className="mt-1 text-xs text-red-400/80 break-all">
              {decodeURIComponent(msg)}
            </p>
          )}
          {error === "create" && (
            <p className="mt-2 text-xs text-red-400/70">
              Supabase → SQL Editor → выполните файлы из папки{" "}
              <code className="text-red-300">supabase/migrations/</code>
            </p>
          )}
        </div>
      )}

      <NewLeagueForm
        creatorDisplayName={displayName}
        creatorUserId={user.id}
      />
    </main>
  );
}
