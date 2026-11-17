"use client";

import { useEffect, useState } from "react";

/**
 * État persisté dans le navigateur (localStorage).
 * `ready` passe à vrai une fois la valeur sauvegardée relue, pour éviter un affichage qui saute.
 * À remplacer par un appel à l'API quand le backend (Express + MySQL) sera branché.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* stockage indisponible ou contenu illisible : on garde la valeur par défaut */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota dépassé ou navigation privée : on ignore */
    }
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}
