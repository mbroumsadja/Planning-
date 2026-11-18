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
    <ul className="flex flex-wrap items-center gap-0.5">
      {groups.map((g) => (
        <Fragment key={g.key}>
          <li className="pl-1.5 pr-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft first:pl-0 print:pl-1 print:text-[8px] print:first:pl-0">
            {g.label}
          </li>
          {g.items.map((i) => (
            <li
              key={i}
              title={formatFull(planning.days[i].iso)}
              className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-0.5 text-xs font-semibold print:h-[15px] print:min-w-[15px] print:text-[9px] ${CELL_STYLE[type]}`}
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
      <table className="w-full border-collapse text-left align-top max-md:block">
        <thead className="max-md:hidden">
          <tr>
            <th className="w-[16%] border-b-2 border-paper-line px-3 py-2 text-sm font-semibold text-ink print:px-1.5 print:py-[2px]">
              Stagiaire
            </th>
            {types.map((t) => (
              <th key={t} className={`border-b-2 px-3 py-2 text-base font-semibold print:px-1.5 print:py-[2px] print:text-xs ${HEAD[t]}`}>
                {SHIFT_LABEL[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {summaries.map((s) => (
            <Fragment key={s.team}>
              {several && (
                <tr className="print-block bg-paper max-md:block">
                  <td
                    colSpan={types.length + 1}
                    className="max-md:block px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand print:px-1.5 print:py-0 print:text-[8px]"
                  >
                    {teamLabel(s.team)}
                  </td>
                </tr>
              )}
              {s.members.map((name) => (
                <tr key={name} className="break-inside-avoid border-t border-paper-line max-md:block max-md:px-4 max-md:py-4">
                  <th scope="row" className="max-md:block max-md:px-0 max-md:pb-2 max-md:pt-0 max-md:text-xl px-3 py-2 font-display text-base font-normal leading-tight text-ink print:px-1.5 print:py-[2px] print:text-[10px]">
                    {name}
                  </th>
                  {types.map((t) => (
                    <td key={t} className="max-md:block max-md:px-0 max-md:py-2 px-3 py-2 print:px-1.5 print:py-[2px]">
                      <span className={`mb-1 hidden text-sm font-semibold max-md:block ${HEAD[t].split(" ")[0]}`}>{SHIFT_LABEL[t]}</span>
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
