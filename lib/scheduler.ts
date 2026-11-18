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

export const teamLabel = (index: number): string => `Équipe ${index + 1}`;

/** Transforme une saisie libre (une personne par ligne, ou séparées par des virgules ou points-virgules). */
export function parseMembers(text: string): string[] {
  return text
    .split(/[\n;,]+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/**
 * Répartit les noms en équipes dont la taille est proche de `size`.
 * Personne ne reste seul : 7 stagiaires en équipes de 2 donnent 3 + 2 + 2.
 * `size` à 0 : une seule équipe.
 */
export function splitIntoTeams(members: string[], size: number): string[][] {
  const n = members.length;
  if (n === 0) return [];
  if (size <= 0) return [members];
  const count = Math.max(1, Math.min(Math.round(n / size), Math.floor(n / 2)));
  const base = Math.floor(n / count);
  const extra = n % count;
  const teams: string[][] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const length = base + (i < extra ? 1 : 0);
    teams.push(members.slice(cursor, cursor + length));
    cursor += length;
  }
  return teams;
}

/**
 * Lit la saisie des stagiaires.
 * - Une ligne vide entre deux blocs de noms : chaque bloc est une équipe formée à la main.
 * - Sinon : les équipes sont formées automatiquement selon `size`.
 */
export function parseTeams(text: string, size: number): { teams: string[][]; manual: boolean } {
  const blocks = text
    .replace(/\r/g, "")
    .split(/\n[ \t]*\n/)
    .map(parseMembers)
    .filter((b) => b.length > 0);
  if (blocks.length > 1) return { teams: blocks, manual: true };
  return { teams: splitIntoTeams(blocks[0] ?? [], size), manual: false };
}

export const cycleLength = (rotation: Rotation): number =>
  rotation.cycle.reduce((sum, b) => sum + b.days, 0);

/** Résume une rotation en une ligne : « 2 permanences · 1 garde · 4 repos ». */
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
  return errors;
}

export function validateRequest(req: PlanningRequest): string[] {
  const errors: string[] = [];
  const everyone = req.teams.flat();

  if (!req.groupName.trim()) errors.push("Indique le nom du groupe de stagiaires.");
  if (everyone.length === 0) errors.push("Ajoute au moins un stagiaire.");
  if (everyone.length > MAX_MEMBERS) errors.push(`Maximum ${MAX_MEMBERS} stagiaires par planning.`);

  if (everyone.length > 1) {
    req.teams.forEach((team, i) => {
      if (team.length < 2) {
        errors.push(
          `${teamLabel(i)} : ${team[0]} est seul. Une équipe compte au moins 2 stagiaires pour se relayer.`,
        );
      }
    });
  }

  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const name of everyone) {
    const key = name.toLowerCase();
    if (seen.has(key)) duplicated.add(name);
    seen.add(key);
  }
  duplicated.forEach((name) => errors.push(`« ${name} » apparaît deux fois. Ajoute un prénom ou une initiale.`));

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

/** Type de poste pour un jour actif donné, une fois le décalage du stagiaire appliqué. */
function shiftAt(rotation: Rotation, activeIndex: number, offset: number): CellType {
  const length = cycleLength(rotation);
  if (length === 0) return "off";
  let pos = (((activeIndex - offset) % length) + length) % length;
  for (const block of rotation.cycle) {
    if (pos < block.days) return block.type;
    pos -= block.days;
  }
  return "off";
}

/**
 * Décalage d'une équipe dans le cycle, selon son rang parmi les équipes.
 * Les équipes sont réparties régulièrement sur le cycle pour se relayer entre elles :
 * avec 3 équipes sur un cycle de 3 jours, chaque jour une équipe fait la permanence, une la garde
 * et une se repose. Avec 6 équipes sur ce même cycle, elles sont deux par poste.
 */
export function teamOffset(teamIndex: number, teamCount: number, cycleDays: number): number {
  return Math.floor((teamIndex * cycleDays) / teamCount);
}

/**
 * Génère le planning avec la rotation de l'hôpital choisi.
 * Toutes les équipes suivent le même cycle du premier au dernier jour du stage, décalé selon leur rang.
 * Les membres d'une même équipe ont exactement le même planning : ils font la garde, la permanence
 * et le repos le même jour.
 */
export function generatePlanning(req: PlanningRequest): Planning {
  const { rotation } = req.hospital;
  const days = buildDays(req.startDate, req.endDate, rotation.includeWeekends);
  const length = cycleLength(rotation);

  const rows: MemberRow[] = [];
  req.teams.forEach((team, t) => {
    const offset = teamOffset(t, req.teams.length, length);
    team.forEach((name) => {
      const stats = { garde: 0, permanence: 0, repos: 0 };
      let activeIndex = 0;
      const cells: CellType[] = days.map((day) => {
        if (!day.active) return "off";
        const cell = shiftAt(rotation, activeIndex, offset);
        activeIndex++;
        if (cell !== "off") stats[cell]++;
        return cell;
      });
      rows.push({ name, team: t, cells, stats });
    });
  });

  const gardeCoverage = days.map((_, d) => rows.filter((r) => r.cells[d] === "garde").length);

  return { request: req, days, rows, gardeCoverage };
}

/** Aperçu court pour l'administration : une ligne par équipe fictive, sur n jours. */
export function previewRows(hospital: Hospital, count = 28, teams = 3): CellType[][] {
  const start = "2026-01-05"; // un lundi
  const planning = generatePlanning({
    groupName: "Aperçu",
    teams: Array.from({ length: teams }, (_, i) => [`E${i + 1}`]),
    startDate: start,
    endDate: toISO(addDays(parseISO(start), count - 1)),
    hospital,
  });
  return planning.rows.map((r) => r.cells);
}

export function toCSV(planning: Planning): string {
  const header = [
    "Stagiaire",
    "Équipe",
    ...planning.days.map((d) => d.iso),
    "Gardes",
    "Permanences",
    "Repos",
  ];
  const codes: Record<CellType, string> = { garde: "G", permanence: "P", repos: "R", off: "" };
  const lines = planning.rows.map((r) => [
    r.name,
    teamLabel(r.team),
    ...r.cells.map((c) => codes[c]),
    String(r.stats.garde),
    String(r.stats.permanence),
    String(r.stats.repos),
  ]);
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // BOM + séparateur point-virgule : s'ouvre correctement dans Excel en français.
  return "﻿" + [header, ...lines].map((l) => l.map(esc).join(";")).join("\r\n");
}
