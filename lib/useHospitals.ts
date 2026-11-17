"use client";

import { useCallback, useMemo } from "react";
import { DEFAULT_HOSPITALS, STORAGE_KEYS } from "./hospitals";
import type { Hospital } from "./types";
import { useLocalState } from "./useLocalState";

interface Store {
  /** Hôpitaux modifiés ou créés depuis l'administration. */
  items: Hospital[];
  /** Hôpitaux du registre supprimés depuis l'administration. */
  deleted: string[];
}

/**
 * Liste des hôpitaux = registre du code (lib/hospitals.ts) + modifications faites dans l'administration.
 * Un hôpital ajouté au code apparaît donc chez tout le monde, sans vider le navigateur.
 * Une modification faite dans l'administration prend le dessus sur la version du code.
 */
export function useHospitals() {
  const [store, setStore, ready] = useLocalState<Store>(STORAGE_KEYS.hospitals, {
    items: [],
    deleted: [],
  });

  const hospitals = useMemo(() => {
    const ids = new Set(store.items.map((h) => h.id));
    const fromCode = DEFAULT_HOSPITALS.filter((h) => !ids.has(h.id) && !store.deleted.includes(h.id));
    return [...fromCode, ...store.items];
  }, [store]);

  const setHospitals = useCallback(
    (updater: (list: Hospital[]) => Hospital[]) => {
      const next = updater(hospitals);
      const nextIds = new Set(next.map((h) => h.id));
      setStore({
        items: next,
        deleted: DEFAULT_HOSPITALS.map((h) => h.id).filter((id) => !nextIds.has(id)),
      });
    },
    [hospitals, setStore],
  );

  const resetHospitals = useCallback(() => setStore({ items: [], deleted: [] }), [setStore]);

  return { hospitals, setHospitals, resetHospitals, ready };
}
