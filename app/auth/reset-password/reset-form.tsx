"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  authButtonClass,
  authCardClass,
  authErrorMessage,
  authInputClass,
  authLabelClass,
} from "@/components/login/auth-styles";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className={authCardClass}>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-white">Новый пароль</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Придумайте новый пароль</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className={authLabelClass}>Новый пароль</span>
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
            "Сохранить пароль"
          )}
        </button>
      </form>
    </div>
  );
}
