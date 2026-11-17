"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Legend } from "@/components/Legend";
import { PlanningTable } from "@/components/PlanningTable";
import { DEFAULT_PROFILES, STORAGE_KEYS } from "@/lib/defaults";
import { endOfMonths, formatLong, isValidISO } from "@/lib/dates";
import {
  describeCycle,
  generatePlanning,
  MAX_MEMBERS,
  parseMembers,
  toCSV,
  validateRequest,
} from "@/lib/scheduler";
import type { RotationProfile, ShiftType } from "@/lib/types";
import { useLocalState } from "@/lib/useLocalState";

interface Draft {
  step: 1 | 2 | 3;
  profileId: string;
  groupName: string;
  membersText: string;
  startDate: string;
  endDate: string;
  generated: boolean;
}

const EMPTY_DRAFT: Draft = {
  step: 1,
  profileId: "",
  groupName: "",
  membersText: "",
  startDate: "",
  endDate: "",
  generated: false,
};

const STEPS = ["Rotation", "Groupe", "Période"] as const;

export default function HomePage() {
  const [profiles, , profilesReady] = useLocalState<RotationProfile[]>(
    STORAGE_KEYS.profiles,
    DEFAULT_PROFILES,
  );
  const [draft, setDraft, draftReady] = useLocalState<Draft>(STORAGE_KEYS.draft, EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);

  const profile = profiles.find((p) => p.id === draft.profileId) ?? profiles[0];
  const members = useMemo(() => parseMembers(draft.membersText), [draft.membersText]);

  const planning = useMemo(() => {
    if (!draft.generated || !profile) return null;
    const request = {
      groupName: draft.groupName.trim(),
      members,
      startDate: draft.startDate,
      endDate: draft.endDate,
      profile,
    };
    return validateRequest(request).length === 0 ? generatePlanning(request) : null;
  }, [draft.generated, draft.groupName, draft.startDate, draft.endDate, members, profile]);

  const update = (patch: Partial<Draft>) => {
    setErrors([]);
    setDraft((d) => ({ ...d, ...patch }));
  };

  if (!profilesReady || !draftReady) {
    return <p className="text-ink-soft">Chargement…</p>;
  }

  if (!profile) {
    return (
      <section className="card mx-auto max-w-xl text-center">
        <h1 className="text-3xl">Aucune rotation disponible</h1>
        <p className="mt-3 text-ink-soft">
          L'administration doit d'abord définir au moins une rotation (nombre de jours de garde,
          de permanence et de repos).
        </p>
        <Link href="/admin" className="btn-primary mt-6">
          Ouvrir l'administration
        </Link>
      </section>
    );
  }

  /* ---------- Résultat ---------- */
  if (planning) {
    const exportCSV = () => {
      const blob = new Blob([toCSV(planning)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planning-${draft.groupName.trim().replace(/\s+/g, "-").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const usedTypes = Array.from(new Set(profile.cycle.map((b) => b.type))) as ShiftType[];
    const legendTypes = (["garde", "permanence", "repos"] as ShiftType[]).filter((t) =>
      usedTypes.includes(t),
    );

    return (
      <section className="print-area space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Planning de stage</p>
            <h1 className="mt-2 text-4xl md:text-5xl">{planning.request.groupName}</h1>
            <p className="mt-3 text-ink-soft">
              Du {formatLong(planning.request.startDate)} au {formatLong(planning.request.endDate)} ·{" "}
              {planning.rows.length} stagiaire{planning.rows.length > 1 ? "s" : ""} · {profile.name}
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

        <Legend hours={profile.hours} types={legendTypes} />
        <PlanningTable planning={planning} />
        <p className="no-print text-sm text-ink-soft">
          La dernière ligne indique combien de stagiaires sont de garde chaque jour. Une case orange
          signale un jour sans garde.
        </p>
      </section>
    );
  }

  /* ---------- Assistant en 3 étapes ---------- */
  const checkStep = (step: number): string[] => {
    const out: string[] = [];
    if (step === 2) {
      if (!draft.groupName.trim()) out.push("Indique le nom du groupe, par exemple « Groupe A ».");
      if (members.length === 0) out.push("Ajoute au moins un stagiaire (un nom par ligne).");
      if (members.length > MAX_MEMBERS) out.push(`Maximum ${MAX_MEMBERS} stagiaires par planning.`);
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
    if (e.length) return setErrors(e);
    if (draft.step < 3) return update({ step: (draft.step + 1) as 2 | 3, profileId: profile.id });
    const request = {
      groupName: draft.groupName.trim(),
      members,
      startDate: draft.startDate,
      endDate: draft.endDate,
      profile,
    };
    const all = validateRequest(request);
    if (all.length) return setErrors(all);
    update({ generated: true, profileId: profile.id });
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
            <h2 className="text-2xl">Quelle rotation pour ce service ?</h2>
            <p className="hint">Les rotations sont définies par l'administration.</p>
            <div role="radiogroup" aria-label="Rotation" className="mt-6 grid gap-3">
              {profiles.map((p) => {
                const selected = p.id === profile.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update({ profileId: p.id })}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selected ? "border-brand bg-brand-soft" : "border-paper-line bg-paper-card hover:border-brand"
                    }`}
                  >
                    <span className="block text-lg font-semibold">{p.name}</span>
                    <span className="mt-1 block text-sm capitalize text-ink-soft">{describeCycle(p)}</span>
                    {p.description && <span className="mt-2 block text-sm text-ink-soft">{p.description}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {draft.step === 2 && (
          <div>
            <h2 className="text-2xl">Qui est dans le groupe ?</h2>
            <div className="mt-6">
              <label htmlFor="group" className="label">
                Nom du groupe
              </label>
              <input
                id="group"
                className="field"
                placeholder="Groupe A"
                value={draft.groupName}
                onChange={(e) => update({ groupName: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="mt-6">
              <label htmlFor="members" className="label">
                Stagiaires
              </label>
              <textarea
                id="members"
                className="field min-h-[180px]"
                placeholder={"Awa Ndiaye\nBello Hamadou\nChantal Mbarga"}
                value={draft.membersText}
                onChange={(e) => update({ membersText: e.target.value })}
              />
              <p className="hint" aria-live="polite">
                Un nom par ligne. {members.length > 0 && `${members.length} stagiaire${members.length > 1 ? "s" : ""} ajouté${members.length > 1 ? "s" : ""}.`}
              </p>
              {profile.staggerDays > 0 && members.length > 1 && (
                <p className="hint">L'ordre des noms fixe l'ordre de passage en garde.</p>
              )}
            </div>
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
            <dl className="mt-8 grid gap-1 rounded-2xl bg-paper-tint p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Rotation</dt>
                <dd className="font-medium">{profile.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Groupe</dt>
                <dd className="font-medium">
                  {draft.groupName.trim()} ({members.length})
                </dd>
              </div>
            </dl>
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
