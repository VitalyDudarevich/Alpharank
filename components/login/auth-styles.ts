import { cn } from "@/lib/utils";

export const authCardClass = cn(
  "relative z-20 w-full rounded-[28px] p-6 sm:p-8",
  "border border-slate-600/25",
  "bg-[#0c0a14]/80 backdrop-blur-2xl",
  "shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
);

export const authInputClass = cn(
  "auth-field h-[52px] w-full rounded-2xl px-4 text-[15px] text-slate-100",
  "bg-[#0a0814] placeholder:text-slate-600",
  "border border-slate-700/50",
  "transition-colors duration-200",
  "hover:border-slate-600/70 hover:bg-[#0d0b16]",
  "focus:border-indigo-600/60 focus:bg-[#0d0b16] focus:outline-none focus:ring-1 focus:ring-indigo-600/35"
);

export const authLabelClass = "mb-2 block text-xs font-medium text-slate-400";

export const authButtonClass = cn(
  "mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl",
  "text-[15px] font-semibold text-white",
  "border border-indigo-500/35",
  "bg-gradient-to-b from-indigo-700 to-indigo-900",
  "transition-colors duration-200",
  "hover:from-indigo-600 hover:to-indigo-800 hover:border-indigo-400/50",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0",
  "active:scale-[0.98] disabled:opacity-50"
);

export const authCheckboxClass = cn(
  "peer h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-md",
  "border border-slate-600/50 bg-[#0a0814]",
  "transition-colors duration-200",
  "hover:border-slate-400/60",
  "focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:ring-offset-0",
  "checked:border-indigo-500/80 checked:bg-indigo-700"
);

export const authCheckboxIconClass = cn(
  "pointer-events-none absolute left-0 top-0 flex h-[18px] w-[18px] items-center justify-center",
  "text-white opacity-0 transition-opacity peer-checked:opacity-100"
);

export const authLinkClass =
  "text-sm text-slate-400 transition-colors hover:text-slate-200";

export const authMutedLinkClass = cn(
  "text-sm text-indigo-400/90 transition-colors hover:text-indigo-300",
  "rounded outline-none focus:outline-none focus-visible:outline-none"
);

export function authErrorMessage(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Неверный email или пароль",
    "Email not confirmed": "Подтвердите email в письме от Supabase",
    "User already registered": "Пользователь уже зарегистрирован",
    "Password should be at least 6 characters":
      "Пароль должен быть не короче 6 символов",
  };
  return map[message] ?? message;
}
