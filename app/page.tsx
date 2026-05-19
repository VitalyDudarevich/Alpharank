import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { LeaguesPageClient } from "@/components/league/leagues-page-client";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";
import { cn } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string; create?: string }>;
}) {
  const { create } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  const metaName = (user.user_metadata?.display_name as string | undefined)?.trim();
  const displayName = profile?.display_name?.trim() || metaName || "";
  if (!displayName) {
    redirect("/profile?redirect=/");
  }

  return (
    <main className={appPageClass}>
      <div className={cn(appPageContentClass, appMainClass)}>
        <LeaguesPageClient
          userId={user.id}
          creatorDisplayName={displayName}
          initialCreate={create === "1"}
        />
      </div>
    </main>
  );
}
