"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  authButtonClass,
  authCardClass,
  authErrorMessage,
  authInputClass,
  authLabelClass,
} from "@/components/login/auth-styles";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    setLoading(false);
    if (authError) setError(authErrorMessage(authError.message));
    else setSent(true);
  };

  return (
    <div className={authCardClass}>
      {sent ? (
        <div className="flex flex-col items-center py-2 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Письмо отправлено</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Ссылка для сброса пароля отправлена на{" "}
            <span className="font-medium text-zinc-200">{email}</span>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-white">Восстановление</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Введите email — пришлём ссылку для нового пароля
            </p>
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

            {error && (
              <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-300 ring-1 ring-red-500/20">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className={authButtonClass}>
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Отправить ссылку"
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
