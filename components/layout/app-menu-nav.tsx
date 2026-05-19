"use client";

import Link from "next/link";
import {
  Home,
  LogOut,
  Swords,
  UserCircle,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type AppMenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

export function buildAppMenuLinks(
  pathname: string,
  leagueId: string | null
): AppMenuLink[] {
  const leagueBase = leagueId ? `/league/${leagueId}` : null;
  const links: AppMenuLink[] = [];

  if (leagueBase) {
    links.push(
      {
        href: `${leagueBase}/today`,
        label: "Арена",
        icon: Swords,
        active:
          pathname === leagueBase ||
          pathname.startsWith(`${leagueBase}/today`),
      },
      {
        href: `${leagueBase}/stats`,
        label: "Статистика",
        icon: BarChart3,
        active: pathname.startsWith(`${leagueBase}/stats`),
      },
      {
        href: `${leagueBase}/members`,
        label: "Участники",
        icon: Users,
        active: pathname.startsWith(`${leagueBase}/members`),
      }
    );
  }

  links.push(
    {
      href: "/",
      label: "Лиги",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/profile",
      label: "Профиль",
      icon: UserCircle,
      active: pathname.startsWith("/profile"),
    }
  );

  return links;
}

type AppMenuNavProps = {
  links: AppMenuLink[];
  onNavigate?: () => void;
  className?: string;
};

export function AppMenuNav({ links, onNavigate, className }: AppMenuNavProps) {
  return (
    <nav className={cn("flex flex-1 flex-col", className)} aria-label="Меню">
      <ul className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  item.active
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
      </ul>

      <div className="shrink-0 p-4">
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-200 transition-colors hover:bg-red-950/40 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            Выйти
          </button>
        </form>
      </div>
    </nav>
  );
}
