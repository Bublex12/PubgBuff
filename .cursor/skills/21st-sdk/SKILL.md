---
name: 21st-sdk
description: 21st.dev — Magic MCP (UI в Cursor) и/или Agents SDK (чат в приложении). Различай продукты по задаче.
---

# 21st.dev

## Magic MCP (то, что нужно ассистенту в Cursor для UI)

- Пакет: `@21st-dev/magic`, конфиг в проекте: `.cursor/mcp.json`.
- Ключ: [21st.dev Magic Console](https://21st.dev/magic/console) → переменная **`TWENTYFIRST_MAGIC_API_KEY`** в `.env` (файл подхватывается `envFile` в `mcp.json`).
- В чате Cursor можно описывать компоненты (в т.ч. с префиксом `/ui` по доке Magic).

## 21st Agents SDK (чат внутри Next.js, ключ `an_sk_…`)

- Пакеты `@21st-sdk/*`, деплой агента, `AgentChat` — это **другой** продукт, не MCP.
- Документация и поиск по коду: сначала `https://21st-search-engine.fly.dev/help`, затем POST `/search` и др. по `/help`.
