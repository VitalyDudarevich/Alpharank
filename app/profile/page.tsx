import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectTo, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  const backHref = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Профиль</h1>

      {error === "name" && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Укажите имя
        </div>
      )}

      <ProfilePageClient
        email={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        redirectTo={redirectTo}
      />
    </main>
  );
}
