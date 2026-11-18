import type { Hospital } from "./types";

/**
 * Registre des hôpitaux et de leur rotation.
 *
 * Pour ajouter un hôpital : copier un bloc ci-dessous, changer `id` (unique, sans espace),
 * `name`, `city` et le `cycle`.
 *
 * Le cycle est la suite de jours qui se répète, dans l'ordre de passage, du premier au dernier
 * jour du stage : { type: "garde" | "permanence" | "repos", days: nombre de jours }.
 * Exemple CMA : permanence, garde, repos, puis on recommence.
 *
 * Les stagiaires d'une même équipe sont répartis régulièrement sur le cycle pour se relayer.
 */
/** Établissements de Garoua dont la rotation reste à confirmer. */
const A_CONFIRMER: { id: string; name: string }[] = [
  { id: "hopital-general-de-garoua", name: "Hôpital Général de Garoua" },
  { id: "hopital-militaire-de-region-n3", name: "Hôpital Militaire de Région n°3" },
  { id: "hopital-de-la-garnison", name: "Hôpital de la Garnison" },
  { id: "hopital-de-police", name: "Hôpital de Police" },
  { id: "hopital-de-la-cnps", name: "Hôpital de la CNPS" },
  { id: "centre-de-sante-de-garoua-1", name: "Centre de Santé de Garoua 1" },
  { id: "centre-pasteur-du-cameroun", name: "Centre Pasteur du Cameroun" },
  { id: "hopital-esperance-djamboutou", name: "Hôpital Espérance (Djamboutou)" },
  { id: "centre-medical-bethel", name: "Centre médical Bethel" },
  { id: "clinique-southia", name: "Clinique Southia" },
  { id: "centre-de-sante-jesus-sauve-et-guerit", name: "Centre de santé Jésus Sauve et Guérit" },
  { id: "centre-de-sante-martin-luther", name: "Centre de santé Martin Luther" },
  { id: "centre-medico-social-sarepta", name: "Centre médico-social Sarepta" },
  { id: "centre-de-sante-islamique-albiri", name: "Centre de santé islamique Albiri" },
  { id: "clinique-la-vision", name: "Clinique La Vision" },
  { id: "mina-hosp", name: "Mina Hosp" },
  { id: "csi-djamboutou", name: "CSI de Djamboutou" },
  { id: "csi-poumpoumre", name: "CSI de Poumpoumré" },
  { id: "csi-souari", name: "CSI de Souari" },
  { id: "csi-kollere", name: "CSI de Kolléré" },
  { id: "csi-wouro-mal-hamadou", name: "CSI de Wouro Mal Hamadou" },
  { id: "csi-barmare", name: "CSI de Barmaré" },
  { id: "csi-foulbere", name: "CSI de Foulbéré" },
  { id: "csi-kotta-liddire", name: "CSI de Kotta Liddire" },
  { id: "csi-ngalbidje", name: "CSI de Ngalbidjé" },
  { id: "csi-roumde-adja", name: "CSI de Roumdé Adja" },
  { id: "csi-garoua-winde", name: "CSI de Garoua Winde" },
  { id: "csi-takasko", name: "CSI de Takasko" },
  { id: "csi-ouro-kanady", name: "CSI de Ouro Kanady" },
  { id: "csi-nassarao", name: "CSI de Nassarao" },
  { id: "csi-tinguelin", name: "CSI de Tinguelin" },
  { id: "csi-lowel", name: "CSI de Lowel" },
  { id: "csi-kismatari", name: "CSI de Kismatari" },
  { id: "csi-djalingo", name: "CSI de Djalingo" },
  { id: "csi-sanguere-ngal", name: "CSI de Sanguéré Ngal" },
  { id: "csi-babbla", name: "CSI de Babbla" },
  { id: "csi-dengui", name: "CSI de Dengui" },
];

const provisoire = (h: { id: string; name: string }): Hospital => ({
  id: h.id,
  name: h.name,
  city: "Garoua",
  description: "Rotation à confirmer dans l'administration.",
  rotation: {
    cycle: [
      { type: "permanence", days: 1 },
      { type: "garde", days: 1 },
      { type: "repos", days: 1 },
    ],
    includeWeekends: true,
    hours: { garde: "", permanence: "" },
  },
});

export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: "cma-lainde",
    name: "CMA de Laindé",
    city: "Garoua",
    description: "",
    rotation: {
      cycle: [
        { type: "permanence", days: 1 },
        { type: "garde", days: 1 },
        { type: "repos", days: 1 },
      ],
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
        { type: "permanence", days: 2 },
        { type: "garde", days: 1 },
        { type: "repos", days: 4 },
      ],
      includeWeekends: true,
      hours: { garde: "", permanence: "" },
    },
  },
  ...A_CONFIRMER.map(provisoire),
];

export const STORAGE_KEYS = {
  hospitals: "planning.hospitals.v1",
  draft: "planning.draft.v3",
} as const;

export const newHospital = (): Hospital => ({
  id: `hopital-${Date.now().toString(36)}`,
  name: "Nouvel hôpital",
  city: "",
  description: "",
  rotation: {
    cycle: [
      { type: "permanence", days: 1 },
      { type: "garde", days: 1 },
      { type: "repos", days: 1 },
    ],
    includeWeekends: true,
    hours: { garde: "", permanence: "" },
  },
});
