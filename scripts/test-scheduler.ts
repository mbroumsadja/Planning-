import assert from "node:assert/strict";
import { DEFAULT_PROFILES } from "../lib/defaults";
import { generatePlanning, parseMembers, toCSV, validateRequest } from "../lib/scheduler";
import type { RotationProfile } from "../lib/types";

const classic = DEFAULT_PROFILES[0];

// 1. Saisie des noms
assert.deepEqual(parseMembers(" Awa \nBello;  Chantal ,\n\n Awa  Marie "), ["Awa", "Bello", "Chantal", "Awa Marie"]);

// 2. Cycle simple : 1 garde, 1 repos, 4 permanence sur 14 jours, premier stagiaire
const p1 = generatePlanning({
  groupName: "G1",
  members: ["A", "B"],
  startDate: "2026-01-05",
  endDate: "2026-01-18",
  profile: classic,
});
assert.equal(p1.days.length, 14);
assert.deepEqual(p1.rows[0].cells.slice(0, 7), [
  "garde", "repos", "permanence", "permanence", "permanence", "permanence", "garde",
]);
// B est décalé de 1 jour : repos le premier jour, puis sa garde le 2e jour
assert.deepEqual(p1.rows[1].cells.slice(0, 3), ["repos", "garde", "repos"]);
assert.equal(p1.gardeCoverage[0], 1);
assert.equal(p1.gardeCoverage[1], 1);

// 3. Weekends exclus : les samedis et dimanches deviennent "off" et ne consomment pas la rotation
const noWeekend: RotationProfile = {
  ...classic,
  includeWeekends: false,
  cycle: [{ type: "garde", days: 1 }, { type: "permanence", days: 1 }],
  staggerDays: 0,
};
const p2 = generatePlanning({
  groupName: "G2",
  members: ["A"],
  startDate: "2026-01-09", // vendredi
  endDate: "2026-01-12", // lundi
  profile: noWeekend,
});
assert.deepEqual(p2.rows[0].cells, ["garde", "off", "off", "permanence"]);

// 4. Statistiques : total des cellules actives = nombre de jours actifs
const p3 = generatePlanning({
  groupName: "G3",
  members: ["A", "B", "C"],
  startDate: "2026-02-02",
  endDate: "2026-03-01",
  profile: classic,
});
for (const row of p3.rows) {
  const active = row.cells.filter((c) => c !== "off").length;
  assert.equal(row.stats.garde + row.stats.permanence + row.stats.repos, active);
}

// 5. Validation
const bad = validateRequest({
  groupName: "",
  members: [],
  startDate: "2026-03-10",
  endDate: "2026-03-01",
  profile: classic,
});
assert.ok(bad.length >= 3, "les erreurs de saisie doivent être détectées");
assert.ok(validateRequest({ groupName: "G", members: ["A"], startDate: "2026-01-01", endDate: "2026-01-31", profile: classic }).length === 0);

// 6. CSV
const csv = toCSV(p1);
assert.ok(csv.startsWith("﻿Stagiaire;2026-01-05"));
assert.equal(csv.split("\r\n").length, 3);

console.log("Tous les tests du moteur passent.");
