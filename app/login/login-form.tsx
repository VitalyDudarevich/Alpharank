"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient, REMEMBER_EMAIL_KEY } from "@/lib/supabase/client";
import { AuthCheckbox } from "@/components/login/auth-checkbox";
import {
  authButtonClass,
  authCardClass,
  authErrorMessage,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedLinkClass,
} from "@/components/login/auth-styles";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient(remember);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }

    if (remember) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className={authCardClass}>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-white">Войти</h1>
        <p className="mt-1.5 text-sm text-slate-500">Email и пароль</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className={authLabelClass}>Email</span>
          <input
            type="email"
            placeholder="you@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={authInputClass}
          />
        </label>

        <label className="block">
          <span className={authLabelClass}>Пароль</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={cn(authInputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-300"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </label>

        <div className="flex items-center justify-between gap-2 pt-1">
          <AuthCheckbox
            checked={remember}
            onChange={setRemember}
            label="Запомнить меня"
            id="remember-me"
          />
          <Link href="/login/forgot-password" className={authLinkClass}>
            Забыли пароль?
          </Link>
        </div>

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-300 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              Войти
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта?{" "}
        <Link href="/login/register" className={cn("font-medium", authMutedLinkClass)}>
          Регистрация
        </Link>
      </p>
    </div>
  );
}
