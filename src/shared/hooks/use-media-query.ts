"use client";

import { useEffect, useState } from "react";

/**
 * `false` até montar (assume desktop no SSR, igual ao comportamento
 * anterior sem essa checagem) — evita mismatch de hidratação, ao custo
 * de um possível flash breve da variante desktop antes de medir a
 * viewport real no mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
