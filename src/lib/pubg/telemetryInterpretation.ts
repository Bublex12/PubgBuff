import type { TelemetryEventSummary } from "@/lib/pubg/telemetrySummary";

export type TelemetryGroupId = "meta" | "combat" | "inventory" | "movement" | "lifecycle" | "other";

export const TELEMETRY_GROUP_ORDER: TelemetryGroupId[] = [
  "meta",
  "combat",
  "inventory",
  "movement",
  "lifecycle",
  "other",
];

const GROUP_COPY: Record<
  TelemetryGroupId,
  { title: string; hint: string }
> = {
  meta: {
    title: "Каркас матча и зона",
    hint: "LogMatch*, фазы, периодические снимки состояния — привязка контекста (карта, режим, круг).",
  },
  combat: {
    title: "Бой: урон и выстрелы",
    hint: "LogPlayerTakeDamage / LogPlayerAttack — основа для разборов перестрелок; хранить лучше агрегатами по времени.",
  },
  inventory: {
    title: "Инвентарь и расходники",
    hint: "LogItem*, LogHeal, автоматы — лут, аптечки, смена обвесов.",
  },
  movement: {
    title: "Перемещение",
    hint: "LogPlayerPosition и транспорт — семплированный трек; для карт и heatmap режут по интервалам.",
  },
  lifecycle: {
    title: "Нокдауны, убийства, ревайвы",
    hint: "Groggy / Kill / Revive — исходы дуэлей; связывай по времени и id игроков внутри JSON.",
  },
  other: {
    title: "Прочее",
    hint: "Редкие или специфичные типы — при необходимости разберите вручную по образцу события.",
  },
};

function countType(byType: Record<string, number>, name: string): number {
  return byType[name] ?? 0;
}

/** Грубая классификация `_T` для человекочитаемой сводки (порядок правил важен). */
export function categorizeTelemetryEventType(_T: string): TelemetryGroupId {
  if (
    _T === "LogMatchDefinition" ||
    _T === "LogMatchStart" ||
    _T === "LogMatchEnd" ||
    _T === "LogPhaseChange" ||
    _T === "LogGameStatePeriodic" ||
    _T.startsWith("LogGameState") ||
    _T.startsWith("LogEsports") ||
    _T === "LogPlayerLogin" ||
    _T === "LogPlayerLogout" ||
    _T === "LogPlayerCreate"
  ) {
    return "meta";
  }

  if (
    _T === "LogPlayerPosition" ||
    _T.startsWith("LogVehicle") ||
    _T === "LogParachuteLanding" ||
    _T === "LogSwimStart" ||
    _T === "LogSwimEnd" ||
    _T === "LogVaultStart" ||
    _T === "LogVaultEnd"
  ) {
    return "movement";
  }

  if (
    _T.startsWith("LogItem") ||
    _T === "LogHeal" ||
    _T.startsWith("LogVendingMachine") ||
    _T === "LogPlayerUseConsumable" ||
    _T.startsWith("LogCarePackage")
  ) {
    return "inventory";
  }

  if (
    _T === "LogPlayerKillV2" ||
    _T === "LogPlayerKill" ||
    _T === "LogPlayerMakeGroggy" ||
    _T === "LogPlayerRevive" ||
    _T.includes("Groggy")
  ) {
    return "lifecycle";
  }

  if (
    _T === "LogPlayerTakeDamage" ||
    _T === "LogPlayerAttack" ||
    _T === "LogArmorDestroy" ||
    _T === "LogWheelDestroy" ||
    _T.startsWith("LogObjectDestroy")
  ) {
    return "combat";
  }

  if (_T.startsWith("LogPlayer")) {
    return "combat";
  }

  if (_T.startsWith("Log")) {
    return "other";
  }

  return "other";
}

export type TelemetryGroupRow = {
  id: TelemetryGroupId;
  title: string;
  hint: string;
  count: number;
  pct: number;
  topTypes: Array<{ type: string; count: number }>;
};

export type TelemetryInterpretation = {
  groups: TelemetryGroupRow[];
  bullets: string[];
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildTelemetryInterpretation(
  summary: TelemetryEventSummary,
  context: { participantCount?: number | null } = {},
): TelemetryInterpretation {
  const { byType } = summary;
  const total = Math.max(1, summary.total);
  const participantCount =
    typeof context.participantCount === "number" && context.participantCount > 0
      ? context.participantCount
      : null;

  const perGroup: Record<TelemetryGroupId, Record<string, number>> = {
    meta: {},
    combat: {},
    inventory: {},
    movement: {},
    lifecycle: {},
    other: {},
  };

  const groupTotals: Record<TelemetryGroupId, number> = {
    meta: 0,
    combat: 0,
    inventory: 0,
    movement: 0,
    lifecycle: 0,
    other: 0,
  };

  for (const [type, count] of Object.entries(byType)) {
    const g = categorizeTelemetryEventType(type);
    groupTotals[g] += count;
    perGroup[g][type] = (perGroup[g][type] ?? 0) + count;
  }

  const groups: TelemetryGroupRow[] = TELEMETRY_GROUP_ORDER.map((id) => {
    const topTypes = Object.entries(perGroup[id])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count]) => ({ type, count }));

    return {
      id,
      title: GROUP_COPY[id].title,
      hint: GROUP_COPY[id].hint,
      count: groupTotals[id],
      pct: round1((groupTotals[id] / total) * 100),
      topTypes,
    };
  });

  const bullets: string[] = [];

  const td = countType(byType, "LogPlayerTakeDamage");
  const atk = countType(byType, "LogPlayerAttack");
  if (atk > 0 && td > 0) {
    const r = td / atk;
    if (r < 1.05) {
      bullets.push(
        `Бой: LogPlayerTakeDamage (${td}) и LogPlayerAttack (${atk}) — соотношение урона к «выстрелам» ~${round1(r)}:1. Часть атак может не давать урон (промах, другое событие урона).`,
      );
    } else if (r < 1.6) {
      bullets.push(
        `Бой: TakeDamage (${td}) / Attack (${atk}) ≈ ${round1(r)}:1 — типично, если есть урон без каждого отдельного Attack (AoE, транспорт, зона).`,
      );
    } else {
      bullets.push(
        `Бой: TakeDamage (${td}) заметно чаще Attack (${atk}) (~${round1(r)}:1) — много источников урона вне пары «один выстрел → одна атака»; разбор по цепочкам лучше делать по полям внутри JSON.`,
      );
    }
  } else if (td > 0 || atk > 0) {
    bullets.push(
      `Бой: в логе есть только часть пары (TakeDamage: ${td}, Attack: ${atk}) — для KDA смотри также lifecycle-слой (kill / groggy).`,
    );
  }

  const heal = countType(byType, "LogHeal");
  const attach = countType(byType, "LogItemAttach");
  const detach = countType(byType, "LogItemDetach");
  if (participantCount && heal > 0) {
    const perPlayer = heal / participantCount;
    bullets.push(
      perPlayer > 30
        ? `Инвентарь: LogHeal (${heal}) при ~${participantCount} игроках ≈ ${round1(perPlayer)} на игрока — очень активное лечение или длинный матч.`
        : `Инвентарь: LogHeal (${heal}), в среднем ~${round1(perPlayer)} на игрока (оценка по числу участников в данных матча).`,
    );
  } else if (heal > 0) {
    bullets.push(`Инвентарь: LogHeal (${heal}) — без числа участников из API оценка «на игрока» недоступна.`);
  }
  if (attach + detach > 0) {
    bullets.push(`Инвентарь: LogItemAttach/Detach суммарно ${attach + detach} — активная смена обвесов/слотов.`);
  }

  const pos = countType(byType, "LogPlayerPosition");
  if (pos > 0 && participantCount) {
    const perPlayer = pos / participantCount;
    bullets.push(
      `Перемещение: LogPlayerPosition (${pos}) при ~${participantCount} игроках ≈ ${round1(perPlayer)} точек на игрока — семплированный трек; для маршрутов агрегируй по времени.`,
    );
  } else if (pos > 0) {
    bullets.push(
      `Перемещение: LogPlayerPosition (${pos}) — плотный поток координат; привязка к игрокам и heatmap — по полям внутри события.`,
    );
  }

  const groggy = countType(byType, "LogPlayerMakeGroggy");
  const killV2 = countType(byType, "LogPlayerKillV2");
  const killLegacy = countType(byType, "LogPlayerKill");
  const kills = killV2 + killLegacy;
  const revive = countType(byType, "LogPlayerRevive");
  if (groggy > 0 && kills > 0) {
    const ratio = kills / groggy;
    bullets.push(
      ratio > 0.85
        ? `Исходы: LogPlayerMakeGroggy (${groggy}) vs убийства (${kills}) — соотношение ~${round1(ratio)}: многие нокдауны заканчиваются добиванием.`
        : `Исходы: Groggy (${groggy}) vs kills (${kills}) — не все ноки кончаются фрагом в этом логе (ревайвы, зона, лив).`,
    );
  }
  if (revive >= 0 && kills > 0 && revive < kills * 0.15) {
    bullets.push(`Ревайвы: LogPlayerRevive (${revive}) при ${kills} kill-событиях — ревайв редкий относительно добиваний.`);
  }

  const def = countType(byType, "LogMatchDefinition");
  const phase = countType(byType, "LogPhaseChange");
  const periodic = countType(byType, "LogGameStatePeriodic");
  if (def === 1) {
    bullets.push(
      "Мета: один LogMatchDefinition — строка-справочник матча (карта, режим, id); используй как dimension к остальным событиям.",
    );
  }
  if (phase > 0) {
    bullets.push(
      `Мета: LogPhaseChange (${phase}) — обычно связано со сменой фазы круга (число не всегда равно числу сужений — смотри тайминги в JSON).`,
    );
  }
  if (periodic > 0) {
    bullets.push(`Мета: LogGameStatePeriodic (${periodic}) — периодические снимки состояния лобби (фон для таймлайна).`);
  }

  const topEntry = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  if (topEntry && topEntry[1] / total > 0.2) {
    bullets.push(
      `Пайплайн: самый частый тип — «${topEntry[0]}» (${topEntry[1]}, ~${round1((topEntry[1] / total) * 100)}% всех строк). Такие потоки лучше не хранить построчно в OLAP — режь по времени/игроку.`,
    );
  }

  const combatShare = (groupTotals.combat / total) * 100;
  if (combatShare > 25 && bullets.length === 0) {
    bullets.push(`Бой: ~${round1(combatShare)}% всех записей относятся к слою урона/атак — основной «шум» для агрегаций.`);
  }

  if (bullets.length === 0) {
    bullets.push(
      "Расширенных эвристик по этому набору `_T` мало — открой сырой JSON по интересным типам и смотри поля (`character`, время, weapon и т.д.).",
    );
  }

  return { groups, bullets };
}
