import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Suspense fallback={<p className="text-zinc-400">Загрузка...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
