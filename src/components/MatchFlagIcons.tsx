import type { MatchFlagPresence } from "@/lib/pubg/types";

type Props = {
  presence: MatchFlagPresence;
};

export function MatchFlagIcons({ presence }: Props) {
  if (!presence.streamer && !presence.pro && !presence.top500) {
    return <span className="text-muted">—</span>;
  }

  return (
    <span className="matchFlagIcons">
      {presence.streamer ? (
        <span className="spotlightTag streamer" key="s" title="В лобби: стример (метка или отслеживание)">
          С
        </span>
      ) : null}
      {presence.pro ? (
        <span className="spotlightTag esports" key="p" title="В лобби: про / киберспорт (метка или отслеживание)">
          П
        </span>
      ) : null}
      {presence.top500 ? (
        <span className="spotlightTag top500Tag" key="t" title="В лобби: топ-500 лидерборда (метка профиля)">
          Т
        </span>
      ) : null}
    </span>
  );
}
