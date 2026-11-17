import { addDays, diffDays, isValidISO, parseISO, toISO } from "./dates";
import type {
  CellType,
  Hospital,
  MemberRow,
  Planning,
  PlanningDay,
  PlanningRequest,
  Rotation,
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

export const cycleLength = (rotation: Rotation): number =>
  rotation.cycle.reduce((sum, b) => sum + b.days, 0);

/** Résume une rotation en une ligne : « 1 garde · 2 permanences · 4 repos ». */
export function describeCycle(rotation: Rotation): string {
  return rotation.cycle
    .map((b) => `${b.days} ${b.type}${b.days > 1 && b.type !== "repos" ? "s" : ""}`)
    .join(" · ");
}

export function validateHospital(hospital: Hospital): string[] {
  const errors: string[] = [];
  const { rotation } = hospital;
  if (!hospital.name.trim()) errors.push("Donne un nom à l'hôpital.");
  if (rotation.cycle.length === 0) errors.push("Ajoute au moins un bloc (garde, permanence ou repos).");
  rotation.cycle.forEach((b, i) => {
    if (!Number.isInteger(b.days) || b.days < 1) {
      errors.push(`Bloc ${i + 1} : le nombre de jours doit être un entier d'au moins 1.`);
    }
  });
  if (!Number.isInteger(rotation.staggerDays) || rotation.staggerDays < 0) {
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
  errors.push(...validateHospital(req.hospital));
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
function shiftAt(rotation: Rotation, activeIndex: number, offset: number): CellType {
  const length = cycleLength(rotation);
  let pos = (((activeIndex - offset) % length) + length) % length;
  for (const block of rotation.cycle) {
    if (pos < block.days) return block.type;
    pos -= block.days;
  }
  return "off";
}

/**
 * Génère le planning avec la rotation de l'hôpital choisi.
 * Le stagiaire n° i suit le même cycle que le premier, retardé de i × décalage jours actifs.
 * Avant son décalage, un stagiaire est compté en repos.
 */
export function generatePlanning(req: PlanningRequest): Planning {
  const { rotation } = req.hospital;
  const days = buildDays(req.startDate, req.endDate, rotation.includeWeekends);

  const rows: MemberRow[] = req.members.map((name, i) => {
    const offset = i * rotation.staggerDays;
    const stats = { garde: 0, permanence: 0, repos: 0 };
    let activeIndex = 0;
    const cells: CellType[] = days.map((day) => {
      if (!day.active) return "off";
      const cell = activeIndex < offset ? "repos" : shiftAt(rotation, activeIndex, offset);
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
export function previewRows(hospital: Hospital, count = 28, members = 2): CellType[][] {
  const start = "2026-01-05"; // un lundi
  const planning = generatePlanning({
    groupName: "Aperçu",
    members: Array.from({ length: members }, (_, i) => `S${i + 1}`),
    startDate: start,
    endDate: toISO(addDays(parseISO(start), count - 1)),
    hospital,
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
