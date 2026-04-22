"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function NavPill({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link className={`siteNavPill${active ? " siteNavPill--active" : ""}`} href={href}>
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = playerName.trim();
    if (!normalized) {
      return;
    }
    router.push(`/player/${encodeURIComponent(normalized)}`);
  }

  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <div className="siteHeaderStart">
          <Link className="siteBrand" href="/">
            PUBG Buff Lite
          </Link>
          <nav className="siteNavRail" aria-label="Разделы">
            <NavPill href="/leaderboard">Лидерборд</NavPill>
            <NavPill href="/spotlight">Отслеживание</NavPill>
          </nav>
        </div>

        <form className="siteSearch siteSearch--bar" onSubmit={onSubmit} role="search">
          <input
            className="input siteSearchInput"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Ник → профиль"
            aria-label="Ник игрока для перехода в профиль"
          />
          <button className="button button--compact siteSearchButton" type="submit">
            Открыть
          </button>
        </form>
      </div>
    </header>
  );
}
