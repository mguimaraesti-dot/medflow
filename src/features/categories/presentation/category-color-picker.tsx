"use client";

import { cn } from "@/shared/lib/utils";

/** Nomes em pt-BR pra cada preset — usados no `title` do swatch e no tooltip da coluna "Cor" da tabela. */
export const COLOR_PRESETS: { hex: string; name: string }[] = [
  { hex: "#16A34A", name: "Verde" },
  { hex: "#0EA5E9", name: "Azul" },
  { hex: "#6366F1", name: "Índigo" },
  { hex: "#DC2626", name: "Vermelho" },
  { hex: "#F59E0B", name: "Amarelo" },
  { hex: "#7C3AED", name: "Roxo" },
  { hex: "#DB2777", name: "Rosa" },
  { hex: "#64748B", name: "Cinza" },
];

export function colorName(hex: string): string {
  return (
    COLOR_PRESETS.find(
      (preset) => preset.hex.toLowerCase() === hex.toLowerCase(),
    )?.name ?? hex
  );
}

/**
 * Seleção de cor com estado visual claro (Refinamento UX/UI Categorias):
 * selecionada aumenta levemente, ganha borda branca + sombra azul: hover
 * aumenta um pouco menos, pra a transição pra "selecionada" não parecer
 * um salto brusco.
 */
export function CategoryColorPicker({
  value,
  onChange,
  idPrefix = "category",
}: {
  value: string;
  onChange: (color: string) => void;
  idPrefix?: string;
}) {
  return (
    <div
      className="flex flex-wrap gap-2.5"
      role="radiogroup"
      aria-label="Cor da categoria"
    >
      {COLOR_PRESETS.map((preset) => {
        const isSelected = preset.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={preset.hex}
            type="button"
            id={`${idPrefix}-color-${preset.hex}`}
            role="radio"
            aria-checked={isSelected}
            title={preset.name}
            aria-label={`Cor ${preset.name}`}
            onClick={() => onChange(preset.hex)}
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-200 ease-out",
              "hover:scale-110 focus-visible:outline-none",
              // ring-offset-2 (branco) + ring-ring (azul, o token --ring do
              // tema) em vez de um shadow-[...] arbitrário — testado ao
              // vivo: misturar utilities ring-* com valores arbitrários de
              // shadow faz as duas se cancelarem nesta versão do Tailwind.
              isSelected
                ? "ring-ring scale-110 ring-2 ring-offset-2"
                : "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
            )}
            style={{ backgroundColor: preset.hex }}
          />
        );
      })}
    </div>
  );
}
