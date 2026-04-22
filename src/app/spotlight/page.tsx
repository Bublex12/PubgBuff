import Link from "next/link";

import { SpotlightSettings } from "@/components/SpotlightSettings";

export default function SpotlightPage() {
  return (
    <main className="container">
      <section className="card stack">
        <div className="row">
          <h1 className="page-title">Отслеживание</h1>
          <div className="page-toolbar">
            <Link className="linkButton" href="/">
              На главную
            </Link>
          </div>
        </div>
        <p className="text-muted">
          Списки в SQLite; те же ники участвуют в метках в профиле и в таблице матчей.
        </p>
      </section>

      <SpotlightSettings />
    </main>
  );
}
