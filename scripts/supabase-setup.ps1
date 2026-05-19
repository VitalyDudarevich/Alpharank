# Привязка Supabase CLI и применение миграций
# Запуск: .\scripts\supabase-setup.ps1

$ErrorActionPreference = "Stop"

# Project ref из NEXT_PUBLIC_SUPABASE_URL (https://XXXX.supabase.co)
$ProjectRef = "mtvqruhjqwfdyssjinwk"

Write-Host "1. Вход в Supabase (откроется браузер)..." -ForegroundColor Cyan
npx supabase login

Write-Host ""
Write-Host "2. Привязка проекта $ProjectRef ..." -ForegroundColor Cyan
Write-Host "   Введите Database password из Dashboard -> Settings -> Database" -ForegroundColor Yellow
npx supabase link --project-ref $ProjectRef

Write-Host ""
Write-Host "3. Применение миграций..." -ForegroundColor Cyan
npx supabase db push --linked

Write-Host ""
Write-Host "Готово!" -ForegroundColor Green
