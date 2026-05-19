import { Suspense } from "react";
import { AuthLayout } from "@/components/login/auth-layout";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <AuthLayout compact>
      <Suspense
        fallback={
          <p className="animate-pulse text-sm text-violet-300/50">Загрузка...</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
