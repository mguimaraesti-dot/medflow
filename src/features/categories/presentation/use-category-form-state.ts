"use client";

import { useCallback, useState } from "react";
import type { CategoryType } from "../domain/category.entity";
import { COLOR_PRESETS } from "./category-color-picker";

/** Usado tanto pra popular o formulário na 1ª renderização quanto pra repopular via `reset(values)` — ex: modal de edição trocando de categoria sem desmontar. */
export interface CategoryFormValues {
  name?: string;
  type?: CategoryType;
  color?: string;
}

export interface CategoryFormState {
  name: string;
  setName: (value: string) => void;
  type: CategoryType;
  setType: (value: CategoryType) => void;
  color: string;
  setColor: (value: string) => void;
  isValid: boolean;
  reset: (values?: CategoryFormValues) => void;
}

export function useCategoryFormState(
  initial?: CategoryFormValues,
): CategoryFormState {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<CategoryType>(initial?.type ?? "OUT");
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0].hex);

  // Identidade estável — permite usar `reset` na dependency array de um
  // `useEffect` sem loop infinito (ex: modal de edição repopulando ao
  // trocar de categoria).
  const reset = useCallback((values?: CategoryFormValues) => {
    setName(values?.name ?? "");
    setType(values?.type ?? "OUT");
    setColor(values?.color ?? COLOR_PRESETS[0].hex);
  }, []);

  return {
    name,
    setName,
    type,
    setType,
    color,
    setColor,
    isValid: name.trim().length > 0,
    reset,
  };
}
