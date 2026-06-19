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

  // Статус читаем один раз из локальной сессии (cookie), без сетевого
  // getUser. Раньше getUser ходил в Supabase Auth на КАЖДУЮ смену маршрута и
  // подвешивал отрисовку навигации. Видимость меню дальше зависит только от
  // pathname — без повторных запросов на каждый клик.
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
  }, []);

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
