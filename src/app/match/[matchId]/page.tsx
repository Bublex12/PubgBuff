import Link from "next/link";

import { LeaderboardOverlapCard } from "@/components/LeaderboardOverlapCard";
import { MatchFlagIcons } from "@/components/MatchFlagIcons";
import { NickLink } from "@/components/NickLink";
import { SpotlightMatchCard } from "@/components/SpotlightMatchCard";
import { aggregateFlagPresenceForNicks, flagPresenceForNick, hasAnyFlag, loadMatchFlagNameIndex } from "@/lib/matchFlagPresence";
import { getMatchSummary } from "@/lib/pubg/ingestion";
import { getLeaderboardOverlapFromSummary } from "@/lib/pubg/leaderboardMatchOverlap";
import { findSpotlightInMatch } from "@/lib/spotlightMatch";

type PageProps = {
  params: Promise<{ matchId: string }>;
};

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}м ${remainder}с`;
}

export default async function MatchPage({ params }: PageProps) {
  const { matchId } = await params;

  let summary;
  let errorMessage: string | null = null;
  try {
    summary = await getMatchSummary(matchId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
  }

  if (!summary) {
    return (
      <main className="container">
        <section className="card stack">
          <h1>Не удалось загрузить матч</h1>
          <p>
            Match ID: <strong>{matchId}</strong>
          </p>
          <pre className="errorBox">{errorMessage}</pre>
          <Link className="linkButton" href="/">
            На главную
          </Link>
        </section>
      </main>
    );
  }

  const leaderboardOverlap = await getLeaderboardOverlapFromSummary(summary);
  const spotlightHits = await findSpotlightInMatch(summary);
  const flagIndex = await loadMatchFlagNameIndex();

  return (
    <main className="container">
      <section className="card card--hero stack">
        <div className="row">
          <h1 className="page-title">Матч</h1>
          <div className="page-toolbar">
            <Link className="linkButton" href={`/match/${encodeURIComponent(matchId)}/telemetry`}>
              Телеметрия
            </Link>
            <Link className="linkButton" href="/">
              На главную
            </Link>
          </div>
        </div>

        <p className="text-muted matchHeroMeta">
          <code>{summary.matchId}</code>
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          {new Date(summary.createdAt).toLocaleString("ru-RU")}
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          <strong title={summary.mapNameRaw}>{summary.mapName}</strong>
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          {summary.gameMode}
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          {formatSeconds(summary.duration)}
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          {summary.participantCount} игроков
          <span className="matchHeroMetaSep" aria-hidden>
            ·
          </span>
          кастом: {summary.isCustomMatch ? "да" : "нет"}
        </p>
      </section>

      <SpotlightMatchCard hits={spotlightHits} />

      <LeaderboardOverlapCard result={leaderboardOverlap} />

      <section className="card stack">
        <h2>Команды</h2>
        <p className="text-muted">
          По <code>roster</code> из API (сквад в лобби).
        </p>
        <details className="blockDetails">
          <summary>Метки С / П / Т</summary>
          <p className="blockDetailsBody text-muted">
            Как в профиле: стример, про/киберспорт, топ-500 лидерборда и списки «Отслеживание».
          </p>
        </details>

        <div className="stack">
          {summary.teams.map((team) => {
            const teamFlags = aggregateFlagPresenceForNicks(team.players, flagIndex);
            return (
            <div key={team.rosterId} className="card stack">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <h3 style={{ margin: 0 }}>
                  {team.rosterId === "orphan"
                    ? "Игроки без roster-связи"
                    : `Команда · место команды: ${team.teamRank > 0 ? `#${team.teamRank}` : "—"}`}
                  {team.won ? <span> · победа</span> : null}
                </h3>
                <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {hasAnyFlag(teamFlags) ? (
                    <span title="В составе команды есть игроки с метками">
                      <MatchFlagIcons presence={teamFlags} />
                    </span>
                  ) : null}
                  <div style={{ opacity: 0.85, fontSize: 14 }}>
                    squadId: <strong>{team.teamId || "—"}</strong> · игроков: <strong>{team.playerCount}</strong> · ΣK:{" "}
                    <strong>{team.totalKills}</strong> · ΣA: <strong>{team.totalAssists}</strong> · ΣDMG:{" "}
                    <strong>{Math.round(team.totalDamage)}</strong>
                  </div>
                </div>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th title="Метки профиля / отслеживания">Метки</th>
                      <th>Игрок</th>
                      <th>K</th>
                      <th>A</th>
                      <th>Урон</th>
                      <th>HS</th>
                      <th>Место</th>
                      <th>Жив</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((row) => (
                      <tr key={`${team.rosterId}-${row.playerId}-${row.name}`}>
                        <td>
                          <MatchFlagIcons presence={flagPresenceForNick(row.name, flagIndex)} />
                        </td>
                        <td title={row.playerId}>
                          <NickLink name={row.name} />
                        </td>
                        <td>{row.kills}</td>
                        <td>{row.assists}</td>
                        <td>{Math.round(row.damageDealt)}</td>
                        <td>{row.headshotKills}</td>
                        <td>{row.winPlace}</td>
                        <td>{formatSeconds(row.timeSurvived)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h2>Топ по урону</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th title="Метки профиля / отслеживания">Метки</th>
                <th>Игрок</th>
                <th>K</th>
                <th>A</th>
                <th>Урон</th>
                <th>HS</th>
                <th>Место</th>
                <th>Жив</th>
              </tr>
            </thead>
            <tbody>
              {summary.topByDamage.map((row) => (
                <tr key={`${row.playerId}-${row.name}`}>
                  <td>
                    <MatchFlagIcons presence={flagPresenceForNick(row.name, flagIndex)} />
                  </td>
                  <td title={row.playerId}>
                    <NickLink name={row.name} />
                  </td>
                  <td>{row.kills}</td>
                  <td>{row.assists}</td>
                  <td>{Math.round(row.damageDealt)}</td>
                  <td>{row.headshotKills}</td>
                  <td>{row.winPlace}</td>
                  <td>{formatSeconds(row.timeSurvived)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
