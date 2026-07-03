import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes do Tailwind de forma segura, resolvendo conflitos
 * (ex: "p-2" e "p-4" juntos) e permitindo classes condicionais.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
