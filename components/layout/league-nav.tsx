"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  BarChart3,
  Gamepad2,
  Users,
  Settings,
  ScrollText,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "today", label: "Сегодня", icon: Calendar },
  { href: "", label: "Главная", icon: Home },
  { href: "stats", label: "Стат", icon: BarChart3 },
  { href: "games", label: "Игры", icon: Gamepad2 },
  { href: "members", label: "Люди", icon: Users },
  { href: "log", label: "Лог", icon: ScrollText },
  { href: "settings", label: "Настр.", icon: Settings },
];

export function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="flex overflow-x-auto px-1 py-2 scrollbar-hide">
        {links.map(({ href, label, icon: Icon }) => {
          const path = href ? `${base}/${href}` : base;
          const active =
            href === ""
              ? pathname === base
              : pathname.startsWith(path);
          return (
            <Link
              key={href || "home"}
              href={path}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
