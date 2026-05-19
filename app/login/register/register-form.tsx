"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProfile } from "@/lib/actions/profile";
import {
  authButtonClass,
  authCardClass,
  authErrorMessage,
  authInputClass,
  authLabelClass,
} from "@/components/login/auth-styles";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Укажите имя для рейтингов");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: trimmedName },
      },
    });

    if (authError) {
      setLoading(false);
      setError(authErrorMessage(authError.message));
      return;
    }

    if (data.session) {
      const profileResult = await createProfile(trimmedName);
      setLoading(false);
      if (profileResult.error) {
        setError(profileResult.error);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      setLoading(false);
      setNeedsConfirm(true);
    }
  };

  if (needsConfirm) {
    return (
      <div className={authCardClass}>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Подтвердите email</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Мы отправили письмо на{" "}
            <span className="text-zinc-200">{email}</span>
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-violet-400 hover:text-violet-300"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={authCardClass}>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-white">Регистрация</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Создайте аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className={authLabelClass}>Имя в рейтингах</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={40}
            autoComplete="nickname"
            placeholder="Как вас показывать в лигах"
            className={authInputClass}
          />
        </label>

        <label className="block">
          <span className={authLabelClass}>Email</span>
          <input
            type="email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={cn(authInputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className={authLabelClass}>Повторите пароль</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={authInputClass}
          />
        </label>

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-300 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "Создать аккаунт"
          )}
        </button>
      </form>
    </div>
  );
}
