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
2. В **SQL Editor** выполните файл [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
3. В **Authentication → Providers** включите Email и при необходимости Google
4. В **Authentication → URL Configuration** добавьте:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

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

1. Войдите по email (magic link) или Google
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
