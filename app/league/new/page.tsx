import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfileDisplayName } from "@/lib/profile";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { NewLeagueForm } from "@/components/league/new-league-form";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";
import { cn } from "@/lib/utils";

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
    <main className={appPageClass}>
      <div className={cn(appPageContentClass, appMainClass)}>
      <AppPageHeader title="Новая лига" titleClassName="text-2xl" />

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
      </div>
    </main>
  );
}
