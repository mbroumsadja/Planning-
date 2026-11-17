import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planning de stage",
  description:
    "Génère des plannings de stage (gardes, permanences, repos) à partir d'une rotation définie par l'administration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Figtree:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="no-print border-b border-paper-line bg-paper-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
            <Link href="/" className="font-display text-2xl text-ink">
              Planning<span className="text-brand">.</span>
            </Link>
            <nav className="flex items-center gap-2 text-base">
              <Link href="/" className="rounded-full px-4 py-2 text-ink-soft hover:bg-paper-tint hover:text-ink">
                Générer
              </Link>
              <Link
                href="/admin"
                className="rounded-full px-4 py-2 text-ink-soft hover:bg-paper-tint hover:text-ink"
              >
                Administration
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">{children}</main>
      </body>
    </html>
  );
}
