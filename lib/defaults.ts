import type { RotationProfile } from "./types";

/** Rotations proposées au premier lancement. L'administration peut les modifier ou en créer d'autres. */
export const DEFAULT_PROFILES: RotationProfile[] = [
  {
    id: "garde-classique",
    name: "Garde et repos de récupération",
    description: "Un jour de garde, un jour de repos après la garde, puis des jours de permanence.",
    cycle: [
      { type: "garde", days: 1 },
      { type: "repos", days: 1 },
      { type: "permanence", days: 4 },
    ],
    staggerDays: 1,
    includeWeekends: true,
    hours: { garde: "16h - 8h", permanence: "8h - 16h" },
  },
  {
    id: "permanence-seule",
    name: "Permanence uniquement",
    description: "Pour les services sans garde : permanence en semaine, repos le week-end.",
    cycle: [
      { type: "permanence", days: 5 },
      { type: "repos", days: 2 },
    ],
    staggerDays: 0,
    includeWeekends: true,
    hours: { garde: "", permanence: "8h - 16h" },
  },
];

export const STORAGE_KEYS = {
  profiles: "planning.profiles.v1",
  draft: "planning.draft.v1",
} as const;

export const newProfile = (): RotationProfile => ({
  id: `rot-${Date.now().toString(36)}`,
  name: "Nouvelle rotation",
  description: "",
  cycle: [
    { type: "garde", days: 1 },
    { type: "repos", days: 1 },
  ],
  staggerDays: 1,
  includeWeekends: true,
  hours: { garde: "", permanence: "" },
});
