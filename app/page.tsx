import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { ArenaPageClient } from "@/components/arena/arena-page-client";

export default async function HomePage() {
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

  return <ArenaPageClient userId={user.id} />;
}
