"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.2 4.2L17 7l-4.2 1.2L12 12l-1.2-4.8L7 7l4.8-.8L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Hero с главной: сгенерировано через 21st Magic MCP, адаптировано под CSS-токены проекта (без Tailwind/shadcn). */
export function PubgHomeHero() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [ctaHover, setCtaHover] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = playerName.trim();
    if (!normalized) {
      return;
    }
    router.push(`/player/${encodeURIComponent(normalized)}`);
  }

  return (
    <section className="pubgHero" aria-labelledby="pubg-hero-title">
      <div className="pubgHeroAmbient" aria-hidden />
      <div className="pubgHeroOrbs" aria-hidden>
        <span className="pubgHeroOrb pubgHeroOrb--a" />
        <span className="pubgHeroOrb pubgHeroOrb--b" />
      </div>
      <div className="pubgHeroGrid" aria-hidden />

      <div className="pubgHeroInner stack">
        <p className="pubgHeroBadge">
          <IconSpark className="pubgHeroBadgeIcon" />
          <span>PUBG · PC · официальный API</span>
        </p>

        <h1 id="pubg-hero-title" className="pubgHeroTitle">
          Статистика и <span className="pubgHeroTitleAccent">матчи</span>
        </h1>
        <p className="pubgHeroLead">
          Дашборд по нику: последние матчи, карты, mastery по оружию, фильтры лобби и карточки матчей. Платформа в этом
          билде: <strong className="pubgHeroStrong">steam</strong>.
        </p>

        <form onSubmit={onSubmit} className="pubgHeroSearchCard" aria-label="Поиск игрока">
          <div className="pubgHeroSearchRow">
            <div className="pubgHeroInputWrap">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ник в PUBG (как в Steam)"
                className="input pubgHeroInput"
                required
                autoComplete="off"
                spellCheck={false}
                aria-label="Ник игрока"
              />
            </div>
            <button
              type="submit"
              className="button pubgHeroCta"
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
            >
              Открыть дашборд
              <IconChevron className={ctaHover ? "pubgHeroCtaIcon pubgHeroCtaIcon--shift" : "pubgHeroCtaIcon"} />
            </button>
          </div>
          <p className="pubgHeroFootnote">Enter — переход в профиль. Лидерборд и отслеживание — в шапке.</p>
        </form>
      </div>
    </section>
  );
}
