import { NickLink } from "@/components/NickLink";
import type { LeaderboardOverlapResult } from "@/lib/pubg/leaderboardMatchOverlap";

type Props = {
  result: LeaderboardOverlapResult;
};

export function LeaderboardOverlapCard({ result }: Props) {
  if (!result.ok) {
    return (
      <section className="card stack">
        <h2>Топ рейтинга в этом матче</h2>
        <p style={{ opacity: 0.9 }}>Не удалось сравнить с лидербордом: {result.message}</p>
        <p style={{ opacity: 0.75, fontSize: 14 }}>
          Нужен валидный <code>PUBG_API_KEY</code> и поддерживаемый режим лидерборда (часто <code>squad-fpp</code> и т.п.). Рейтинг
          обновляется не для каждого кастомного/ивентового gameMode.
        </p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <h2>Топ рейтинга в этом матче</h2>
      <p style={{ opacity: 0.88, fontSize: 14 }}>
        Сравнение с лидербордом сезона <code>{result.seasonId}</code>, режим API <strong>{result.gameMode}</strong> (первый
        подошедший из вариантов по режиму матча). Проверено <strong>{result.top.length}</strong> игроков из лидерборда · в
        лобби по данным матча <strong>{result.participantCount}</strong> участников.
      </p>
      {result.inMatch.length === 0 ? (
        <p>
          <strong>Ни одного</strong> из топ-{result.top.length} игроков этого лидерборда нет среди участников матча.
        </p>
      ) : (
        <>
          <p>
            В матче из топ-{result.top.length}: <strong>{result.inMatch.length}</strong>
          </p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th># рейтинга</th>
                  <th>Игрок</th>
                </tr>
              </thead>
              <tbody>
                {result.inMatch.map((row) => (
                  <tr key={row.playerId}>
                    <td>{row.rank}</td>
                    <td>
                      {row.name ? <NickLink name={row.name} /> : <code>{row.playerId}</code>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
