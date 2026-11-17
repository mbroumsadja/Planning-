import assert from "node:assert/strict";
import { DEFAULT_HOSPITALS } from "../lib/hospitals";
import {
  describeCycle,
  generatePlanning,
  parseMembers,
  toCSV,
  validateRequest,
} from "../lib/scheduler";
import type { Hospital } from "../lib/types";

const cma = DEFAULT_HOSPITALS.find((h) => h.id === "cma-lainde")!;
const hrg = DEFAULT_HOSPITALS.find((h) => h.id === "hopital-regional-garoua")!;

// 1. Saisie des noms
assert.deepEqual(parseMembers(" Awa \nBello;  Chantal ,\n\n Awa  Marie "), ["Awa", "Bello", "Chantal", "Awa Marie"]);

// 2. Libellés des rotations
assert.equal(describeCycle(cma.rotation), "1 garde · 1 permanence · 1 repos");
assert.equal(describeCycle(hrg.rotation), "1 garde · 2 permanences · 4 repos");

// 3. CMA : 1 garde, 1 permanence, 1 repos
const p1 = generatePlanning({
  groupName: "G1",
  members: ["A", "B", "C"],
  startDate: "2026-01-05",
  endDate: "2026-01-18",
  hospital: cma,
});
assert.equal(p1.days.length, 14);
assert.deepEqual(p1.rows[0].cells.slice(0, 6), ["garde", "permanence", "repos", "garde", "permanence", "repos"]);
// B est décalé d'un jour : repos, puis garde, permanence, repos
assert.deepEqual(p1.rows[1].cells.slice(0, 4), ["repos", "garde", "permanence", "repos"]);
// Avec 3 stagiaires, exactement une garde chaque jour
assert.ok(p1.gardeCoverage.every((n) => n === 1), "une garde par jour au CMA avec 3 stagiaires");

// 4. Hôpital Régional : 1 garde, 2 permanences, 4 repos (cycle de 7 jours)
const p2 = generatePlanning({
  groupName: "G2",
  members: ["A", "B", "C", "D", "E", "F", "G"],
  startDate: "2026-01-05",
  endDate: "2026-02-01",
  hospital: hrg,
});
assert.deepEqual(p2.rows[0].cells.slice(0, 8), [
  "garde", "permanence", "permanence", "repos", "repos", "repos", "repos", "garde",
]);
assert.ok(p2.gardeCoverage.every((n) => n === 1), "une garde par jour à l'hôpital régional avec 7 stagiaires");
assert.equal(p2.rows[0].stats.garde, 4); // 28 jours = 4 cycles

// 5. Week-ends exclus : grisés, sans consommer de jour du cycle
const noWeekend: Hospital = {
  ...cma,
  rotation: {
    ...cma.rotation,
    includeWeekends: false,
    cycle: [{ type: "garde", days: 1 }, { type: "permanence", days: 1 }],
    staggerDays: 0,
  },
};
const p3 = generatePlanning({
  groupName: "G3",
  members: ["A"],
  startDate: "2026-01-09", // vendredi
  endDate: "2026-01-12", // lundi
  hospital: noWeekend,
});
assert.deepEqual(p3.rows[0].cells, ["garde", "off", "off", "permanence"]);

// 6. Statistiques : total des cellules actives = nombre de jours actifs
for (const row of p1.rows) {
  const active = row.cells.filter((c) => c !== "off").length;
  assert.equal(row.stats.garde + row.stats.permanence + row.stats.repos, active);
}

// 7. Validation
const bad = validateRequest({
  groupName: "",
  members: [],
  startDate: "2026-03-10",
  endDate: "2026-03-01",
  hospital: cma,
});
assert.ok(bad.length >= 3, "les erreurs de saisie doivent être détectées");
assert.equal(
  validateRequest({ groupName: "G", members: ["A"], startDate: "2026-01-01", endDate: "2026-01-31", hospital: hrg }).length,
  0,
);

// 8. CSV
const csv = toCSV(p1);
assert.ok(csv.startsWith("﻿Stagiaire;2026-01-05"));
assert.equal(csv.split("\r\n").length, 4);

console.log("Tous les tests du moteur passent.");
