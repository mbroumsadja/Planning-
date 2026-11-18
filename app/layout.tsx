import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import "./globals.css";

export const viewport = { themeColor: "#0F766E" };

export const metadata: Metadata = {
  title: { default: "Planning · plannings de stage", template: "%s · Planning" },
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
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <header className="no-print border-b border-paper-line bg-paper-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
            <Link href="/" aria-label="Planning, accueil" className="rounded-lg">
              <Logo size={30} />
            </Link>
            <nav className="flex items-center gap-0 text-[15px] sm:gap-2 sm:text-base">
              <Link href="/" className="rounded-full px-3 py-2 sm:px-4 text-ink-soft hover:bg-paper-tint hover:text-ink">
                Générer
              </Link>
              <Link
                href="/admin"
                className="rounded-full px-3 py-2 sm:px-4 text-ink-soft hover:bg-paper-tint hover:text-ink"
              >
                Administration
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">{children}</main>
        <footer className="no-print mx-auto max-w-6xl px-5 pb-10 md:px-8">
          <div className="flex items-center justify-between border-t border-paper-line pt-6 text-sm text-ink-soft">
            <Logo size={20} />
            <span>Chaque équipe à son tour.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
