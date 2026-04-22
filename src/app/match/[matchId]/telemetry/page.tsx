import Link from "next/link";

import { SpotlightMatchCard } from "@/components/SpotlightMatchCard";
import { getMatchSummary, getTelemetryAnalysis, getTelemetryJob } from "@/lib/pubg/ingestion";
import { buildTelemetryInterpretation } from "@/lib/pubg/telemetryInterpretation";
import { findSpotlightInMatch } from "@/lib/spotlightMatch";

type PageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function MatchTelemetryPage({ params }: PageProps) {
  const { matchId } = await params;
  const job = await getTelemetryJob(matchId);

  if (!job || job.status !== "ready") {
    return (
      <main className="container">
        <section className="card stack">
          <h1>Телеметрия матча</h1>
          <p>
            ID: <strong>{matchId}</strong>
          </p>
          <p>
            Статус в кэше: <strong>{job?.status ?? "нет записи"}</strong>
            {job?.errorMessage ? (
              <>
                {" "}
                · <span title={job.errorMessage}>ошибка</span>
              </>
            ) : null}
          </p>
          <p>
            Сначала на странице игрока нажми <strong>«Запросить телеметрию»</strong> в таблице последних матчей — тогда
            файл подтянется с CDN и появится сводка здесь.
          </p>
          <div className="row">
            <Link className="linkButton" href={`/match/${encodeURIComponent(matchId)}`}>
              К матчу
            </Link>
            <Link className="linkButton" href="/">
              На главную
            </Link>
          </div>
        </section>
      </main>
    );
  }

  let analysis;
  let errorMessage: string | null = null;
  try {
    analysis = await getTelemetryAnalysis(matchId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
  }

  if (!analysis || errorMessage) {
    return (
      <main className="container">
        <section className="card stack">
          <h1>Телеметрия матча</h1>
          <p>ID: {matchId}</p>
          <pre className="errorBox">{errorMessage ?? "Не удалось построить сводку"}</pre>
          <Link className="linkButton" href={`/match/${encodeURIComponent(matchId)}`}>
            К матчу
          </Link>
        </section>
      </main>
    );
  }

  const matchSummary = await getMatchSummary(matchId).catch(() => null);
  const spotlightHits = matchSummary ? await findSpotlightInMatch(matchSummary) : [];
  const interpretation = buildTelemetryInterpretation(analysis.summary, {
    participantCount: matchSummary?.participantCount ?? null,
  });

  const rows = Object.entries(analysis.summary.byType).sort((a, b) => b[1] - a[1]);

  return (
    <main className="container">
      <section className="card stack">
        <div className="row">
          <h1 style={{ margin: 0 }}>Телеметрия</h1>
          <div className="row">
            <Link className="linkButton" href={`/match/${encodeURIComponent(matchId)}`}>
              К матчу
            </Link>
            <Link className="linkButton" href="/">
              На главную
            </Link>
          </div>
        </div>
        <p>
          Событий: <strong>{analysis.eventCount}</strong>
          {analysis.telemetryFetchedAt ? (
            <>
              {" "}
              · загружено в кэш:{" "}
              <strong>{new Date(analysis.telemetryFetchedAt).toLocaleString("ru-RU")}</strong>
            </>
          ) : null}
          {matchSummary ? (
            <>
              {" "}
              · участников в данных матча: <strong>{matchSummary.participantCount}</strong>
            </>
          ) : null}
        </p>
        <p style={{ opacity: 0.85, fontSize: 14 }}>
          Это разбор поля <code>_T</code> у каждого объекта в JSON телеметрии. Полный лог большой (~десятки МБ) в базу не
          кладём — при открытии страницы файл снова качается с CDN (может занять несколько секунд).
        </p>
        <p style={{ opacity: 0.85, fontSize: 14 }}>
          Блоки ниже — <strong>эвристики по счётчикам</strong>, не «истина из API»: точные цепочки боя всегда проверяй по полям
          внутри событий (время, id атаки, персонажи).
        </p>
      </section>

      <SpotlightMatchCard hits={spotlightHits} />

      <section className="card stack">
        <h2>Интерпретация (слои)</h2>
        <div className="grid">
          {interpretation.groups
            .filter((g) => g.count > 0)
            .map((g) => (
              <article key={g.id} className="card stack">
                <div className="row">
                  <h3 style={{ margin: 0 }}>
                    {g.title} · <strong>{g.pct}%</strong> ({g.count})
                  </h3>
                </div>
                <p style={{ opacity: 0.88, fontSize: 14 }}>{g.hint}</p>
                {g.topTypes.length > 0 ? (
                  <ul className="statList" style={{ fontSize: 13 }}>
                    {g.topTypes.map((t) => (
                      <li key={t.type}>
                        <code>{t.type}</code> — {t.count}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Автовыводы</h2>
        <ul className="statList">
          {interpretation.bullets.map((line, i) => (
            <li key={i} style={{ whiteSpace: "normal" }}>
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2>События по типам</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Тип (_T)</th>
                <th>Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([type, count]) => (
                <tr key={type}>
                  <td style={{ whiteSpace: "normal" }}>
                    <code>{type}</code>
                  </td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
