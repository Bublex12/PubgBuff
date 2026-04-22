# Развёртывание PUBG Buff Lite

Стек: **Next.js 16** (Node 22), **Prisma** + **SQLite** (`better-sqlite3`), ключ **PUBG API**.

В корне репозитория может лежать **`dev.db`** — закоммиченный снимок SQLite (кэш PUBG, spotlight, метки). После `git clone` при `DATABASE_URL=file:./dev.db` данные уже на месте. Для Docker образ собирается **без** этого файла (см. `.dockerignore`), БД создаётся в томе.

## Переменные окружения

Скопируйте `.env.example` в `.env` и задайте как минимум:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | SQLite, например `file:./prod.db` или `file:/data/pubgbuff.db` в Docker |
| `PUBG_API_KEY` | Ключ разработчика PUBG |
| `PUBG_LEADERBOARD_SHARD` | Регион PC для лидерборда (например `pc-eu`) |

Остальные переменные — по желанию, см. `.env.example`.

## Docker (рекомендуется)

```bash
docker compose build
docker compose up -d
```

- Порт наружу: `3000` (или задайте `PORT` в shell перед `compose up`).
- База: том `pubgbuff-sqlite`, файл по умолчанию `file:/data/pubgbuff.db` (переопределяет `DATABASE_URL` из `docker-compose.yml`).
- При старте контейнера выполняется **`prisma migrate deploy`**, затем `next start` на `0.0.0.0`.
- Проверка: `GET /api/health` — JSON `{ ok: true }`; в образе настроен `HEALTHCHECK`.

Обновление после `git pull`:

```bash
docker compose build --no-cache
docker compose up -d
```

## Без Docker (VPS / systemd)

1. Установите **Node.js 22 LTS** и build-утилиты для нативных модулей (на Debian: `build-essential python3`).
2. Клонируйте репозиторий, создайте `.env`.
3. Команды:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run build
NODE_ENV=production npm run start:bind
```

Для продакшена удобнее процесс-менеджер (**pm2**, **systemd**) с рабочей директорией в корне проекта и тем же `NODE_ENV=production`.

**SQLite:** храните файл БД на диске с бэкапом; путь в `DATABASE_URL` должен быть доступен на запись пользователю процесса.

## Сборка Next.js (`standalone`)

В `next.config.ts` включён `output: "standalone"` и донастройка trace для Prisma — уменьшает размер артефакта, если позже перейдёте на запуск только из `.next/standalone` без полного `node_modules`.

Текущий **Dockerfile** собирает продакшен-зависимости в образе и копирует `.next` + сгенерированный Prisma client — так надёжнее для `migrate` и `better-sqlite3`.

## Безопасность

- Не коммитьте `.env`; на сервере права `chmod 600 .env`.
- Закройте админ-порты файрволом, наружу только reverse-proxy (nginx, Caddy) с TLS при необходимости.
