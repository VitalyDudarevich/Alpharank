import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/login/auth-layout";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout compact>
      <Suspense
        fallback={
          <p className="animate-pulse text-sm text-violet-300/50">Загрузка...</p>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
      <Link
        href="/login"
        className="relative z-20 mt-6 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Назад ко входу
      </Link>
    </AuthLayout>
  );
}
