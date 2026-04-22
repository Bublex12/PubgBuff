"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TelemetryStatus = "idle" | "downloading" | "ready" | "error" | string;

type Props = {
  matchId: string;
};

export function TelemetryRequestButton({ matchId }: Props) {
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<TelemetryStatus>("idle");
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const label = useMemo(() => {
    if (isWorking) {
      return "Загрузка…";
    }
    if (status === "ready" && typeof eventCount === "number") {
      return `Телеметрия: ${eventCount}`;
    }
    if (status === "error") {
      return "Повторить телеметрию";
    }
    return "Запросить телеметрию";
  }, [eventCount, isWorking, status]);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/telemetry`, { method: "GET" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        status?: TelemetryStatus;
        eventCount?: number | null;
        errorMessage?: string | null;
      };

      if (!isMountedRef.current) {
        return;
      }

      if (payload.status) {
        setStatus(payload.status);
      }
      if (typeof payload.eventCount === "number") {
        setEventCount(payload.eventCount);
      }
      setErrorMessage(payload.errorMessage ?? null);
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setStatus("error");
      setErrorMessage("Не удалось связаться с сервером (dev-сервер остановлен или другой порт).");
    }
  }, [matchId]);

  useEffect(() => {
    isMountedRef.current = true;

    void Promise.resolve().then(() => refreshStatus());

    return () => {
      isMountedRef.current = false;
    };
  }, [matchId, refreshStatus]);

  async function onClick(force: boolean) {
    setIsWorking(true);
    setErrorMessage(null);
    try {
      const url = `/api/matches/${encodeURIComponent(matchId)}/telemetry${force ? "?force=1" : ""}`;
      let response: Response;
      let payload: unknown;

      try {
        response = await fetch(url, { method: "POST" });
        payload = await response.json();
      } catch {
        if (!isMountedRef.current) {
          return;
        }

        setStatus("error");
        setErrorMessage("Не удалось связаться с сервером (dev-сервер остановлен или другой порт).");
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(
          typeof (payload as { error?: unknown })?.error === "string"
            ? (payload as { error: string }).error
            : "Ошибка запроса",
        );
        return;
      }

      if ((payload as { status?: unknown })?.status === "ready") {
        setStatus("ready");
        setEventCount(
          typeof (payload as { eventCount?: unknown }).eventCount === "number"
            ? (payload as { eventCount: number }).eventCount
            : null,
        );
        return;
      }

      if ((payload as { status?: unknown })?.status === "error") {
        setStatus("error");
        setErrorMessage(
          typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "Ошибка телеметрии",
        );
        return;
      }

      await refreshStatus();
    } finally {
      if (isMountedRef.current) {
        setIsWorking(false);
      }
    }
  }

  const disabled = isWorking || (status === "ready" && !errorMessage);

  return (
    <div className="telemetryCell">
      <div className="telemetryActions">
        <button type="button" className="linkButton" disabled={disabled} onClick={() => onClick(status === "error")}>
          {label}
        </button>
        {status === "ready" && !errorMessage ? (
          <Link className="linkButton" href={`/match/${encodeURIComponent(matchId)}/telemetry`}>
            Сводка
          </Link>
        ) : null}
      </div>
      {errorMessage ? <div className="telemetryError" title={errorMessage}>ошибка</div> : null}
    </div>
  );
}
