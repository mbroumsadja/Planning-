import type { Hospital } from "./types";

/**
 * Registre des hôpitaux et de leur rotation.
 *
 * Pour ajouter un hôpital : copier un bloc ci-dessous, changer `id` (unique, sans espace),
 * `name`, `city` et le `cycle`. Le cycle se répète du premier au dernier jour du stage :
 * { type: "garde" | "permanence" | "repos", days: nombre de jours }.
 *
 * `staggerDays` : décalage entre deux stagiaires consécutifs. Avec 1, chacun commence sa
 * rotation un jour après le précédent, ce qui répartit les gardes sur le groupe.
 */
export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: "cma-lainde",
    name: "CMA de Laindé",
    city: "Garoua",
    description: "",
    rotation: {
      cycle: [
        { type: "garde", days: 1 },
        { type: "permanence", days: 1 },
        { type: "repos", days: 1 },
      ],
      staggerDays: 1,
      includeWeekends: true,
      hours: { garde: "", permanence: "" },
    },
  },
  {
    id: "hopital-regional-garoua",
    name: "Hôpital Régional de Garoua",
    city: "Garoua",
    description: "",
    rotation: {
      cycle: [
        { type: "garde", days: 1 },
        { type: "permanence", days: 2 },
        { type: "repos", days: 4 },
      ],
      staggerDays: 1,
      includeWeekends: true,
      hours: { garde: "", permanence: "" },
    },
  },
];

export const STORAGE_KEYS = {
  hospitals: "planning.hospitals.v1",
  draft: "planning.draft.v2",
} as const;

export const newHospital = (): Hospital => ({
  id: `hopital-${Date.now().toString(36)}`,
  name: "Nouvel hôpital",
  city: "",
  description: "",
  rotation: {
    cycle: [
      { type: "garde", days: 1 },
      { type: "repos", days: 1 },
    ],
    staggerDays: 1,
    includeWeekends: true,
    hours: { garde: "", permanence: "" },
  },
});
