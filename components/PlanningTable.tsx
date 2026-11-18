import { Fragment } from "react";
import { formatLong, monthLabel, WEEKDAY_LETTERS } from "@/lib/dates";
import { teamLabel } from "@/lib/scheduler";
import { SHIFT_CODE, SHIFT_LABEL, type Planning, type ShiftType } from "@/lib/types";
import { CELL_STYLE } from "./Legend";

/** « Gardes », « Permanences », mais « Repos » ne prend pas de s. */
const pluralLabel = (t: ShiftType): string => (t === "repos" ? "Repos" : `${SHIFT_LABEL[t]}s`);

interface BlockProps {
  planning: Planning;
  /** Plage de jours affichée : de `from` (inclus) à `to` (exclu). */
  from: number;
  to: number;
  showTotals: boolean;
  /** Version imprimée : colonnes réparties sur toute la largeur de la page. */
  print?: boolean;
}

/** Découpe les jours en blocs d'un mois, pour que chaque bloc tienne sur la largeur d'une page. */
function monthSegments(days: Planning["days"]): { from: number; to: number }[] {
  const segments: { from: number; to: number }[] = [];
  days.forEach((d, i) => {
    const last = segments[segments.length - 1];
    if (last && days[last.from].month === d.month && days[last.from].year === d.year) last.to = i + 1;
    else segments.push({ from: i, to: i + 1 });
  });
  return segments;
}

function TableBlock({ planning, from, to, showTotals, print = false }: BlockProps) {
  const { rows, request } = planning;
  const days = planning.days.slice(from, to);
  const coverage = planning.gardeCoverage.slice(from, to);
  const hasGarde = request.hospital.rotation.cycle.some((b) => b.type === "garde");
  const hasTeams = request.teams.length > 1;

  // Regroupe les colonnes par mois pour la première ligne d'en-tête.
  const months: { key: string; label: string; span: number }[] = [];
  for (const d of days) {
    const key = `${d.year}-${d.month}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.span++;
    else months.push({ key, label: monthLabel(d.year, d.month), span: 1 });
  }

  const th = "border-b border-paper-line px-0.5 py-1.5 text-center text-xs font-medium text-ink-soft";
  const nameWidth = print ? { width: 170 } : undefined;
  const totalWidth = print ? { width: 70 } : undefined;

  return (
    <table
      className={`planning-table border-separate border-spacing-0 ${
        print ? "w-full table-fixed text-[11px]" : "w-max min-w-full text-sm"
      }`}
    >
      <caption className="sr-only">
        Planning du groupe {request.groupName}, du {formatLong(days[0].iso)} au{" "}
        {formatLong(days[days.length - 1].iso)}
      </caption>
      <thead>
        <tr>
          <th
            rowSpan={2}
            scope="col"
            style={nameWidth}
            className="sticky left-0 z-10 min-w-[160px] border-b border-r border-paper-line bg-paper-card px-3 py-2 text-left text-sm font-semibold text-ink print:min-w-0"
          >
            Stagiaire
          </th>
          {months.map((m) => (
            <th
              key={m.key}
              colSpan={m.span}
              scope="colgroup"
              className="border-b border-l border-paper-line px-2 py-2 text-left text-sm font-semibold capitalize text-ink"
            >
              {m.label}
            </th>
          ))}
          {showTotals &&
            (["garde", "permanence", "repos"] as const).map((t) => (
              <th
                key={t}
                rowSpan={2}
                scope="col"
                style={totalWidth}
                className="min-w-[56px] border-b border-l border-paper-line bg-paper-tint px-1 py-2 text-center text-[10px] font-semibold leading-tight text-ink print:min-w-0"
              >
                {pluralLabel(t)}
              </th>
            ))}
        </tr>
        <tr>
          {days.map((d) => (
            <th
              key={d.iso}
              scope="col"
              className={`${th} ${print ? "" : "min-w-[34px]"} ${d.isWeekend ? "bg-paper-tint" : ""}`}
            >
              <span className="block text-[9px] uppercase leading-none">{WEEKDAY_LETTERS[d.weekday]}</span>
              <span className="block text-xs leading-tight text-ink">{d.day}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const startsTeam = hasTeams && (idx === 0 || rows[idx - 1].team !== row.team);
          const cells = row.cells.slice(from, to);
          return (
            <Fragment key={`${row.team}-${row.name}`}>
              {startsTeam && (
                <tr>
                  <th
                    scope="rowgroup"
                    className="sticky left-0 z-10 border-b border-r border-paper-line bg-paper-tint px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-brand"
                  >
                    {teamLabel(row.team)}
                  </th>
                  <td
                    colSpan={days.length + (showTotals ? 3 : 0)}
                    className="border-b border-paper-line bg-paper-tint"
                  />
                </tr>
              )}
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 break-words border-b border-r border-paper-line bg-paper-card px-3 py-1.5 text-left text-sm font-medium leading-tight text-ink print:text-[11px]"
                >
                  {row.name}
                </th>
                {cells.map((cell, i) => (
                  <td
                    key={days[i].iso}
                    title={`${row.name}, ${formatLong(days[i].iso)} : ${
                      cell === "off" ? "hors rotation" : SHIFT_LABEL[cell]
                    }`}
                    className={`border-b border-paper-line text-center ${CELL_STYLE[cell]}`}
                    style={{ height: print ? 21 : 38 }}
                  >
                    {SHIFT_CODE[cell]}
                  </td>
                ))}
                {showTotals && (
                  <>
                    <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-garde">
                      {row.stats.garde}
                    </td>
                    <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-permanence">
                      {row.stats.permanence}
                    </td>
                    <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-repos">
                      {row.stats.repos}
                    </td>
                  </>
                )}
              </tr>
            </Fragment>
          );
        })}
      </tbody>
      {hasGarde && (
        <tfoot>
          <tr>
            <th
              scope="row"
              className="sticky left-0 z-10 border-r border-paper-line bg-paper-tint px-3 py-1.5 text-left text-[10px] font-semibold text-ink-soft"
            >
              Gardes ce jour
            </th>
            {coverage.map((n, i) => (
              <td
                key={days[i].iso}
                className={`bg-paper-tint text-center text-[10px] ${
                  days[i].active && n === 0 ? "bg-warn-bg font-semibold text-warn" : "text-ink-soft"
                }`}
                title={
                  days[i].active && n === 0
                    ? "Aucun stagiaire de garde ce jour"
                    : `${n} stagiaire(s) de garde`
                }
              >
                {days[i].active ? n : ""}
              </td>
            ))}
            {showTotals && <td colSpan={3} className="bg-paper-tint" />}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

/** Totaux sur toute la période, imprimés après les blocs mensuels. */
function TotalsTable({ planning }: { planning: Planning }) {
  const hasTeams = planning.request.teams.length > 1;
  const cell = "border-b border-paper-line px-3 py-1.5 text-center font-semibold";
  return (
    <table className="w-full border-separate border-spacing-0 text-[11px]">
      <caption className="px-3 py-2 text-left text-xs font-semibold text-ink">
        Totaux sur toute la période
      </caption>
      <thead>
        <tr className="bg-paper-tint text-[10px] text-ink-soft">
          <th scope="col" className="border-b border-paper-line px-3 py-1.5 text-left font-semibold">
            Stagiaire
          </th>
          {hasTeams && (
            <th scope="col" className="border-b border-paper-line px-3 py-1.5 text-left font-semibold">
              Équipe
            </th>
          )}
          {(["garde", "permanence", "repos"] as const).map((t) => (
            <th key={t} scope="col" className="border-b border-paper-line px-3 py-1.5 text-center font-semibold">
              {pluralLabel(t)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {planning.rows.map((row) => (
          <tr key={`${row.team}-${row.name}`}>
            <th scope="row" className="border-b border-paper-line px-3 py-1.5 text-left font-medium text-ink">
              {row.name}
            </th>
            {hasTeams && <td className="border-b border-paper-line px-3 py-1.5 text-ink-soft">{teamLabel(row.team)}</td>}
            <td className={`${cell} text-garde`}>{row.stats.garde}</td>
            <td className={`${cell} text-permanence`}>{row.stats.permanence}</td>
            <td className={`${cell} text-repos`}>{row.stats.repos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * À l'écran : un seul tableau défilant, un stagiaire par ligne, un jour par colonne.
 * À l'impression : un bloc par mois (chaque bloc tient sur la largeur de la page, les noms sont répétés),
 * suivi des totaux si le stage couvre plusieurs mois.
 */
export function PlanningTable({ planning }: { planning: Planning }) {
  const segments = monthSegments(planning.days);
  const multi = segments.length > 1;

  return (
    <>
      <div className="planning-scroll overflow-x-auto rounded-2xl border border-paper-line bg-paper-card print:hidden">
        <TableBlock planning={planning} from={0} to={planning.days.length} showTotals />
      </div>

      <div className="hidden print:block">
        {segments.map((seg) => (
          <div key={seg.from} className="print-block overflow-hidden rounded-lg border border-paper-line">
            <TableBlock planning={planning} from={seg.from} to={seg.to} showTotals={!multi} print />
          </div>
        ))}
        {multi && (
          <div className="print-block overflow-hidden rounded-lg border border-paper-line">
            <TotalsTable planning={planning} />
          </div>
        )}
      </div>
    </>
  );
}
