import { Fragment } from "react";
import { formatFull, monthShort } from "@/lib/dates";
import { summarizeTeams, teamLabel } from "@/lib/scheduler";
import { SHIFT_LABEL, type Planning, type ShiftType } from "@/lib/types";
import { CELL_STYLE } from "./Legend";

/** Colonnes dans l'ordre de la fiche papier. */
const ORDER: ShiftType[] = ["permanence", "garde", "repos"];

const HEAD: Record<ShiftType, string> = {
  permanence: "text-permanence border-permanence",
  garde: "text-garde border-garde",
  repos: "text-repos border-repos",
};

function Dates({ planning, type, indices }: { planning: Planning; type: ShiftType; indices: number[] }) {
  if (indices.length === 0) return <span className="text-ink-soft">–</span>;
  const groups: { key: string; label: string; items: number[] }[] = [];
  for (const i of indices) {
    const d = planning.days[i];
    const key = `${d.year}-${d.month}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(i);
    else groups.push({ key, label: monthShort(d.year, d.month), items: [i] });
  }
  return (
    <ul className="flex flex-wrap items-center gap-1 print:gap-0.5">
      {groups.map((g) => (
        <Fragment key={g.key}>
          <li className="w-full pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft first:pt-0 print:w-auto print:pt-0 print:pl-1 print:first:pl-0">
            {g.label}
          </li>
          {g.items.map((i) => (
            <li
              key={i}
              title={formatFull(planning.days[i].iso)}
              className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1 text-sm font-semibold print:h-5 print:min-w-[1.2rem] print:text-[11px] ${CELL_STYLE[type]}`}
            >
              {planning.days[i].day}
            </li>
          ))}
        </Fragment>
      ))}
    </ul>
  );
}

/**
 * Un seul tableau : une ligne par stagiaire, une colonne par poste (permanence, garde, repos),
 * et dans chaque case la liste des dates, mois par mois.
 */
export function PlanningList({ planning }: { planning: Planning }) {
  const summaries = summarizeTeams(planning);
  const used = new Set(planning.request.hospital.rotation.cycle.map((b) => b.type));
  const types = ORDER.filter((t) => used.has(t));
  const several = summaries.length > 1;

  return (
    <div className="overflow-x-auto rounded-2xl border border-paper-line bg-paper-card shadow-soft print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <table className="w-full border-collapse text-left align-top">
        <thead>
          <tr>
            <th className="w-[18%] border-b-2 border-paper-line px-4 py-3 text-sm font-semibold text-ink print:px-2 print:py-1">
              Stagiaire
            </th>
            {types.map((t) => (
              <th key={t} className={`border-b-2 px-4 py-3 text-base font-semibold print:px-2 print:py-1 ${HEAD[t]}`}>
                {SHIFT_LABEL[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <Fragment key={s.team}>
              {several && (
                <tr className="print-block bg-paper">
                  <td
                    colSpan={types.length + 1}
                    className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand print:px-2"
                  >
                    {teamLabel(s.team)}
                  </td>
                </tr>
              )}
              {s.members.map((name) => (
                <tr key={name} className="break-inside-avoid border-t border-paper-line">
                  <th scope="row" className="px-4 py-3 font-display text-lg font-normal leading-tight text-ink print:px-2 print:py-1 print:text-sm">
                    {name}
                  </th>
                  {types.map((t) => (
                    <td key={t} className="px-4 py-3 print:px-2 print:py-1">
                      <Dates planning={planning} type={t} indices={s.shifts[t]} />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
