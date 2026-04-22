## PUBG Buff Lite

Личный мини-сайт для анализа собственных матчей PUBG (и матчей друзей) через официальный PUBG API.

### Что уже есть в MVP

- Профиль игрока: матчи, победы, top-10, KD, winrate, средний урон.
- Последние матчи: таблица с режимом, картой, местом, K/A, уроном.
- Аналитика по картам: средние киллы/урон и winrate.
- Совместка с друзьями: сколько игр вместе и общий winrate.
- Weapon mastery: top оружие по XP.
- TTL-кэш (SQLite + Prisma) и ручной refresh из API.

## Getting Started

1) Установи зависимости и миграции:

```bash
npm install
npx prisma migrate dev --name init_cache
```

2) Настрой переменные окружения в `.env.local`:

```bash
PUBG_API_KEY="your_token_here"
PUBG_DEFAULT_PLATFORM="steam"
PUBG_CACHE_TTL_MINUTES="30"
PUBG_FRIENDS="friend1,friend2"
```

3) Запусти dev сервер:

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000), введи ник и получи дашборд.

### Если «не находит» игрока

- Проверь `PUBG_API_KEY` (ошибка `401/403` почти всегда из‑за ключа).
- Этот проект сейчас настроен только на **Steam shard** (`steam`). Если аккаунт не Steam‑PC, поиск по нику через этот shard не сработает.
- Ник должен совпадать с тем, который видит PUBG API (иногда отличается от отображаемого ника в клиенте).

### API маршруты

- `GET /api/player/[name]?refresh=1` — агрегированный дашборд игрока (shard фиксирован: `steam`).
- `GET /api/matches/[matchId]` — детали одного матча (shard фиксирован: `steam`).

`refresh=1` принудительно обновляет кэш из PUBG API.

### Стек

- Next.js (App Router)
- Prisma + SQLite
- PUBG API (`players`, `matches`, `weapon_mastery`)

### Ограничения

- Приложение ориентировано на opt-in сценарий (свои ники и ники друзей), не на массовый сбор данных.
- Телеметрия в MVP пока не подтянута в UI, но архитектура кэша и API-слоя готова для расширения.
