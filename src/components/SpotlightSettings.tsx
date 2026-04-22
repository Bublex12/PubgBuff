"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  role: "streamer" | "esports";
  value: string;
};

export function SpotlightSettings() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<"streamer" | "esports">("streamer");
  const [addValue, setAddValue] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/spotlight");
    if (!response.ok) {
      setError("Не удалось загрузить список");
      return;
    }
    const payload = (await response.json()) as { entries?: Entry[] };
    setEntries(payload.entries ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() =>
      refresh()
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        }),
    );
  }, [refresh]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = addValue.trim();
    if (!value) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/spotlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: addRole, value }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Ошибка сохранения");
        return;
      }
      setAddValue("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    const response = await fetch(`/api/spotlight/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(typeof (payload as { error?: string }).error === "string" ? (payload as { error: string }).error : "Не удалось удалить");
      return;
    }
    await refresh();
  }

  const streamers = entries.filter((e) => e.role === "streamer");
  const esports = entries.filter((e) => e.role === "esports");

  return (
    <div className="stack">
      {error ? <pre className="errorBox">{error}</pre> : null}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Добавить</h2>
        <p style={{ opacity: 0.85, fontSize: 14 }}>
          Укажи <strong>accountId</strong> (<code>account.xxx</code>) или <strong>ник</strong> как в матче — совпадение без учёта регистра.
        </p>
        <form className="row" onSubmit={onAdd}>
          <select
            className="input"
            style={{ width: "auto", minWidth: 160 }}
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as "streamer" | "esports")}
            aria-label="Тип"
          >
            <option value="streamer">Стример</option>
            <option value="esports">Киберспорт</option>
          </select>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="account.xxx или ник"
            aria-label="Account или ник"
          />
          <button className="button" type="submit" disabled={saving}>
            {saving ? "…" : "Добавить"}
          </button>
        </form>
      </section>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <div className="grid">
          <section className="card stack">
            <h3 style={{ margin: 0 }}>Стримеры ({streamers.length})</h3>
            <ul className="statList">
              {streamers.length === 0 && <li>Пока пусто</li>}
              {streamers.map((row) => (
                <li key={row.id} className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
                  <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{row.value}</code>
                  <button type="button" className="linkButton" onClick={() => onDelete(row.id)}>
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card stack">
            <h3 style={{ margin: 0 }}>Киберспорт ({esports.length})</h3>
            <ul className="statList">
              {esports.length === 0 && <li>Пока пусто</li>}
              {esports.map((row) => (
                <li key={row.id} className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
                  <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{row.value}</code>
                  <button type="button" className="linkButton" onClick={() => onDelete(row.id)}>
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <p style={{ fontSize: 14, opacity: 0.85 }}>
        <Link className="linkButton" href="/">
          На главную
        </Link>
      </p>
    </div>
  );
}
