"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Legend } from "@/components/Legend";
import { PlanningList } from "@/components/PlanningList";
import { PlanningTable } from "@/components/PlanningTable";
import { STORAGE_KEYS } from "@/lib/hospitals";
import { endOfMonths, formatLong, isValidISO } from "@/lib/dates";
import {
  describeCycle,
  generatePlanning,
  MAX_MEMBERS,
  parseTeams,
  teamLabel,
  toCSV,
  validateRequest,
} from "@/lib/scheduler";
import type { ShiftType } from "@/lib/types";
import { useHospitals } from "@/lib/useHospitals";
import { useLocalState } from "@/lib/useLocalState";

interface Draft {
  step: 1 | 2 | 3;
  hospitalId: string;
  groupName: string;
  membersText: string;
  /** Taille souhaitée des équipes ; 0 = une seule équipe. */
  teamSize: number;
  startDate: string;
  endDate: string;
  generated: boolean;
  /** Affichage du résultat : tableau calendrier ou liste des dates par poste. */
  view?: "table" | "list";
}

const EMPTY_DRAFT: Draft = {
  step: 1,
  hospitalId: "",
  groupName: "",
  membersText: "",
  teamSize: 3,
  startDate: "",
  endDate: "",
  generated: false,
  view: "table",
};

const VIEWS: { value: "table" | "list"; label: string; hint: string }[] = [
  { value: "table", label: "Tableau", hint: "Un jour par colonne" },
  { value: "list", label: "Liste par dates", hint: "Permanence, garde, repos" },
];

const STEPS = ["Hôpital", "Stagiaires", "Période"] as const;
const TEAM_SIZES: { value: number; label: string }[] = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 0, label: "Tous ensemble" },
];

/** Au-delà de ce nombre d'hôpitaux, on affiche un champ de recherche. */
const SEARCH_THRESHOLD = 6;

export default function HomePage() {
  const { hospitals, ready: hospitalsReady } = useHospitals();
  const [draft, setDraft, draftReady] = useLocalState<Draft>(STORAGE_KEYS.draft, EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const hospital = hospitals.find((h) => h.id === draft.hospitalId);
  const view = draft.view ?? "table";
  const { teams, manual } = useMemo(
    () => parseTeams(draft.membersText, draft.teamSize),
    [draft.membersText, draft.teamSize],
  );
  const total = teams.flat().length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) => `${h.name} ${h.city}`.toLowerCase().includes(q));
  }, [hospitals, query]);

  const planning = useMemo(() => {
    if (!draft.generated || !hospital) return null;
    const request = {
      groupName: draft.groupName.trim(),
      teams,
      startDate: draft.startDate,
      endDate: draft.endDate,
      hospital,
    };
    return validateRequest(request).length === 0 ? generatePlanning(request) : null;
  }, [draft.generated, draft.groupName, draft.startDate, draft.endDate, teams, hospital]);

  const update = (patch: Partial<Draft>) => {
    setErrors([]);
    setDraft((d) => ({ ...d, ...patch }));
  };

  if (!hospitalsReady || !draftReady) {
    return <p className="text-ink-soft">Chargement…</p>;
  }

  if (hospitals.length === 0) {
    return (
      <section className="card mx-auto max-w-xl text-center">
        <h1 className="text-3xl">Aucun hôpital disponible</h1>
        <p className="mt-3 text-ink-soft">
          L'administration doit d'abord ajouter au moins un hôpital avec sa rotation de garde, de
          permanence et de repos.
        </p>
        <Link href="/admin" className="btn-primary mt-6">
          Ouvrir l'administration
        </Link>
      </section>
    );
  }

  /* ---------- Résultat ---------- */
  if (planning && hospital) {
    const exportCSV = () => {
      const blob = new Blob([toCSV(planning)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planning-${draft.groupName.trim().replace(/\s+/g, "-").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const used = new Set(hospital.rotation.cycle.map((b) => b.type));
    const legendTypes = (["garde", "permanence", "repos"] as ShiftType[]).filter((t) => used.has(t));

    return (
      <section className="print-area space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">{hospital.name}</p>
            <h1 className="mt-2 text-4xl md:text-5xl">{planning.request.groupName}</h1>
            <p className="mt-3 text-ink-soft">
              Du {formatLong(planning.request.startDate)} au {formatLong(planning.request.endDate)} ·{" "}
              {planning.rows.length} stagiaire{planning.rows.length > 1 ? "s" : ""}
              {teams.length > 1 ? ` en ${teams.length} équipes` : ""} · {describeCycle(hospital.rotation)}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-3">
            <button className="btn-ghost" onClick={() => update({ generated: false, step: 3 })}>
              Modifier
            </button>
            <button className="btn-ghost" onClick={exportCSV}>
              Exporter pour Excel
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              Imprimer / PDF
            </button>
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ink">Affichage</span>
          <div role="radiogroup" aria-label="Affichage du planning" className="inline-flex rounded-full border border-paper-line bg-paper-card p-1">
            {VIEWS.map((v) => {
              const selected = view === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={v.hint}
                  onClick={() => update({ view: v.value })}
                  className={`min-h-[44px] rounded-full px-5 text-base transition ${
                    selected ? "bg-brand font-semibold text-white shadow-soft" : "text-ink-soft hover:text-brand"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <Legend hours={hospital.rotation.hours} types={legendTypes} />
        {view === "list" ? <PlanningList planning={planning} /> : <PlanningTable planning={planning} />}
        <p className="no-print text-sm text-ink-soft">
          {view === "list"
            ? "Chaque fiche regroupe les stagiaires d'une même équipe, qui ont les mêmes jours. Passe la souris sur une date pour voir le jour de la semaine."
            : "Une équipe fait la garde, la permanence et le repos le même jour, et les équipes se relaient entre elles. La dernière ligne indique combien de stagiaires sont de garde chaque jour. Une case orange signale un jour sans garde."}
        </p>
      </section>
    );
  }

  /* ---------- Assistant en 3 étapes ---------- */
  const checkStep = (step: number): string[] => {
    const out: string[] = [];
    if (step === 1 && !hospital) out.push("Choisis l'hôpital où se déroule le stage.");
    if (step === 2) {
      if (!draft.groupName.trim()) out.push("Indique le nom du groupe de stagiaires.");
      if (total === 0) out.push("Ajoute au moins un stagiaire (un nom par ligne).");
      if (total > MAX_MEMBERS) out.push(`Maximum ${MAX_MEMBERS} stagiaires par planning.`);
      if (total > 1) {
        teams.forEach((team, i) => {
          if (team.length < 2) {
            out.push(`${teamLabel(i)} : ${team[0]} est seul. Ajoute un stagiaire à cette équipe.`);
          }
        });
      }
    }
    if (step === 3) {
      if (!isValidISO(draft.startDate)) out.push("Choisis le premier jour de stage.");
      if (!isValidISO(draft.endDate)) out.push("Choisis le dernier jour de stage.");
      if (isValidISO(draft.startDate) && isValidISO(draft.endDate) && draft.endDate < draft.startDate) {
        out.push("Le dernier jour doit venir après le premier jour.");
      }
    }
    return out;
  };

  const next = () => {
    const e = checkStep(draft.step);
    if (e.length || !hospital) return setErrors(e);
    if (draft.step < 3) return update({ step: (draft.step + 1) as 2 | 3 });
    const all = validateRequest({
      groupName: draft.groupName.trim(),
      teams,
      startDate: draft.startDate,
      endDate: draft.endDate,
      hospital,
    });
    if (all.length) return setErrors(all);
    update({ generated: true });
  };

  const back = () => update({ step: Math.max(1, draft.step - 1) as 1 | 2 | 3 });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl">Créer un planning de stage</h1>
        <p className="mt-3 text-ink-soft">Trois étapes, moins d'une minute.</p>
      </header>

      <ol className="mb-8 flex items-center gap-3" aria-label="Progression">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < draft.step ? "done" : n === draft.step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-3" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  state === "todo" ? "bg-paper-tint text-ink-faint" : "bg-brand text-white"
                }`}
              >
                {state === "done" ? "✓" : n}
              </span>
              <span className={`hidden text-sm sm:block ${state === "todo" ? "text-ink-faint" : "font-semibold text-ink"}`}>
                {label}
              </span>
              {n < STEPS.length && <span className="h-px flex-1 bg-paper-line" aria-hidden />}
            </li>
          );
        })}
      </ol>

      <section className="card">
        {draft.step === 1 && (
          <div>
            <h2 className="text-2xl">Dans quel hôpital se déroule le stage ?</h2>
            <p className="hint">La rotation de garde, de permanence et de repos s'applique automatiquement.</p>

            {hospitals.length > SEARCH_THRESHOLD && (
              <div className="mt-6">
                <label htmlFor="search" className="label">
                  Rechercher un hôpital
                </label>
                <input
                  id="search"
                  className="field"
                  placeholder="Nom ou ville"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <div role="radiogroup" aria-label="Hôpital" className="mt-6 grid gap-3">
              {filtered.map((h) => {
                const selected = h.id === draft.hospitalId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update({ hospitalId: h.id })}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selected ? "border-brand bg-brand-soft" : "border-paper-line bg-paper-card hover:border-brand"
                    }`}
                  >
                    <span className="block text-lg font-semibold">{h.name}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {h.city ? `${h.city} · ` : ""}
                      {describeCycle(h.rotation)}
                    </span>
                    {h.description && <span className="mt-2 block text-sm text-ink-soft">{h.description}</span>}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="rounded-2xl bg-paper-tint p-4 text-sm text-ink-soft">
                  Aucun hôpital ne correspond à « {query} ». Ton hôpital n'est pas dans la liste ? Il peut
                  être ajouté depuis l'administration.
                </p>
              )}
            </div>
          </div>
        )}

        {draft.step === 2 && (
          <div>
            <h2 className="text-2xl">Qui sont les stagiaires ?</h2>
            <div className="mt-6">
              <label htmlFor="group" className="label">
                Nom du groupe de stagiaires
              </label>
              <input
                id="group"
                className="field"
                placeholder="Stagiaires de pédiatrie"
                value={draft.groupName}
                onChange={(e) => update({ groupName: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="mt-6">
              <label htmlFor="members" className="label">
                Noms des stagiaires
              </label>
              <textarea
                id="members"
                className="field min-h-[180px]"
                placeholder={"Awa Ndiaye\nBello Hamadou\nChantal Mbarga"}
                value={draft.membersText}
                onChange={(e) => update({ membersText: e.target.value })}
              />
              <p className="hint">
                Un nom par ligne. Pour former les équipes toi-même, laisse une ligne vide entre deux équipes.
              </p>
            </div>

            <fieldset className="mt-6" disabled={manual}>
              <legend className="label">Taille des équipes de relais</legend>
              <div role="radiogroup" aria-label="Taille des équipes" className="flex flex-wrap gap-2">
                {TEAM_SIZES.map((s) => {
                  const selected = draft.teamSize === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={manual}
                      onClick={() => update({ teamSize: s.value })}
                      className={`min-h-[44px] rounded-full border px-5 text-base transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected && !manual
                          ? "border-brand bg-brand-soft font-semibold text-brand"
                          : "border-paper-line bg-paper-card hover:border-brand"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="hint">
                {manual
                  ? "Équipes formées à la main. Retire la ligne vide pour revenir au calcul automatique."
                  : "Une équipe fait la garde, la permanence et le repos le même jour. Les équipes se relaient entre elles. Personne n'est seul."}
              </p>
            </fieldset>

            {total > 0 && (
              <div className="mt-6" aria-live="polite">
                <p className="label">
                  {total} stagiaire{total > 1 ? "s" : ""}, {teams.length} équipe{teams.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-2">
                  {teams.map((team, i) => (
                    <li
                      key={i}
                      className={`rounded-2xl p-3 text-sm ${
                        total > 1 && team.length < 2 ? "bg-warn-bg text-warn" : "bg-paper-tint"
                      }`}
                    >
                      <span className="font-semibold">{teamLabel(i)}</span>
                      <span className="text-ink-soft"> · {team.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {draft.step === 3 && (
          <div>
            <h2 className="text-2xl">Quelle est la durée du stage ?</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="start" className="label">
                  Premier jour de stage
                </label>
                <input
                  id="start"
                  type="date"
                  className="field"
                  value={draft.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="end" className="label">
                  Dernier jour de stage
                </label>
                <input
                  id="end"
                  type="date"
                  className="field"
                  min={draft.startDate || undefined}
                  value={draft.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </div>
            </div>
            {isValidISO(draft.startDate) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-soft">Durée rapide :</span>
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="rounded-full border border-paper-line px-4 py-2 text-sm hover:border-brand hover:text-brand"
                    onClick={() => update({ endDate: endOfMonths(draft.startDate, m) })}
                  >
                    {m} mois
                  </button>
                ))}
              </div>
            )}
            {hospital && (
              <dl className="mt-8 grid gap-1 rounded-2xl bg-paper-tint p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Hôpital</dt>
                  <dd className="font-medium">{hospital.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Rotation</dt>
                  <dd className="font-medium">{describeCycle(hospital.rotation)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Stagiaires</dt>
                  <dd className="font-medium">
                    {draft.groupName.trim()} ({total}, {teams.length} équipe{teams.length > 1 ? "s" : ""})
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <ul role="alert" className="mt-6 space-y-1 rounded-2xl bg-warn-bg p-4 text-sm text-warn">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          {draft.step > 1 ? (
            <button type="button" className="btn-ghost" onClick={back}>
              Retour
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn-primary" onClick={next}>
            {draft.step === 3 ? "Générer le planning" : "Continuer"}
          </button>
        </div>
      </section>
    </div>
  );
}
