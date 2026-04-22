"use client";

import { PubgHomeHero } from "@/components/PubgHomeHero";
import { RecentPlayersPanel } from "@/components/RecentPlayersPanel";

export default function Home() {
  return (
    <main className="container container--home homeStack">
      <PubgHomeHero />
      <RecentPlayersPanel />
    </main>
  );
}
