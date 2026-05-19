import { cn } from "@/lib/utils";

export type AppPageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

/** Заголовок по центру экрана; боковые элементы его не смещают. */
export function AppPageHeader({
  title,
  subtitle,
  left,
  right,
  className,
  titleClassName,
}: AppPageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <header className="relative h-10">
        <h1
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center truncate px-2 text-center text-xl font-bold leading-none",
            titleClassName
          )}
        >
          {title}
        </h1>
        <div className="relative z-10 flex h-10 items-center justify-between">
          <div className="flex min-w-10 shrink-0 items-center justify-start">
            {left}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {right}
          </div>
        </div>
      </header>
      {subtitle != null && subtitle !== "" && (
        <p className="mt-2 text-center text-sm text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
