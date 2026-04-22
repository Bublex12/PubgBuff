"use client";

import { useEffect, useRef } from "react";

import { rememberRecentPlayer } from "@/lib/recentPlayers";

type Props = {
  playerName: string;
};

export function RecentPlayerRecorder({ playerName }: Props) {
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      return;
    }

    if (lastRecorded.current === trimmed) {
      return;
    }

    lastRecorded.current = trimmed;
    rememberRecentPlayer(trimmed);
  }, [playerName]);

  return null;
}
