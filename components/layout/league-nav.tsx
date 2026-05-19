"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Swords,
  BarChart3,
  Users,
  Home,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

const leagueNavLinks: NavLinkItem[] = [
  { href: "today", label: "Арена", icon: Swords, primary: true },
  { href: "", label: "Главная", icon: Home },
  { href: "stats", label: "Стат", icon: BarChart3 },
  { href: "members", label: "Люди", icon: Users },
];

function navItemClass(active: boolean, primary: boolean) {
  return cn(
    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
    "sm:min-h-[52px] sm:min-w-[4.5rem] sm:flex-none sm:shrink-0 sm:rounded-xl sm:px-3",
    primary && !active && "text-violet-300",
    active
      ? "bg-violet-600/20 text-violet-300"
      : "text-zinc-500 active:bg-zinc-800/80 hover:text-zinc-200"
  );
}

export function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  const linkPath = (link: NavLinkItem) => {
    if (!link.href) return base;
    return `${base}/${link.href}`;
  };

  const isActive = (link: NavLinkItem) => {
    const path = linkPath(link);
    if (link.href === "") {
      return pathname === base || pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const profileActive =
    pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-700/90 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:bottom-0 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:border sm:rounded-t-2xl sm:px-3 sm:pb-[max(12px,env(safe-area-inset-bottom))] md:max-w-2xl"
      aria-label="Навигация"
    >
      <div
        className={cn(
          "flex w-full items-stretch",
          "sm:mx-auto sm:items-center sm:justify-center sm:gap-1 sm:overflow-x-auto sm:rounded-2xl sm:p-1.5 sm:scrollbar-hide"
        )}
      >
        {leagueNavLinks.map((link) => {
          const { href, label, icon: Icon, primary } = link;
          const path = linkPath(link);
          const active = isActive(link);

          return (
            <Link
              key={href || "home"}
              href={path}
              prefetch
              className={navItemClass(active, !!primary)}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon
                  className={cn("h-5 w-5", primary && "h-[22px] w-[22px]")}
                  strokeWidth={Icon === Swords ? 1.5 : 2}
                />
              </span>
              <span className="max-w-[56px] truncate text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px]">
                {label}
              </span>
            </Link>
          );
        })}
        <Link
          href="/profile"
          prefetch
          className={navItemClass(profileActive, false)}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            <UserCircle className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="max-w-[56px] truncate text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px]">
            Профиль
          </span>
        </Link>
      </div>
    </nav>
  );
}
