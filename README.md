# alphaRank

Веб-приложение для учёта побед между друзьями. Mobile-first PWA с real-time синхронизацией.

## Возможности

- Арена: сражения с игрой и участниками по имени
- **+1 победа** одной кнопкой с телефона
- Real-time обновления в активном сражении
- Статистика с фильтрами: игра, период, число игроков, точный состав
- Графики (столбцы, круг, динамика)
- Личный каталог игр

## Стек

- Next.js 16 + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Auth, Realtime)

## Быстрый старт

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com)

#### Вариант A — SQL Editor (проще, без CLI)

В **SQL Editor** выполните по порядку:

1. `supabase/migrations/001_initial.sql` — арена, сражения, статистика
2. `supabase/migrations/002_profiles.sql` — профили
3. `supabase/migrations/003_profile_avatar.sql` — аватары

#### Уже был старый проект с лигами?

История миграций пересобрана без лиг. Для существующей БД проще всего:

```powershell
npx supabase db reset
```

(удалит данные) или в Dashboard → SQL: вручную удалить старые таблицы `leagues`, `league_members`, `games` и применить три файла выше.

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
