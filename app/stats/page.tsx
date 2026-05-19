import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsPageClient } from "@/components/stats/stats-page-client";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <StatsPageClient />;
}
