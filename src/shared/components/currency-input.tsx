"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

/** Sem o símbolo "R$" — quem exibe o prefixo é o span decorativo do input, nunca os dois juntos. */
function formatValue(value: number | undefined): string {
  if (!value) return "";
  return Number.isInteger(value)
    ? value.toLocaleString("pt-BR")
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

/** Converte o texto já digitado (dígitos + no máximo uma vírgula) pro número em reais. */
function parseRaw(raw: string): number {
  const [integerPart, decimalPart] = raw.split(",");
  return Number(`${integerPart || 0}.${decimalPart || 0}`);
}

/**
 * Input de valor monetário: digitação começa pela parte inteira (ex:
 * "10" vira "R$ 10", não "R$ 0,10") — centavos só entram se o usuário
 * digitar vírgula ou ponto explicitamente (Refinamento UX Caixa
 * Recepção). Sem agrupamento de milhar durante a digitação (evitaria
 * reinterpretar o próprio ponto de formatação como separador decimal a
 * cada tecla) — o agrupamento aparece ao sair do campo.
 */
export const CurrencyInput = forwardRef<
  HTMLInputElement,
  {
    value: number | undefined;
    onChange: (value: number) => void;
    disabled?: boolean;
    id?: string;
    className?: string;
  }
>(function CurrencyInput({ value, onChange, disabled, id, className }, ref) {
  const [display, setDisplay] = useState(() => formatValue(value));
  const [isFocused, setIsFocused] = useState(false);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (!isFocused) setDisplay(formatValue(value));
  }, [value, isFocused]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = event.target.value.replace(/[^\d.,]/g, "");
    const firstSep = cleaned.search(/[.,]/);

    const raw =
      firstSep === -1
        ? cleaned
        : `${cleaned.slice(0, firstSep)},${cleaned
            .slice(firstSep + 1)
            .replace(/[.,]/g, "")
            .slice(0, 2)}`;

    setDisplay(raw);
    const numericValue = parseRaw(raw);
    lastEmitted.current = numericValue;
    onChange(numericValue);
  }

  function handleBlur() {
    setIsFocused(false);
    setDisplay(formatValue(value));
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
        R$
      </span>
      <Input
        ref={ref}
        id={id}
        inputMode="decimal"
        disabled={disabled}
        value={display}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="0"
        className={cn("pl-10 text-lg font-semibold", className)}
      />
    </div>
  );
});
