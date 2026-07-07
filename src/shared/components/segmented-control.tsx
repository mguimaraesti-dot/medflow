"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Classe de fundo do indicador quando este segmento está ativo (ex: "bg-green-600"). */
  activeClassName?: string;
  icon?: LucideIcon;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "default",
  fullWidth = true,
}: {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** "lg" — botões maiores (uso legado); "default" — ~40px de altura. */
  size?: "default" | "lg";
  /**
   * `false` — o controle ocupa só o espaço do conteúdo (não estica pra
   * preencher a linha inteira) — usado no toggle Entrada/Saída da Caixa
   * Recepção, pra evitar uma barra colorida ocupando toda a largura.
   */
  fullWidth?: boolean;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="tablist"
      className={cn(
        "bg-muted relative rounded-xl p-1",
        fullWidth ? "flex w-full" : "inline-flex w-fit",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 rounded-lg shadow-sm transition-transform duration-200 ease-out",
          options[activeIndex]?.activeClassName ?? "bg-primary",
        )}
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-200",
              fullWidth ? "flex-1" : "flex-none",
              size === "lg" ? "px-6 py-3 text-base" : "h-10 px-5 text-sm",
              index === activeIndex
                ? "text-white"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
