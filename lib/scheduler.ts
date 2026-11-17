import { addDays, diffDays, isValidISO, parseISO, toISO } from "./dates";
import type {
  CellType,
  MemberRow,
  Planning,
  PlanningDay,
  PlanningRequest,
  RotationProfile,
} from "./types";

export const MAX_DAYS = 366;
export const MAX_MEMBERS = 60;

/** Transforme une saisie libre (une personne par ligne, ou séparées par des virgules ou points-virgules). */
export function parseMembers(text: string): string[] {
  return text
    .split(/[\n;,]+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export const cycleLength = (profile: RotationProfile): number =>
  profile.cycle.reduce((sum, b) => sum + b.days, 0);

/** Résume une rotation en une ligne : « 1 garde · 1 repos · 4 permanence ». */
export function describeCycle(profile: RotationProfile): string {
  return profile.cycle.map((b) => `${b.days} ${b.type}`).join(" · ");
}

export function validateProfile(profile: RotationProfile): string[] {
  const errors: string[] = [];
  if (!profile.name.trim()) errors.push("Donne un nom à cette rotation.");
  if (profile.cycle.length === 0) errors.push("Ajoute au moins un bloc (garde, permanence ou repos).");
  profile.cycle.forEach((b, i) => {
    if (!Number.isInteger(b.days) || b.days < 1) {
      errors.push(`Bloc ${i + 1} : le nombre de jours doit être un entier d'au moins 1.`);
    }
  });
  if (!Number.isInteger(profile.staggerDays) || profile.staggerDays < 0) {
    errors.push("Le décalage entre stagiaires doit être un entier positif ou nul.");
  }
  return errors;
}

export function validateRequest(req: PlanningRequest): string[] {
  const errors: string[] = [];
  if (!req.groupName.trim()) errors.push("Indique le nom du groupe.");
  if (req.members.length === 0) errors.push("Ajoute au moins un stagiaire.");
  if (req.members.length > MAX_MEMBERS) errors.push(`Maximum ${MAX_MEMBERS} stagiaires par planning.`);
  if (!isValidISO(req.startDate)) errors.push("Choisis le premier jour de stage.");
  if (!isValidISO(req.endDate)) errors.push("Choisis le dernier jour de stage.");
  if (isValidISO(req.startDate) && isValidISO(req.endDate)) {
    const span = diffDays(parseISO(req.startDate), parseISO(req.endDate)) + 1;
    if (span < 1) errors.push("Le dernier jour doit venir après le premier jour.");
    if (span > MAX_DAYS) errors.push(`La période est limitée à ${MAX_DAYS} jours.`);
  }
  errors.push(...validateProfile(req.profile));
  return errors;
}

export function buildDays(startISO: string, endISO: string, includeWeekends: boolean): PlanningDay[] {
  const start = parseISO(startISO);
  const total = diffDays(start, parseISO(endISO)) + 1;
  const days: PlanningDay[] = [];
  for (let i = 0; i < total; i++) {
    const d = addDays(start, i);
    const weekday = d.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    days.push({
      iso: toISO(d),
      day: d.getUTCDate(),
      month: d.getUTCMonth(),
      year: d.getUTCFullYear(),
      weekday,
      isWeekend,
      active: includeWeekends || !isWeekend,
    });
  }
  return days;
}

/** Type de poste pour un jour actif donné, après application du décalage du stagiaire. */
function shiftAt(profile: RotationProfile, activeIndex: number, offset: number): CellType {
  const length = cycleLength(profile);
  let pos = (((activeIndex - offset) % length) + length) % length;
  for (const block of profile.cycle) {
    if (pos < block.days) return block.type;
    pos -= block.days;
  }
  return "off";
}

/**
 * Génère le planning.
 * Le stagiaire n° i suit la même rotation que le premier, retardée de i × décalage jours actifs.
 * Avant son décalage, un stagiaire est compté en repos.
 */
export function generatePlanning(req: PlanningRequest): Planning {
  const { profile } = req;
  const days = buildDays(req.startDate, req.endDate, profile.includeWeekends);

  const rows: MemberRow[] = req.members.map((name, i) => {
    const offset = i * profile.staggerDays;
    const stats = { garde: 0, permanence: 0, repos: 0 };
    let activeIndex = 0;
    const cells: CellType[] = days.map((day) => {
      if (!day.active) return "off";
      const cell = activeIndex < offset ? "repos" : shiftAt(profile, activeIndex, offset);
      activeIndex++;
      if (cell !== "off") stats[cell]++;
      return cell;
    });
    return { name, cells, stats };
  });

  const gardeCoverage = days.map((_, d) => rows.filter((r) => r.cells[d] === "garde").length);

  return { request: req, days, rows, gardeCoverage };
}

/** Aperçu court pour l'administration : deux stagiaires fictifs sur n jours. */
export function previewRows(profile: RotationProfile, count = 28, members = 2): CellType[][] {
  const start = "2026-01-05"; // un lundi
  const planning = generatePlanning({
    groupName: "Aperçu",
    members: Array.from({ length: members }, (_, i) => `S${i + 1}`),
    startDate: start,
    endDate: toISO(addDays(parseISO(start), count - 1)),
    profile,
  });
  return planning.rows.map((r) => r.cells);
}

export function toCSV(planning: Planning): string {
  const header = ["Stagiaire", ...planning.days.map((d) => d.iso), "Gardes", "Permanences", "Repos"];
  const codes: Record<CellType, string> = { garde: "G", permanence: "P", repos: "R", off: "" };
  const lines = planning.rows.map((r) => [
    r.name,
    ...r.cells.map((c) => codes[c]),
    String(r.stats.garde),
    String(r.stats.permanence),
    String(r.stats.repos),
  ]);
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // BOM + séparateur point-virgule : s'ouvre correctement dans Excel en français.
  return "﻿" + [header, ...lines].map((l) => l.map(esc).join(";")).join("\r\n");
}
