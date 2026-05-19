"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, BarChart3, Users, Shield, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "today", label: "Арена", icon: Swords, primary: true },
  { href: "", label: "Главная", icon: Home },
  { href: "stats", label: "Стат", icon: BarChart3 },
  { href: "members", label: "Люди", icon: Users },
  { href: "league", label: "Лига", icon: Shield },
] as const;

export function LeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const base = `/league/${leagueId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    const path = href ? `${base}/${href}` : base;
    return href === "" ? pathname === base : pathname.startsWith(path);
  };

  const bar = (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[9999] isolate pb-[env(safe-area-inset-bottom)] sm:bottom-0 sm:px-3 sm:pb-[max(12px,env(safe-area-inset-bottom))]"
      aria-label="Навигация лиги"
    >
      <div
        className={cn(
          "flex w-full items-stretch border-t border-zinc-700/90 bg-zinc-950 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          "sm:mx-auto sm:w-auto sm:max-w-full sm:items-center sm:justify-center sm:gap-1 sm:overflow-x-auto sm:rounded-2xl sm:border sm:p-1.5 sm:shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:scrollbar-hide"
        )}
      >
        {navLinks.map((link) => {
          const { href, label, icon: Icon } = link;
          const primary = "primary" in link && link.primary;
          const path = href ? `${base}/${href}` : base;
          const active = isActive(href);

          return (
            <Link
              key={href || "home"}
              href={path}
              prefetch
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
                "sm:min-h-[52px] sm:min-w-[4.5rem] sm:flex-none sm:shrink-0 sm:rounded-xl sm:px-3",
                primary && !active && "text-violet-300",
                active
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-500 active:bg-zinc-800/80 hover:text-zinc-200"
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    primary && "h-[22px] w-[22px]"
                  )}
                  strokeWidth={Icon === Swords ? 1.5 : 2}
                />
              </span>
              <span className="max-w-[56px] truncate text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) {
    return (
      <div
        className="h-[calc(56px+env(safe-area-inset-bottom))] shrink-0 sm:h-[calc(68px+env(safe-area-inset-bottom))]"
        aria-hidden
      />
    );
  }

  return createPortal(bar, document.body);
}
