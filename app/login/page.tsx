import { Suspense } from "react";
import { AuthLayout } from "@/components/login/auth-layout";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <p className="animate-pulse text-sm text-violet-300/50">Загрузка...</p>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
