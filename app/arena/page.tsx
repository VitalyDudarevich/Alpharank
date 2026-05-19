import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StandaloneArenaClient } from "@/components/arena/standalone-arena-client";

export default async function ArenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <StandaloneArenaClient userId={user.id} />
  );
}
