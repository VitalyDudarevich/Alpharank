"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogOut,
  Menu,
  Plus,
  Swords,
  UserCircle,
  Users,
  BarChart3,
  X,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { shouldShowAppNav } from "@/lib/app-nav";

type AppBurgerMenuProps = {
  leagueId: string | null;
};

export function AppBurgerMenu({ leagueId }: AppBurgerMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  const leagueBase = leagueId ? `/league/${leagueId}` : null;

  const leagueLinks = leagueBase
    ? [
        { href: `${leagueBase}/today`, label: "Арена", icon: Swords },
        { href: leagueBase, label: "Лига", icon: Home },
        { href: `${leagueBase}/stats`, label: "Статистика", icon: BarChart3 },
        { href: `${leagueBase}/members`, label: "Участники", icon: Users },
      ]
    : [];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="relative mx-auto w-full max-w-lg md:max-w-2xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/95 text-zinc-200 shadow-lg backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800"
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
              "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col",
              "border-l border-zinc-800 bg-zinc-950 shadow-2xl",
              "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]"
            )}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="font-semibold text-zinc-100">Меню</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      pathname === "/"
                        ? "bg-violet-600/20 text-violet-200"
                        : "text-zinc-300 hover:bg-zinc-800/80"
                    )}
                  >
                    <Home className="h-5 w-5 shrink-0 text-violet-400" />
                    Мои лиги
                  </Link>
                </li>
                {leagueLinks.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === leagueBase
                      ? pathname === leagueBase
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-violet-600/20 text-violet-200"
                            : "text-zinc-300 hover:bg-zinc-800/80"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-violet-400" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/league/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800/80"
                  >
                    <Plus className="h-5 w-5 shrink-0 text-violet-400" />
                    Новая лига
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      pathname.startsWith("/profile")
                        ? "bg-violet-600/20 text-violet-200"
                        : "text-zinc-300 hover:bg-zinc-800/80"
                    )}
                  >
                    <UserCircle className="h-5 w-5 shrink-0 text-violet-400" />
                    Профиль
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="shrink-0 border-t border-zinc-800 p-4">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 transition-colors hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-300"
                >
                  <LogOut className="h-5 w-5" />
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
