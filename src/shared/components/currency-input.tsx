"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

/** Sem o símbolo "R$" — quem exibe o prefixo é o span decorativo do input, nunca os dois juntos. */
function formatValue(value: number | undefined): string {
  if (!value) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "." só existe como separador de milhar injetado pelo próprio componente — nunca é decimal. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Converte o texto já digitado (dígitos agrupados + no máximo uma vírgula) pro número em reais. */
function parseRaw(raw: string): number {
  const [integerPart, decimalPart] = raw.replaceAll(".", "").split(",");
  return Number(`${integerPart || 0}.${decimalPart || 0}`);
}

/**
 * Input de valor monetário: digitação começa pela parte inteira (ex:
 * "100" vira "R$ 100,00", não "R$ 1,00") — centavos só entram se o
 * usuário digitar vírgula explicitamente (Refinamento UX Caixa
 * Recepção). Milhar é agrupado em tempo real; "." nunca é tratado como
 * separador decimal digitado pelo usuário (só vírgula), o que evita
 * reinterpretar o próprio ponto de formatação a cada tecla.
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
    // "." é sempre ruído de formatação (nosso próprio agrupamento de
    // milhar) — só dígitos e vírgula sobrevivem à limpeza.
    const cleaned = event.target.value.replace(/[^\d,]/g, "");
    const firstComma = cleaned.indexOf(",");

    let integerDigits: string;
    let decimalDigits: string | undefined;
    if (firstComma === -1) {
      integerDigits = cleaned;
    } else {
      integerDigits = cleaned.slice(0, firstComma);
      decimalDigits = cleaned
        .slice(firstComma + 1)
        .replaceAll(",", "")
        .slice(0, 2);
    }
    integerDigits = integerDigits.replace(/^0+(?=\d)/, "");

    const groupedInteger = integerDigits ? groupThousands(integerDigits) : "";
    const raw =
      cleaned === ""
        ? ""
        : decimalDigits !== undefined
          ? `${groupedInteger || "0"},${decimalDigits}`
          : groupedInteger;

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
        placeholder="0,00"
        className={cn("pl-10 text-lg font-semibold", className)}
      />
    </div>
  );
});
