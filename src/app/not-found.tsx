import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container">
      <section className="card stack">
        <h1 className="page-title">Страница не найдена</h1>
        <p className="text-muted">Проверьте адрес или вернитесь на главную.</p>
        <Link href="/" className="button">
          На главную
        </Link>
      </section>
    </main>
  );
}
