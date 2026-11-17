"use client";

import { useEffect, useState } from "react";
import { CELL_STYLE, Legend } from "@/components/Legend";
import { DEFAULT_PROFILES, newProfile, STORAGE_KEYS } from "@/lib/defaults";
import { cycleLength, describeCycle, previewRows, validateProfile } from "@/lib/scheduler";
import { SHIFT_CODE, SHIFT_LABEL, type CycleBlock, type RotationProfile, type ShiftType } from "@/lib/types";
import { useLocalState } from "@/lib/useLocalState";

const TYPES: ShiftType[] = ["garde", "permanence", "repos"];

export default function AdminPage() {
  const [profiles, setProfiles, ready] = useLocalState<RotationProfile[]>(
    STORAGE_KEYS.profiles,
    DEFAULT_PROFILES,
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<RotationProfile | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Sélectionne la première rotation une fois les données chargées.
  useEffect(() => {
    if (ready && !selectedId && profiles.length > 0) setSelectedId(profiles[0].id);
  }, [ready, selectedId, profiles]);

  // Recharge le formulaire quand on change de rotation.
  useEffect(() => {
    const p = profiles.find((x) => x.id === selectedId);
    setDraft(p ? structuredClone(p) : null);
    setErrors([]);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) return <p className="text-ink-soft">Chargement…</p>;

  const patch = (p: Partial<RotationProfile>) => {
    setSaved(false);
    setDraft((d) => (d ? { ...d, ...p } : d));
  };

  const patchBlock = (i: number, b: Partial<CycleBlock>) =>
    draft && patch({ cycle: draft.cycle.map((x, j) => (j === i ? { ...x, ...b } : x)) });

  const moveBlock = (i: number, dir: -1 | 1) => {
    if (!draft) return;
    const j = i + dir;
    if (j < 0 || j >= draft.cycle.length) return;
    const cycle = [...draft.cycle];
    [cycle[i], cycle[j]] = [cycle[j], cycle[i]];
    patch({ cycle });
  };

  const save = () => {
    if (!draft) return;
    const e = validateProfile(draft);
    setErrors(e);
    if (e.length) return;
    setProfiles((list) => list.map((p) => (p.id === draft.id ? draft : p)));
    setSaved(true);
  };

  const addProfile = () => {
    const p = newProfile();
    setProfiles((list) => [...list, p]);
    setSelectedId(p.id);
  };

  const removeProfile = () => {
    if (!draft || profiles.length <= 1) return;
    if (!window.confirm(`Supprimer la rotation « ${draft.name} » ?`)) return;
    const rest = profiles.filter((p) => p.id !== draft.id);
    setProfiles(rest);
    setSelectedId(rest[0].id);
  };

  const resetAll = () => {
    if (!window.confirm("Remplacer toutes les rotations par celles d'origine ?")) return;
    setProfiles(DEFAULT_PROFILES);
    setSelectedId(DEFAULT_PROFILES[0].id);
  };

  const preview = draft && validateProfile(draft).length === 0 ? previewRows(draft) : null;

  return (
    <div>
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl md:text-5xl">Administration</h1>
        <p className="mt-3 text-ink-soft">
          Définis ici les rotations : nombre de jours de garde, de permanence et de repos. Les
          utilisateurs n'ont plus qu'à saisir leur groupe et les dates.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-current={p.id === selectedId}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    p.id === selectedId ? "border-brand bg-brand-soft" : "border-paper-line bg-paper-card hover:border-brand"
                  }`}
                >
                  <span className="block font-semibold">{p.name}</span>
                  <span className="mt-1 block text-sm capitalize text-ink-soft">{describeCycle(p)}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost mt-4 w-full" onClick={addProfile}>
            Nouvelle rotation
          </button>
          <button type="button" className="mt-4 w-full text-sm text-ink-soft underline" onClick={resetAll}>
            Revenir aux rotations d'origine
          </button>
        </aside>

        {draft && (
          <section className="card space-y-10">
            <div className="grid gap-6">
              <div>
                <label htmlFor="name" className="label">
                  Nom de la rotation
                </label>
                <input id="name" className="field" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="desc" className="label">
                  Description <span className="font-normal text-ink-soft">(facultatif)</span>
                </label>
                <input
                  id="desc"
                  className="field"
                  placeholder="Affichée aux utilisateurs pour choisir la bonne rotation"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl">Cycle de rotation</h2>
              <p className="hint">
                Le cycle se répète du premier au dernier jour du stage. Durée totale : {cycleLength(draft) || 0}{" "}
                jour{cycleLength(draft) > 1 ? "s" : ""}.
              </p>
              <ol className="mt-5 space-y-3">
                {draft.cycle.map((b, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-paper-line p-3">
                    <span className="w-6 text-center text-sm font-semibold text-ink-faint">{i + 1}</span>
                    <select
                      aria-label={`Type du bloc ${i + 1}`}
                      className="field w-auto min-w-[160px]"
                      value={b.type}
                      onChange={(e) => patchBlock(i, { type: e.target.value as ShiftType })}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SHIFT_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Nombre de jours du bloc ${i + 1}`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="field w-24"
                      value={Number.isFinite(b.days) ? b.days : ""}
                      onChange={(e) => patchBlock(i, { days: e.target.value === "" ? NaN : Number(e.target.value) })}
                    />
                    <span className="text-sm text-ink-soft">jour{b.days > 1 ? "s" : ""}</span>
                    <span className="ml-auto flex gap-1">
                      <button type="button" className="rounded-full px-3 py-2 hover:bg-paper-tint" aria-label="Monter" onClick={() => moveBlock(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="rounded-full px-3 py-2 hover:bg-paper-tint" aria-label="Descendre" onClick={() => moveBlock(i, 1)}>
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-3 py-2 text-garde hover:bg-garde-bg"
                        aria-label={`Supprimer le bloc ${i + 1}`}
                        onClick={() => patch({ cycle: draft.cycle.filter((_, j) => j !== i) })}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              {draft.cycle.length === 0 && (
                <p className="mt-4 rounded-2xl bg-paper-tint p-4 text-sm text-ink-soft">
                  Aucun bloc pour l'instant. Ajoute par exemple « 1 jour de garde ».
                </p>
              )}
              <button
                type="button"
                className="btn-ghost mt-4"
                onClick={() => patch({ cycle: [...draft.cycle, { type: "permanence", days: 1 }] })}
              >
                Ajouter un bloc
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="stagger" className="label">
                  Décalage entre deux stagiaires (jours)
                </label>
                <input
                  id="stagger"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="field"
                  value={Number.isFinite(draft.staggerDays) ? draft.staggerDays : ""}
                  onChange={(e) => patch({ staggerDays: e.target.value === "" ? NaN : Number(e.target.value) })}
                />
                <p className="hint">
                  Avec 1, chaque stagiaire commence sa rotation un jour après le précédent. Avec 0, tous
                  suivent exactement la même.
                </p>
              </div>
              <div>
                <span className="label">Week-ends</span>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl border border-paper-line px-4">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#0F766E]"
                    checked={draft.includeWeekends}
                    onChange={(e) => patch({ includeWeekends: e.target.checked })}
                  />
                  <span>Inclure samedis et dimanches</span>
                </label>
                <p className="hint">Décoché, les week-ends sont grisés et ne comptent pas dans le cycle.</p>
              </div>
              <div>
                <label htmlFor="hg" className="label">
                  Horaires de garde
                </label>
                <input
                  id="hg"
                  className="field"
                  placeholder="16h - 8h"
                  value={draft.hours.garde}
                  onChange={(e) => patch({ hours: { ...draft.hours, garde: e.target.value } })}
                />
              </div>
              <div>
                <label htmlFor="hp" className="label">
                  Horaires de permanence
                </label>
                <input
                  id="hp"
                  className="field"
                  placeholder="8h - 16h"
                  value={draft.hours.permanence}
                  onChange={(e) => patch({ hours: { ...draft.hours, permanence: e.target.value } })}
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl">Aperçu</h2>
              <p className="hint">Deux stagiaires fictifs sur 4 semaines, à partir d'un lundi.</p>
              {preview ? (
                <div className="mt-4 space-y-2 overflow-x-auto">
                  {preview.map((cells, r) => (
                    <div key={r} className="flex items-center gap-1">
                      <span className="w-8 text-sm text-ink-soft">S{r + 1}</span>
                      {cells.map((c, i) => (
                        <span
                          key={i}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs ${CELL_STYLE[c]} ${i % 7 === 0 ? "ml-2" : ""}`}
                        >
                          {SHIFT_CODE[c]}
                        </span>
                      ))}
                    </div>
                  ))}
                  <div className="pt-3">
                    <Legend hours={draft.hours} />
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-paper-tint p-4 text-sm text-ink-soft">
                  L'aperçu apparaît dès que le cycle est valide.
                </p>
              )}
            </div>

            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 rounded-2xl bg-warn-bg p-4 text-sm text-warn">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                className="text-sm text-garde underline disabled:cursor-not-allowed disabled:opacity-40"
                onClick={removeProfile}
                disabled={profiles.length <= 1}
              >
                Supprimer cette rotation
              </button>
              <div className="flex items-center gap-4">
                <span aria-live="polite" className="text-sm text-repos">
                  {saved ? "Enregistré" : ""}
                </span>
                <button type="button" className="btn-primary" onClick={save}>
                  Enregistrer
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
