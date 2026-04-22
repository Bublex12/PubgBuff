"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  clearRecentPlayers,
  getRecentPlayersSnapshot,
  getRecentPlayersSnapshotServer,
  parseRecentPlayersSnapshot,
  removeRecentPlayer,
  subscribeRecentPlayers,
} from "@/lib/recentPlayers";

export function RecentPlayersPanel() {
  const snapshot = useSyncExternalStore(subscribeRecentPlayers, getRecentPlayersSnapshot, getRecentPlayersSnapshotServer);
  const items = useMemo(() => parseRecentPlayersSnapshot(snapshot), [snapshot]);

  const hasItems = items.length > 0;

  return (
    <section className="card stack">
      <div className="row">
        <h2>Недавние</h2>
        {hasItems ? (
          <button
            type="button"
            className="linkButton"
            onClick={() => {
              clearRecentPlayers();
            }}
          >
            Очистить всё
          </button>
        ) : null}
      </div>

      {!hasItems ? <p className="text-muted">Пусто — ник появится после открытия профиля.</p> : null}

      {hasItems ? (
        <div className="chips">
          {items.map((item) => (
            <div key={item.name} className="chip">
              <Link className="chipLink" href={`/player/${encodeURIComponent(item.name)}`}>
                {item.name}
              </Link>
              <span className="chipMeta">
                {new Date(item.lastVisitedAt).toLocaleString("ru-RU", {
                  timeZone: "UTC",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                type="button"
                className="chipRemove"
                aria-label={`Удалить ${item.name} из истории`}
                onClick={() => {
                  removeRecentPlayer(item.name);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
