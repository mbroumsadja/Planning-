// Toutes les dates sont manipulées en UTC pour éviter les décalages de fuseau.

export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const toISO = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86_400_000);

export const diffDays = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86_400_000);

export const isValidISO = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISO(parseISO(s)) === s;
};

/** Fin d'une période de n mois qui commence à `startISO` (dernier jour inclus). */
export const endOfMonths = (startISO: string, months: number): string => {
  const d = parseISO(startISO);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  return toISO(addDays(end, -1));
};

export const formatLong = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISO(iso));

export const monthLabel = (year: number, month: number): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );

export const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
