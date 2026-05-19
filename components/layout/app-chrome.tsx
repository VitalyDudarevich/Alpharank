"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppBurgerMenu } from "@/components/layout/app-burger-menu";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNavShell } from "@/components/layout/bottom-nav-shell";
import { shouldShowAppNav } from "@/lib/app-nav";

export function AppChrome() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!shouldShowAppNav(pathname)) {
      setAuthed(false);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
    });
  }, [pathname]);

  if (!authed || !shouldShowAppNav(pathname)) {
    return null;
  }

  return (
    <>
      <AppSidebar />
      <AppBurgerMenu />
      <BottomNavShell />
    </>
  );
}
