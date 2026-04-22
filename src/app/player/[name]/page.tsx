import Link from "next/link";

import { LobbyPlayerCombobox } from "@/components/LobbyPlayerCombobox";
import { MatchFlagIcons } from "@/components/MatchFlagIcons";
import { NickLink } from "@/components/NickLink";
import { PlayerProfileFlags } from "@/components/PlayerProfileFlags";
import { RecentPlayerRecorder } from "@/components/RecentPlayerRecorder";
import { TelemetryRequestButton } from "@/components/TelemetryRequestButton";
import { getPlayerProfileMark } from "@/lib/playerProfileMarks";
import { getPlayerDashboard } from "@/lib/pubg/ingestion";

type PageProps = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ platform?: string; refresh?: string; map?: string; with?: string; withId?: string }>;
};

export default async function PlayerPage({ params, searchParams }: PageProps) {
  const { name } = await params;
  const query = await searchParams;
  const platform = query.platform?.trim().toLowerCase();
  const forceRefresh = query.refresh === "1";
  const mapFilter = query.map?.trim() ?? "";
  /** Устаревший параметр: фильтр по нику без account id. */
  const withNameLegacy = query.with?.trim() ?? "";
  const withIdParam = query.withId?.trim() ?? "";

  let dashboard;
  let errorMessage: string | null = null;
  try {
    dashboard = await getPlayerDashboard(name, { forceRefresh });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
  }

  if (!dashboard) {
    return (
      <main className="container">
        <section className="card stack">
          <h1>Не удалось загрузить игрока</h1>
          <p>
            Ник:{" "}
            <strong>
              <NickLink name={decodeURIComponent(name)} />
            </strong>
            {" "}
            · платформа: <strong>steam</strong>
            {platform && platform !== "steam" ? (
              <>
                {" "}
                (в URL указано <strong>{platform}</strong>, но этот проект сейчас работает только со <strong>steam</strong>)
              </>
            ) : null}
          </p>

          <pre className="errorBox">{errorMessage}</pre>

          <div className="stack">
            <p>
              Частые причины: ник в API не совпадает с отображаемым ником в клиенте, аккаунт не на <strong>Steam</strong> shard,
              либо пустой/неверный <strong>PUBG_API_KEY</strong>.
            </p>

            <div className="row">
              <Link className="linkButton" href="/">
                Назад
              </Link>
              <Link className="button" href={`/player/${encodeURIComponent(name)}?refresh=1`}>
                Повторить запрос
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const profileMark = await getPlayerProfileMark(dashboard.playerName);

  const playerPath = `/player/${encodeURIComponent(name)}`;
  const buildFilterQuery = (overrides: { map?: string; withId?: string }) => {
    const sp = new URLSearchParams();
    if (forceRefresh) {
      sp.set("refresh", "1");
    }
    const m = overrides.map !== undefined ? overrides.map : mapFilter;
    const id = overrides.withId !== undefined ? overrides.withId : withIdParam;
    if (m) {
      sp.set("map", m);
    }
    if (id) {
      sp.set("withId", id);
    }
    const qs = sp.toString();
    return qs ? `${playerPath}?${qs}` : playerPath;
  };

  const selectedWithId =
    withIdParam ||
    (withNameLegacy
      ? dashboard.playedWith.find((p) => p.name.toLowerCase() === withNameLegacy.toLowerCase())?.playerId ?? ""
      : "");

  let displayMatches = dashboard.recentMatches;
  if (mapFilter) {
    displayMatches = displayMatches.filter((m) => m.mapNameRaw === mapFilter);
  }
  if (withIdParam) {
    displayMatches = displayMatches.filter((m) => m.lobbyPlayers.some((p) => p.playerId === withIdParam));
  } else if (withNameLegacy) {
    const wl = withNameLegacy.toLowerCase();
    displayMatches = displayMatches.filter((m) => m.lobbyPlayers.some((p) => p.name.toLowerCase() === wl));
  }

  const filtersActive = Boolean(mapFilter || withIdParam || withNameLegacy);

  return (
    <main className="container">
      <RecentPlayerRecorder playerName={dashboard.playerName} />
      <section className="card card--hero stack">
        <div className="row">
          <h1 className="page-title">
            <NickLink variant="title" name={dashboard.playerName} />
          </h1>
          <div className="page-toolbar">
            <Link className="linkButton" href="/">
              Новый поиск
            </Link>
            <Link className="button" href={`/player/${encodeURIComponent(name)}?refresh=1`}>
              Обновить API
            </Link>
          </div>
        </div>

        <p className="text-muted">
          Платформа <strong style={{ color: "var(--foreground)" }}>{dashboard.platform}</strong>
          {" · "}
          обновлено {new Date(dashboard.refreshedAt).toLocaleString("ru-RU")}
        </p>

        <div className="profileMarksBlock">
          <p className="eyebrow">Метки профиля</p>
          <PlayerProfileFlags
            encodedPlayerPath={encodeURIComponent(dashboard.playerName)}
            initialStreamer={profileMark?.isStreamer ?? false}
            initialPro={profileMark?.isPro ?? false}
            initialTop500={profileMark?.isTop500 ?? false}
            initialTop500Rank={profileMark?.top500Rank ?? null}
            initialTop500SeasonId={profileMark?.top500SeasonId ?? null}
            initialTop500GameMode={profileMark?.top500GameMode ?? null}
          />
        </div>
      </section>

      <section className="grid">
        <article className="card card--stat stack">
          <h2>Профиль</h2>
          <ul className="statList">
            <li>
              <span>Матчей</span>
              <strong>{dashboard.profile.matches}</strong>
            </li>
            <li>
              <span>Побед</span>
              <strong>{dashboard.profile.wins}</strong>
            </li>
            <li>
              <span>Топ-10</span>
              <strong>{dashboard.profile.top10}</strong>
            </li>
            <li>
              <span>KD</span>
              <strong>{dashboard.profile.kd}</strong>
            </li>
            <li>
              <span>Winrate</span>
              <strong>{dashboard.profile.winRate}%</strong>
            </li>
            <li>
              <span>Avg damage</span>
              <strong>{dashboard.profile.avgDamage}</strong>
            </li>
          </ul>
        </article>

        <article className="card card--stat stack">
          <h2>Оружие (Mastery)</h2>
          <ul className="statList">
            {dashboard.weaponMastery.length === 0 && (
              <li>
                <span>Mastery</span>
                <span className="text-muted" style={{ fontWeight: 500 }}>
                  нет данных
                </span>
              </li>
            )}
            {dashboard.weaponMastery.map((weapon) => (
              <li key={weapon.weaponRaw} title={weapon.weaponRaw}>
                <span>{weapon.weapon}</span>
                <strong>
                  lvl {weapon.levelCurrent} · {weapon.xpTotal.toLocaleString("ru-RU")} xp
                </strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card stack">
        <h2>По картам</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Карта</th>
                <th>Матчи</th>
                <th>Победы</th>
                <th>Winrate</th>
                <th>Avg Kills</th>
                <th>Avg Damage</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.byMap.map((item) => (
                <tr key={item.mapName}>
                  <td title={item.mapNameRaw}>{item.mapName}</td>
                  <td>{item.matches}</td>
                  <td>{item.wins}</td>
                  <td>{item.winRate}%</td>
                  <td>{item.avgKills}</td>
                  <td>{item.avgDamage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <h2>Друзья в пати</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Игрок</th>
                <th>Матчей вместе</th>
                <th>Побед вместе</th>
                <th>Winrate</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.teammates.length === 0 && (
                <tr>
                  <td colSpan={4}>Пока нет данных по друзьям. Добавь ники в `PUBG_FRIENDS`.</td>
                </tr>
              )}
              {dashboard.teammates.map((item) => (
                <tr key={item.teammateName}>
                  <td>
                    <NickLink name={item.teammateName} />
                  </td>
                  <td>{item.matchesTogether}</td>
                  <td>{item.winsTogether}</td>
                  <td>{item.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <h2>Последние матчи</h2>
        <p className="text-muted">До 30 матчей из кэша. Лобби — все игроки матча.</p>
        <details className="blockDetails">
          <summary>Справка по колонке «Метки»</summary>
          <p className="blockDetailsBody text-muted">
            Совпадения с метками профиля (стример / про / топ-500) и списком «Отслеживание» (С / П). «Т» — топ-500 из
            лидерборда.
          </p>
        </details>
        <form method="get" action={playerPath} className="row form-filter">
          {forceRefresh ? <input type="hidden" name="refresh" value="1" /> : null}
          <label className="form-label" style={{ minWidth: "12rem" }}>
            Карта
            <select name="map" className="select" defaultValue={mapFilter} style={{ width: "100%", minWidth: 0 }}>
              <option value="">Все карты</option>
              {dashboard.byMap.map((item) => (
                <option key={item.mapNameRaw} value={item.mapNameRaw}>
                  {item.mapName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label" style={{ minWidth: "min(18rem, 100%)" }}>
            Игрок в лобби
            <LobbyPlayerCombobox fieldName="withId" options={dashboard.playedWith} defaultPlayerId={selectedWithId} />
          </label>
          <button type="submit" className="button">
            Применить
          </button>
          {filtersActive && (
            <Link className="linkButton" href={buildFilterQuery({ map: "", withId: "" })}>
              Сбросить
            </Link>
          )}
        </form>
        <p className="text-muted">
          Показано {displayMatches.length} из {dashboard.recentMatches.length}
        </p>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th title="Стример / про / топ-500 в составе лобби">Метки</th>
                <th>Матч</th>
                <th>Телеметрия</th>
                <th>Карта</th>
                <th>Режим</th>
                <th>Место</th>
                <th>K/A</th>
                <th>Урон</th>
                <th>Сек</th>
              </tr>
            </thead>
            <tbody>
              {displayMatches.length === 0 && (
                <tr>
                  <td colSpan={10}>Нет матчей по выбранным фильтрам.</td>
                </tr>
              )}
              {displayMatches.map((match) => (
                <tr key={match.matchId}>
                  <td>{new Date(match.createdAt).toLocaleString("ru-RU")}</td>
                  <td>
                    <MatchFlagIcons presence={match.matchFlagPresence} />
                  </td>
                  <td>
                    <Link className="linkButton" href={`/match/${encodeURIComponent(match.matchId)}`}>
                      Открыть
                    </Link>
                  </td>
                  <td>
                    <TelemetryRequestButton matchId={match.matchId} />
                  </td>
                  <td title={match.mapNameRaw}>{match.mapName}</td>
                  <td>{match.gameMode}</td>
                  <td>{match.placement || match.winPlace}</td>
                  <td>
                    {match.kills}/{match.assists}
                  </td>
                  <td>{Math.round(match.damageDealt)}</td>
                  <td>{Math.round(match.timeSurvived)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
