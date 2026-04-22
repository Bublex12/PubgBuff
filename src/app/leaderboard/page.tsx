import Link from "next/link";

import { NickLink } from "@/components/NickLink";
import { getLeaderboardPageData } from "@/lib/pubg/leaderboardView";

const MODES = ["squad-fpp", "solo-fpp", "duo-fpp", "squad", "solo", "duo"] as const;

function seasonPickLabel(resolvedBy: "isCurrentSeason" | "lastNonOffseason" | "lastKnown"): string {
  switch (resolvedBy) {
    case "isCurrentSeason":
      return "текущий сезон по API (isCurrentSeason)";
    case "lastNonOffseason":
      return "последний не‑offseason в ответе /seasons";
    default:
      return "последняя запись в /seasons (нет явного текущего)";
  }
}

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const raw = (query.mode ?? "squad-fpp").trim().toLowerCase();
  const gameMode = (MODES as readonly string[]).includes(raw) ? raw : "squad-fpp";

  const data = await getLeaderboardPageData(gameMode);

  return (
    <main className="container">
      <section className="card stack">
        <div className="row">
          <h1 className="page-title">Лидерборд</h1>
          <div className="page-toolbar">
            <Link className="linkButton" href="/">
              На главную
            </Link>
          </div>
        </div>
        <p className="text-muted">
          API PUBG, сезон и shard из настроек. Профиль — <strong style={{ color: "var(--foreground)" }}>steam</strong>.
          Ошибка 400: проверьте <code>PUBG_LEADERBOARD_SHARD</code> (<code>pc-eu</code>, <code>pc-na</code>…).
        </p>
        <p className="eyebrow" style={{ marginTop: 6 }}>
          Режим
        </p>
        <div className="modePicker">
          {MODES.map((mode) => (
            <Link
              key={mode}
              className={mode === gameMode ? "modePickerPill modePickerPill--active" : "modePickerPill"}
              href={`/leaderboard?mode=${encodeURIComponent(mode)}`}
            >
              {mode}
            </Link>
          ))}
        </div>
      </section>

      {!data.ok ? (
        <section className="card stack">
          <pre className="errorBox">{data.message}</pre>
          <p className="text-muted">
            Частая причина: неверный или пустой <code>PUBG_API_KEY</code>, либо для выбранного <code>gameMode</code> нет таблицы
            лидерборда.
          </p>
        </section>
      ) : (
        <section className="card stack">
          <p className="text-muted">
            Сезон <code>{data.seasonId}</code> ({seasonPickLabel(data.season.resolvedBy)}), режим{" "}
            <strong style={{ color: "var(--foreground)" }}>{data.gameMode}</strong>, строк:{" "}
            <strong style={{ color: "var(--foreground)" }}>{data.rows.length}</strong>
          </p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Игрок</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={`${row.rank}-${row.playerId}`}>
                    <td>{row.rank}</td>
                    <td>
                      {row.name ? <NickLink name={row.name} /> : "—"}
                    </td>
                    <td>
                      <code style={{ fontSize: 12 }}>{row.playerId}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
