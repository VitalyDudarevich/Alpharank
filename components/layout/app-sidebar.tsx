"use client";

import { usePathname } from "next/navigation";
import { AppMenuNav, buildAppMenuLinks } from "@/components/layout/app-menu-nav";
import { shouldShowAppNav } from "@/lib/app-nav";

export function AppSidebar() {
  const pathname = usePathname();

  if (!shouldShowAppNav(pathname)) {
    return null;
  }

  const links = buildAppMenuLinks(pathname);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-zinc-800 bg-zinc-950 md:flex"
      aria-label="Боковое меню"
    >
      <div className="border-b border-zinc-800 px-4 py-4">
        <span className="text-lg font-bold text-violet-100">AlphaRank</span>
      </div>
      <AppMenuNav links={links} className="min-h-0 flex-1" />
    </aside>
  );
}
