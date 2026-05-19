import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/login/auth-layout";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthLayout compact>
      <Suspense
        fallback={
          <p className="animate-pulse text-sm text-violet-300/50">Загрузка...</p>
        }
      >
        <RegisterForm />
      </Suspense>
      <Link
        href="/login"
        className="relative z-20 mt-6 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Уже есть аккаунт
      </Link>
    </AuthLayout>
  );
}
