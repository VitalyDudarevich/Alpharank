# alphaRank

Веб-приложение для учёта побед между друзьями. Mobile-first PWA с real-time синхронизацией.

## Возможности

- Лиги/турниры (например «2026»)
- Игры, игроки, игровые дни
- **+1 победа** одной кнопкой с телефона
- Real-time обновления для всех участников
- Статистика с фильтрами: игра, период, число игроков, точный состав
- Графики (столбцы, круг, динамика)
- Опциональный ELO (по играм и общий)
- Журнал действий (audit log)
- Приглашение по ссылке

## Стек

- Next.js 16 + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Auth, Realtime)

## Быстрый старт

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com)

#### Вариант A — SQL Editor (проще, без CLI)

В **SQL Editor** выполните по порядку содержимое файлов:

- [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
- [`supabase/migrations/002_fix_league_create_rls.sql`](supabase/migrations/002_fix_league_create_rls.sql)

#### Вариант B — Supabase CLI (`db push`)

Ошибка `Cannot find project ref` значит, что проект ещё не привязан. Один раз:

```powershell
cd D:\Projects\alphaRank

# 1. Войти в аккаунт Supabase (откроется браузер)
npx supabase login

# 2. Project ref: Dashboard → Project Settings → General → Reference ID
#    (например: abcdefghijklmnop)
npx supabase link --project-ref ВАШ_PROJECT_REF

# 3. Ввести пароль БД (Dashboard → Project Settings → Database → Database password)
npx supabase db push
```

Либо без `link`, одной командой с URI (Settings → Database → Connection string → URI):

```powershell
npx supabase db push --db-url "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
```
3. В **Authentication → Providers → Email** включите вход по паролю (Email + Password)
4. При необходимости отключите «Confirm email» для быстрого теста с друзьями
5. В **Authentication → URL Configuration** добавьте:
   - Site URL: `http://localhost:3000` (и URL Vercel на проде)
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://ваш-домен.vercel.app/auth/callback`

### 2. Переменные окружения

```bash
cp .env.example .env.local
```

Заполните:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### 4. Деплой (Vercel)

1. Подключите репозиторий к Vercel
2. Добавьте env-переменные
3. Обновите Redirect URLs в Supabase на ваш домен

## Использование

1. Зарегистрируйтесь или войдите по email и паролю
2. Создайте лигу → добавьте игры → пригласите друзей по ссылке
3. На экране **Сегодня** отметьте участников и тапайте **+1** на победителя
4. Смотрите статистику с нужными фильтрами

## Структура

```
app/           — страницы Next.js
components/    — UI и бизнес-компоненты
lib/           — Supabase, actions, ELO, stats
supabase/      — SQL миграции
```
