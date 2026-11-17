export type ShiftType = "garde" | "permanence" | "repos";
export type CellType = ShiftType | "off";

export const SHIFT_LABEL: Record<ShiftType, string> = {
  garde: "Garde",
  permanence: "Permanence",
  repos: "Repos",
};

export const SHIFT_CODE: Record<CellType, string> = {
  garde: "G",
  permanence: "P",
  repos: "R",
  off: "·",
};

/** Un bloc de la rotation : par exemple 2 jours de permanence. */
export interface CycleBlock {
  type: ShiftType;
  days: number;
}

/** Règle de rotation propre à un hôpital. */
export interface Rotation {
  /** Suite de blocs qui se répète du premier au dernier jour du stage. */
  cycle: CycleBlock[];
  /** Décalage, en jours actifs, entre deux stagiaires consécutifs. */
  staggerDays: number;
  /** Si faux, les samedis et dimanches ne comptent pas dans la rotation. */
  includeWeekends: boolean;
  hours: { garde: string; permanence: string };
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  /** Précision facultative (service, particularité de l'organisation). */
  description: string;
  rotation: Rotation;
}

export interface PlanningRequest {
  groupName: string;
  members: string[];
  startDate: string; // AAAA-MM-JJ
  endDate: string; // AAAA-MM-JJ
  hospital: Hospital;
}

export interface PlanningDay {
  iso: string;
  day: number;
  month: number; // 0-11
  year: number;
  weekday: number; // 0 = dimanche
  isWeekend: boolean;
  /** Faux pour un week-end exclu de la rotation. */
  active: boolean;
}

export interface MemberStats {
  garde: number;
  permanence: number;
  repos: number;
}

export interface MemberRow {
  name: string;
  cells: CellType[];
  stats: MemberStats;
}

export interface Planning {
  request: PlanningRequest;
  days: PlanningDay[];
  rows: MemberRow[];
  /** Nombre de stagiaires de garde chaque jour. */
  gardeCoverage: number[];
}
