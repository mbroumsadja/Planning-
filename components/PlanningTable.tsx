import { monthLabel, WEEKDAY_LETTERS } from "@/lib/dates";
import { SHIFT_CODE, SHIFT_LABEL, type Planning } from "@/lib/types";
import { formatLong } from "@/lib/dates";
import { CELL_STYLE } from "./Legend";

/** Tableau : un stagiaire par ligne, un jour par colonne, groupé par mois. */
export function PlanningTable({ planning }: { planning: Planning }) {
  const { days, rows, gardeCoverage, request } = planning;
  const hasGarde = request.hospital.rotation.cycle.some((b) => b.type === "garde");

  // Regroupe les colonnes par mois pour la première ligne d'en-tête.
  const months: { key: string; label: string; span: number }[] = [];
  for (const d of days) {
    const key = `${d.year}-${d.month}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.span++;
    else months.push({ key, label: monthLabel(d.year, d.month), span: 1 });
  }

  const th = "border-b border-paper-line px-1 py-2 text-center text-xs font-medium text-ink-soft";

  return (
    <div className="planning-scroll overflow-x-auto rounded-2xl border border-paper-line bg-paper-card">
      <table className="planning-table w-max min-w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Planning du groupe {request.groupName}, du {formatLong(request.startDate)} au{" "}
          {formatLong(request.endDate)}
        </caption>
        <thead>
          <tr>
            <th
              rowSpan={2}
              scope="col"
              className="sticky left-0 z-10 min-w-[160px] border-b border-r border-paper-line bg-paper-card px-4 py-2 text-left text-sm font-semibold text-ink"
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
            {(["garde", "permanence", "repos"] as const).map((t) => (
              <th
                key={t}
                rowSpan={2}
                scope="col"
                className="min-w-[56px] border-b border-l border-paper-line bg-paper-tint px-2 py-2 text-center text-xs font-semibold text-ink"
              >
                {SHIFT_LABEL[t]}s
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => (
              <th
                key={d.iso}
                scope="col"
                className={`${th} min-w-[34px] ${d.isWeekend ? "bg-paper-tint" : ""}`}
              >
                <span className="block text-[10px] uppercase leading-none">{WEEKDAY_LETTERS[d.weekday]}</span>
                <span className="block text-sm leading-tight text-ink">{d.day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-r border-paper-line bg-paper-card px-4 py-2 text-left text-sm font-medium text-ink"
              >
                {row.name}
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={days[i].iso}
                  title={`${row.name}, ${formatLong(days[i].iso)} : ${
                    cell === "off" ? "hors rotation" : SHIFT_LABEL[cell]
                  }`}
                  className={`border-b border-paper-line text-center ${CELL_STYLE[cell]}`}
                  style={{ height: 38 }}
                >
                  {SHIFT_CODE[cell]}
                </td>
              ))}
              <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-garde">
                {row.stats.garde}
              </td>
              <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-permanence">
                {row.stats.permanence}
              </td>
              <td className="border-b border-l border-paper-line bg-paper-tint text-center font-semibold text-repos">
                {row.stats.repos}
              </td>
            </tr>
          ))}
        </tbody>
        {hasGarde && (
          <tfoot>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-paper-line bg-paper-tint px-4 py-2 text-left text-xs font-semibold text-ink-soft"
              >
                Gardes ce jour
              </th>
              {gardeCoverage.map((n, i) => (
                <td
                  key={days[i].iso}
                  className={`bg-paper-tint text-center text-xs ${
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
              <td colSpan={3} className="bg-paper-tint" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
