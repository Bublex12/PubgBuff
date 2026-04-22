import Link from "next/link";

import { NickLink } from "@/components/NickLink";
import type { SpotlightHit } from "@/lib/spotlightMatch";

type Props = {
  hits: SpotlightHit[];
};

function roleLabel(role: SpotlightHit["roles"][number]): string {
  return role === "streamer" ? "Стример" : "Киберспорт";
}

export function SpotlightMatchCard({ hits }: Props) {
  return (
    <section className="card stack">
      <h2>Стримеры и киберспорт (вручную)</h2>
      <p style={{ opacity: 0.88, fontSize: 14 }}>
        Списки ведутся на странице{" "}
        <Link href="/spotlight" className="tableNickLink">
          Отслеживание
        </Link>{" "}
        и совпадают с метками в профиле игрока (стример / про). Можно указывать <strong>accountId</strong> (
        <code>account.xxx</code>) или <strong>ник</strong>, как в матче. Сравнение без учёта регистра.
      </p>

      {hits.length === 0 ? (
        <p>В этом матче никого из списков нет (или списки ещё пустые).</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Игрок</th>
                <th>Метки</th>
                <th>Совпадение</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((row) => (
                <tr key={row.playerId || row.name}>
                  <td>
                    {row.name ? <NickLink name={row.name} /> : <code>{row.playerId}</code>}
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    {row.roles.map((r) => (
                      <span key={r} className={r === "streamer" ? "spotlightTag streamer" : "spotlightTag esports"}>
                        {roleLabel(r)}
                      </span>
                    ))}
                  </td>
                  <td style={{ fontSize: 13, opacity: 0.85 }}>
                    {row.matchedById && row.matchedByName
                      ? "accountId и ник"
                      : row.matchedById
                        ? "по accountId"
                        : "по нику"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
