import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30",
        type === "date" && "date-input",
        className
      )}
      {...props}
    />
  );
}
