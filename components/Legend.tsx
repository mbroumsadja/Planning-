import { SHIFT_CODE, SHIFT_LABEL, type ShiftType } from "@/lib/types";

export const CELL_STYLE: Record<ShiftType | "off", string> = {
  garde: "bg-garde-bg text-garde font-semibold",
  permanence: "bg-permanence-bg text-permanence font-semibold",
  repos: "bg-repos-bg text-repos font-semibold",
  off: "bg-paper-tint text-ink-faint",
};

interface LegendProps {
  hours?: { garde: string; permanence: string };
  types?: ShiftType[];
}

/** Légende : la couleur ne porte jamais seule l'information, chaque poste a aussi sa lettre. */
export function Legend({ hours, types = ["garde", "permanence", "repos"] }: LegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
      {types.map((t) => (
        <li key={t} className="flex items-center gap-2">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm ${CELL_STYLE[t]}`}
            aria-hidden
          >
            {SHIFT_CODE[t]}
          </span>
          <span>
            {SHIFT_LABEL[t]}
            {hours && t !== "repos" && hours[t] ? ` (${hours[t]})` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
