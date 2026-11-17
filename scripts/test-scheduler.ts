import assert from "node:assert/strict";
import { DEFAULT_HOSPITALS } from "../lib/hospitals";
import {
  describeCycle,
  generatePlanning,
  parseMembers,
  parseTeams,
  splitIntoTeams,
  toCSV,
  validateRequest,
} from "../lib/scheduler";
import type { CellType, Hospital } from "../lib/types";

const cma = DEFAULT_HOSPITALS.find((h) => h.id === "cma-lainde")!;
const hrg = DEFAULT_HOSPITALS.find((h) => h.id === "hopital-regional-garoua")!;
const names = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const run = (hospital: Hospital, teams: string[][], start = "2026-01-05", end = "2026-01-18") =>
  generatePlanning({ groupName: "G", teams, startDate: start, endDate: end, hospital });
const count = (p: ReturnType<typeof run>, day: number, type: CellType) =>
  p.rows.filter((r) => r.cells[day] === type).length;

// 1. Saisie des noms
assert.deepEqual(parseMembers(" Awa \nBello;  Chantal ,\n\n Awa  Marie "), ["Awa", "Bello", "Chantal", "Awa Marie"]);

// 2. Libellés des rotations (ordre de passage)
assert.equal(describeCycle(cma.rotation), "1 permanence · 1 garde · 1 repos");
assert.equal(describeCycle(hrg.rotation), "2 permanences · 1 garde · 4 repos");

// 3. Formation des équipes : personne n'est seul
const sizes = (n: number, size: number) => splitIntoTeams(names(n), size).map((t) => t.length);
assert.deepEqual(sizes(7, 2), [3, 2, 2]);
assert.deepEqual(sizes(6, 3), [3, 3]);
assert.deepEqual(sizes(5, 3), [3, 2]);
assert.deepEqual(sizes(8, 3), [3, 3, 2]);
assert.deepEqual(sizes(2, 3), [2]);
assert.deepEqual(sizes(9, 2), [3, 2, 2, 2]);
assert.deepEqual(sizes(6, 0), [6]);
assert.deepEqual(sizes(1, 2), [1]);
for (let n = 2; n <= 40; n++) {
  for (const size of [2, 3, 4]) {
    assert.ok(sizes(n, size).every((s) => s >= 2), `équipe seule avec n=${n}, taille=${size}`);
  }
}

// 4. Équipes formées à la main avec une ligne vide
const manual = parseTeams("A\nB\n\nC\nD\nE\n\n", 3);
assert.equal(manual.manual, true);
assert.deepEqual(manual.teams, [["A", "B"], ["C", "D", "E"]]);
assert.equal(parseTeams("A\nB\nC\nD", 2).manual, false);

// 5. CMA, exemple décrit : permanence le 1er jour, garde le 2e, repos le 3e, puis ça recommence
const solo = run(cma, [["A"]]);
assert.deepEqual(solo.rows[0].cells.slice(0, 7), [
  "permanence", "garde", "repos", "permanence", "garde", "repos", "permanence",
]);

// 6. CMA, équipe de 3 : chaque jour, un en permanence, un en garde, un au repos
const t3 = run(cma, [names(3)]);
for (let d = 0; d < t3.days.length; d++) {
  assert.equal(count(t3, d, "permanence"), 1);
  assert.equal(count(t3, d, "garde"), 1);
  assert.equal(count(t3, d, "repos"), 1);
}
// Quand A est en permanence, B est au repos et C en garde
assert.equal(t3.rows[0].cells[0], "permanence");
assert.equal(t3.rows[1].cells[0], "repos");
assert.equal(t3.rows[2].cells[0], "garde");

// 7. CMA, équipe de 2 : quand l'un fait la permanence, l'autre est au repos
const t2 = run(cma, [names(2)]);
assert.deepEqual([t2.rows[0].cells[0], t2.rows[1].cells[0]], ["permanence", "repos"]);

// 8. CMA, équipe nombreuse de 6 : deux personnes par poste chaque jour
const t6 = run(cma, [names(6)]);
for (let d = 0; d < t6.days.length; d++) {
  assert.equal(count(t6, d, "permanence"), 2);
  assert.equal(count(t6, d, "garde"), 2);
  assert.equal(count(t6, d, "repos"), 2);
}

// 9. Hôpital Régional : 2 permanences, 1 garde, 4 repos (cycle de 7 jours)
const h1 = run(hrg, [["A"]], "2026-01-05", "2026-01-18");
assert.deepEqual(h1.rows[0].cells.slice(0, 8), [
  "permanence", "permanence", "garde", "repos", "repos", "repos", "repos", "permanence",
]);
// Une équipe de 7 couvre la garde tous les jours
const h7 = run(hrg, [names(7)], "2026-01-05", "2026-02-01");
assert.ok(h7.gardeCoverage.every((n) => n === 1));
assert.equal(h7.rows[0].stats.garde, 4); // 28 jours = 4 cycles

// 10. Plusieurs équipes : chacune suit sa propre répartition, l'ordre des lignes suit les équipes
const two = run(cma, [["A", "B"], ["C", "D", "E"]]);
assert.deepEqual(two.rows.map((r) => r.team), [0, 0, 1, 1, 1]);
assert.equal(two.rows[2].cells[0], "permanence"); // C, premier de l'équipe 2, repart du début du cycle

// 11. Week-ends exclus : grisés, sans consommer de jour du cycle
const noWeekend: Hospital = {
  ...cma,
  rotation: { ...cma.rotation, includeWeekends: false, cycle: [{ type: "garde", days: 1 }, { type: "permanence", days: 1 }] },
};
const nw = run(noWeekend, [["A"]], "2026-01-09", "2026-01-12"); // vendredi à lundi
assert.deepEqual(nw.rows[0].cells, ["garde", "off", "off", "permanence"]);

// 12. Statistiques : total des cellules actives = nombre de jours actifs
for (const row of t3.rows) {
  const active = row.cells.filter((c) => c !== "off").length;
  assert.equal(row.stats.garde + row.stats.permanence + row.stats.repos, active);
}

// 13. Validation
const ok = { groupName: "G", startDate: "2026-01-01", endDate: "2026-01-31", hospital: cma };
assert.ok(validateRequest({ ...ok, groupName: "", teams: [], startDate: "2026-03-10", endDate: "2026-03-01" }).length >= 3);
assert.equal(validateRequest({ ...ok, teams: [["A", "B"], ["C", "D", "E"]] }).length, 0);
assert.equal(validateRequest({ ...ok, teams: [["A"]] }).length, 0); // un seul stagiaire au total : accepté
assert.ok(validateRequest({ ...ok, teams: [["A"], ["B", "C"]] }).some((e) => e.includes("seul")));
assert.ok(validateRequest({ ...ok, teams: [["Awa", "Bello"], ["awa", "Chantal"]] }).some((e) => e.includes("deux fois")));

// 14. CSV
const csv = toCSV(two);
assert.ok(csv.startsWith("﻿Stagiaire;Équipe;2026-01-05"));
assert.equal(csv.split("\r\n").length, 6);

console.log("Tous les tests du moteur passent.");
