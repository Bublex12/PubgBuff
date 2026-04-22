"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type LobbyPlayerComboboxOption = {
  playerId: string;
  name: string;
  games: number;
};

type Props = {
  /** Имя поля в форме (например `withId`). */
  fieldName: string;
  options: LobbyPlayerComboboxOption[];
  /** Выбранный `playerId` из URL / сервера. */
  defaultPlayerId: string;
};

export function LobbyPlayerCombobox({ fieldName, options, defaultPlayerId }: Props) {
  const [playerId, setPlayerId] = useState(defaultPlayerId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlayerId(defaultPlayerId);
  }, [defaultPlayerId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.playerId === playerId);
  const displayLabel = selected
    ? `${selected.name} (${selected.games})`
    : playerId
      ? `Игрок (id…${playerId.slice(-6)})`
      : "Любой";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  const openPanel = () => {
    setSearch("");
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="lobbyCombo">
      <input type="hidden" name={fieldName} value={playerId} readOnly />
      <button
        type="button"
        className="lobbyComboTrigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLabel}</span>
        <span aria-hidden style={{ opacity: 0.55, flexShrink: 0, fontSize: "0.65rem" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="lobbyComboPanel" role="listbox" aria-label="Игроки лобби">
          <input
            className="input"
            type="search"
            autoComplete="off"
            placeholder="Поиск по нику…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Поиск по нику"
            style={{ width: "100%" }}
            autoFocus
          />
          <ul className="lobbyComboList">
            <li>
              <button
                type="button"
                className={`lobbyComboRow${playerId === "" ? " lobbyComboRow--active" : ""}`}
                onClick={() => {
                  setPlayerId("");
                  setOpen(false);
                }}
              >
                Любой
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="lobbyComboEmpty">Никого не найдено</li>
            ) : (
              filtered.map((o) => (
                <li key={o.playerId}>
                  <button
                    type="button"
                    className={`lobbyComboRow${o.playerId === playerId ? " lobbyComboRow--active" : ""}`}
                    onClick={() => {
                      setPlayerId(o.playerId);
                      setOpen(false);
                    }}
                  >
                    {o.name} <span className="inline-muted">({o.games})</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
