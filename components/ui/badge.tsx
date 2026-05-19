import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "success" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-violet-600/20 text-violet-300",
        variant === "success" && "bg-emerald-600/20 text-emerald-300",
        variant === "muted" && "bg-zinc-800 text-zinc-400",
        className
      )}
    >
      {children}
    </span>
  );
}
