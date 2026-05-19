"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { shouldShowAppNav } from "@/lib/app-nav";
import { AppMenuNav, buildAppMenuLinks } from "@/components/layout/app-menu-nav";

type AppBurgerMenuProps = {
  leagueId: string | null;
};

export function AppBurgerMenu({ leagueId }: AppBurgerMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = buildAppMenuLinks(pathname, leagueId);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!shouldShowAppNav(pathname)) {
    return null;
  }

  return (
    <div className="md:hidden">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="relative mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
            aria-label="Открыть меню"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[10001]" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />

          <div
            className={cn(
              "absolute inset-y-0 left-0 z-10 flex w-[min(100%,20rem)] flex-col border-r border-zinc-800 bg-zinc-950",
              "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]"
            )}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-lg font-bold text-violet-100">AlphaRank</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AppMenuNav
              links={links}
              onNavigate={() => setOpen(false)}
              className="min-h-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

