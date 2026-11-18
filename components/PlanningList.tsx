import { Fragment } from "react";
import { formatFull, monthShort } from "@/lib/dates";
import { summarizeTeams, teamLabel } from "@/lib/scheduler";
import { SHIFT_LABEL, type Planning, type ShiftType } from "@/lib/types";
import { CELL_STYLE } from "./Legend";

/** Même ordre que sur la fiche papier : permanence, garde, repos. */
const ORDER: ShiftType[] = ["permanence", "garde", "repos"];

const ACCENT: Record<ShiftType, string> = {
  permanence: "border-permanence",
  garde: "border-garde",
  repos: "border-repos",
};

const TITLE: Record<ShiftType, string> = {
  permanence: "text-permanence",
  garde: "text-garde",
  repos: "text-repos",
};

function ShiftLine({ planning, type, indices }: { planning: Planning; type: ShiftType; indices: number[] }) {
  // Regroupe les jours par mois : un mois par ligne.
  const groups: { key: string; label: string; items: number[] }[] = [];
  for (const i of indices) {
    const d = planning.days[i];
    const key = `${d.year}-${d.month}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(i);
    else groups.push({ key, label: monthShort(d.year, d.month), items: [i] });
  }

  return (
    <section className={`border-l-4 pl-3 ${ACCENT[type]}`}>
      <h4 className={`text-base font-semibold ${TITLE[type]}`}>
        {SHIFT_LABEL[type]}{" "}
        <span className="text-sm font-normal text-ink-soft">
          · {indices.length} jour{indices.length > 1 ? "s" : ""}
        </span>
      </h4>
      {indices.length === 0 ? (
        <p className="mt-1 text-sm text-ink-soft">Aucun jour</p>
      ) : (
        <ul className="mt-2 flex flex-wrap items-center gap-1.5 print:mt-1 print:gap-1">
          {groups.map((g) => (
            <Fragment key={g.key}>
              <li className="w-full pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft first:pt-0 print:ml-2 print:w-auto print:pt-0 print:first:ml-0">
                {g.label}
              </li>
              {g.items.map((i) => (
                <li
                  key={i}
                  title={formatFull(planning.days[i].iso)}
                  className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-1.5 text-sm print:h-6 print:min-w-[1.5rem] print:text-xs ${CELL_STYLE[type]}`}
                >
                  {planning.days[i].day}
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Affichage en liste, comme sur la fiche papier : pour chaque équipe, ses stagiaires puis
 * les jours de permanence, de garde et de repos. Un mois par ligne, chaque date dans la couleur de son poste.
 */
export function PlanningList({ planning }: { planning: Planning }) {
  const summaries = summarizeTeams(planning);
  const used = new Set(planning.request.hospital.rotation.cycle.map((b) => b.type));
  const types = ORDER.filter((t) => used.has(t));
  const several = summaries.length > 1;

  return (
    <div className="grid gap-5 md:grid-cols-2 print:block print:columns-2 print:gap-x-3">
      {summaries.map((s) => (
        <article
          key={s.team}
          className="print-block rounded-2xl border border-paper-line bg-paper-card p-5 shadow-soft print:p-3 print:shadow-none"
        >
          {several && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">{teamLabel(s.team)}</p>
          )}
          <ul className="mt-1 space-y-0.5">
            {s.members.map((name) => (
              <li key={name} className="font-display text-xl leading-tight text-ink print:text-base">
                {name}
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-5 print:mt-2 print:space-y-2">
            {types.map((t) => (
              <ShiftLine key={t} planning={planning} type={t} indices={s.shifts[t]} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
