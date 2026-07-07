"use client";

import { cn } from "@/shared/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Classe de fundo do indicador quando este segmento está ativo (ex: "bg-green-600"). */
  activeClassName?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "default",
}: {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** "lg" — botões maiores, usado no formulário de Novo Lançamento da Caixa Recepção. */
  size?: "default" | "lg";
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="tablist"
      className="bg-muted relative inline-flex w-full rounded-lg p-1"
    >
      <div
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 rounded-md shadow-sm transition-transform duration-200 ease-out",
          options[activeIndex]?.activeClassName ?? "bg-primary",
        )}
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={index === activeIndex}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex-1 rounded-md font-medium transition-colors",
            size === "lg" ? "px-6 py-3 text-base" : "px-4 py-1.5 text-sm",
            index === activeIndex
              ? "text-white"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
