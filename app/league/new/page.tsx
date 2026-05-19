import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLeague } from "@/lib/actions/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function NewLeaguePage() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Новая лига</h1>

      <Card>
        <form action={createLeague} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Название</label>
            <Input name="name" placeholder="Лига 2026" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Год</label>
            <Input
              name="year"
              type="number"
              defaultValue={new Date().getFullYear()}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Ваше имя</label>
            <Input name="display_name" placeholder="Сонька" required />
          </div>
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </Card>
    </main>
  );
}
