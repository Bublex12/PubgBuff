"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  /** Сегмент URL для /api/player/.../marks (как в ссылке на профиль) */
  encodedPlayerPath: string;
  initialStreamer: boolean;
  initialPro: boolean;
  initialTop500: boolean;
  initialTop500Rank: number | null;
  initialTop500SeasonId: string | null;
  initialTop500GameMode: string | null;
};

type MarksPayload = {
  isStreamer?: boolean;
  isPro?: boolean;
  isTop500?: boolean;
  top500Rank?: number | null;
  top500SeasonId?: string | null;
  top500GameMode?: string | null;
};

export function PlayerProfileFlags({
  encodedPlayerPath,
  initialStreamer,
  initialPro,
  initialTop500,
  initialTop500Rank,
  initialTop500SeasonId,
  initialTop500GameMode,
}: Props) {
  const isMounted = useRef(true);
  const [isStreamer, setIsStreamer] = useState(initialStreamer);
  const [isPro, setIsPro] = useState(initialPro);
  const [isTop500, setIsTop500] = useState(initialTop500);
  const [top500Rank, setTop500Rank] = useState<number | null>(initialTop500Rank);
  const [top500SeasonId, setTop500SeasonId] = useState<string | null>(initialTop500SeasonId);
  const [top500GameMode, setTop500GameMode] = useState<string | null>(initialTop500GameMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/player/${encodedPlayerPath}/marks`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(baseUrl);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as MarksPayload;
      if (!isMounted.current) {
        return;
      }
      setIsStreamer(Boolean(payload.isStreamer));
      setIsPro(Boolean(payload.isPro));
      setIsTop500(Boolean(payload.isTop500));
      setTop500Rank(typeof payload.top500Rank === "number" ? payload.top500Rank : null);
      setTop500SeasonId(typeof payload.top500SeasonId === "string" ? payload.top500SeasonId : null);
      setTop500GameMode(typeof payload.top500GameMode === "string" ? payload.top500GameMode : null);
    } catch {
      /* ignore */
    }
  }, [baseUrl]);

  useEffect(() => {
    isMounted.current = true;
    void Promise.resolve().then(() => refresh());
    return () => {
      isMounted.current = false;
    };
  }, [refresh]);

  async function persist(next: { isStreamer?: boolean; isPro?: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(baseUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = (await response.json()) as MarksPayload & { error?: string };
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Не сохранилось");
        return;
      }
      if (!isMounted.current) {
        return;
      }
      setIsStreamer(Boolean(payload.isStreamer));
      setIsPro(Boolean(payload.isPro));
      setIsTop500(Boolean(payload.isTop500));
      setTop500Rank(typeof payload.top500Rank === "number" ? payload.top500Rank : null);
      setTop500SeasonId(typeof payload.top500SeasonId === "string" ? payload.top500SeasonId : null);
      setTop500GameMode(typeof payload.top500GameMode === "string" ? payload.top500GameMode : null);
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  }

  const top500Title =
    isTop500 && top500Rank != null && top500SeasonId && top500GameMode
      ? `Топ-500 лидерборда: место ${top500Rank}, режим ${top500GameMode}, сезон ${top500SeasonId}`
      : isTop500
        ? "В топ-500 лидерборда (последняя синхронизация)"
        : "";

  return (
    <div className="stack">
      {error ? <p className="telemetryError">{error}</p> : null}
      {isTop500 ? (
        <div>
          <span className="spotlightTag top500Tag" title={top500Title || undefined}>
            ТОП 500
          </span>
          {top500Rank != null ? (
            <span className="text-muted" style={{ marginLeft: 10, fontSize: "0.9rem" }}>
              #{top500Rank}
              {top500GameMode ? ` · ${top500GameMode}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="inlineChoice" style={{ maxWidth: "100%" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isStreamer}
            disabled={saving}
            onChange={(e) => void persist({ isStreamer: e.target.checked, isPro })}
          />
          <span>Стример</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isPro}
            disabled={saving}
            onChange={(e) => void persist({ isStreamer, isPro: e.target.checked })}
          />
          <span>Про игрок</span>
        </label>
        {saving ? <span style={{ fontSize: 13, opacity: 0.75 }}>Сохранение…</span> : null}
      </div>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Метки хранятся локально (SQLite) и синхронизируются со страницей «Отслеживание»: стример → список стримеров, про игрок →
        список киберспорта. В PUBG API не отправляются. «ТОП 500» выставляется автоматически при открытии страницы лидерборда
        для соответствующего режима (до 500 ников с непустым именем в ответе API).
      </p>
    </div>
  );
}
