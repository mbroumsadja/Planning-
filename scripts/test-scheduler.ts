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
/** n équipes de `size` stagiaires chacune. */
const teamsOf = (n: number, size: number) =>
  Array.from({ length: n }, (_, t) => Array.from({ length: size }, (_, j) => `E${t + 1}-${j + 1}`));
const run = (hospital: Hospital, teams: string[][], start = "2026-01-05", end = "2026-01-18") =>
  generatePlanning({ groupName: "G", teams, startDate: start, endDate: end, hospital });
/** Nombre d'équipes différentes qui ont ce poste ce jour-là. */
const teamsOn = (p: ReturnType<typeof run>, day: number, type: CellType) =>
  new Set(p.rows.filter((r) => r.cells[day] === type).map((r) => r.team)).size;

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

// 6. Une équipe fait la garde, la permanence et le repos le même jour : tous ses membres ont le même planning
const oneTeam = run(cma, [names(3)]);
assert.deepEqual(oneTeam.rows[1].cells, oneTeam.rows[0].cells);
assert.deepEqual(oneTeam.rows[2].cells, oneTeam.rows[0].cells);
assert.deepEqual(oneTeam.rows[0].cells, solo.rows[0].cells.concat(oneTeam.rows[0].cells.slice(7)).slice(0, 14));

// 7. CMA, 3 équipes : chaque jour, une équipe en permanence, une de garde, une au repos
const t3 = run(cma, teamsOf(3, 2));
for (let d = 0; d < t3.days.length; d++) {
  assert.equal(teamsOn(t3, d, "permanence"), 1);
  assert.equal(teamsOn(t3, d, "garde"), 1);
  assert.equal(teamsOn(t3, d, "repos"), 1);
  for (let t = 0; t < 3; t++) {
    assert.equal(t3.rows[t * 2].cells[d], t3.rows[t * 2 + 1].cells[d], "même poste dans l'équipe");
  }
}
// Quand l'équipe 1 est en permanence, l'équipe 2 est au repos et l'équipe 3 de garde
assert.deepEqual([t3.rows[0].cells[0], t3.rows[2].cells[0], t3.rows[4].cells[0]], ["permanence", "repos", "garde"]);

// 8. CMA, 2 équipes : quand l'une fait la permanence, l'autre est au repos, puis elles s'inversent
const t2 = run(cma, teamsOf(2, 3));
assert.deepEqual([t2.rows[0].cells[0], t2.rows[3].cells[0]], ["permanence", "repos"]);
assert.deepEqual([t2.rows[0].cells[1], t2.rows[3].cells[1]], ["garde", "permanence"]);
assert.deepEqual([t2.rows[0].cells[2], t2.rows[3].cells[2]], ["repos", "garde"]);

// 9. CMA, beaucoup d'équipes (6) : deux équipes par poste chaque jour
const t6 = run(cma, teamsOf(6, 2));
for (let d = 0; d < t6.days.length; d++) {
  assert.equal(teamsOn(t6, d, "permanence"), 2);
  assert.equal(teamsOn(t6, d, "garde"), 2);
  assert.equal(teamsOn(t6, d, "repos"), 2);
}

// 10. Hôpital Régional : 2 permanences, 1 garde, 4 repos (cycle de 7 jours)
const h1 = run(hrg, [["A"]]);
assert.deepEqual(h1.rows[0].cells.slice(0, 8), [
  "permanence", "permanence", "garde", "repos", "repos", "repos", "repos", "permanence",
]);
// 7 équipes : une équipe (et une seule) est de garde chaque jour
const h7 = run(hrg, teamsOf(7, 2), "2026-01-05", "2026-02-01");
for (let d = 0; d < h7.days.length; d++) assert.equal(teamsOn(h7, d, "garde"), 1);
assert.equal(h7.rows[0].stats.garde, 4); // 28 jours = 4 cycles

// 11. Ordre des lignes : les équipes se suivent, chacune avec son décalage
const two = run(cma, [["A", "B"], ["C", "D", "E"]]);
assert.deepEqual(two.rows.map((r) => r.team), [0, 0, 1, 1, 1]);
assert.equal(two.rows[0].cells[0], "permanence"); // équipe 1 : début du cycle
assert.equal(two.rows[2].cells[0], "repos"); // équipe 2 : décalée d'un jour

// 12. Week-ends exclus : grisés, sans consommer de jour du cycle
const noWeekend: Hospital = {
  ...cma,
  rotation: { ...cma.rotation, includeWeekends: false, cycle: [{ type: "garde", days: 1 }, { type: "permanence", days: 1 }] },
};
const nw = run(noWeekend, [["A"]], "2026-01-09", "2026-01-12"); // vendredi à lundi
assert.deepEqual(nw.rows[0].cells, ["garde", "off", "off", "permanence"]);

// 13. Statistiques : total des cellules actives = nombre de jours actifs
for (const row of t3.rows) {
  const active = row.cells.filter((c) => c !== "off").length;
  assert.equal(row.stats.garde + row.stats.permanence + row.stats.repos, active);
}

// 14. Validation
const ok = { groupName: "G", startDate: "2026-01-01", endDate: "2026-01-31", hospital: cma };
assert.ok(validateRequest({ ...ok, groupName: "", teams: [], startDate: "2026-03-10", endDate: "2026-03-01" }).length >= 3);
assert.equal(validateRequest({ ...ok, teams: [["A", "B"], ["C", "D", "E"]] }).length, 0);
assert.equal(validateRequest({ ...ok, teams: [["A"]] }).length, 0); // un seul stagiaire au total : accepté
assert.ok(validateRequest({ ...ok, teams: [["A"], ["B", "C"]] }).some((e) => e.includes("seul")));
assert.ok(validateRequest({ ...ok, teams: [["Awa", "Bello"], ["awa", "Chantal"]] }).some((e) => e.includes("deux fois")));

// 15. CSV
const csv = toCSV(two);
assert.ok(csv.startsWith("﻿Stagiaire;Équipe;2026-01-05"));
assert.equal(csv.split("\r\n").length, 6);

console.log("Tous les tests du moteur passent.");
