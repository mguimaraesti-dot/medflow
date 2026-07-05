"use client";

import { useEffect, useState } from "react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

/** Sem o símbolo "R$" — quem exibe o prefixo é o span decorativo do input, nunca os dois juntos. */
function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Input de valor monetário mascarado: dígitos preenchem da direita pra
 * esquerda (padrão de mask BR — o cursor sempre vai pro fim, é
 * intencional). Expõe o valor numérico puro pro RHF via `onChange`.
 */
export function CurrencyInput({
  value,
  onChange,
  disabled,
  id,
  className,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay(value ? formatCentsToBRL(Math.round(value * 100)) : "");
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");
    const cents = digits ? Number(digits) : 0;
    onChange(cents / 100);
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        disabled={disabled}
        value={display}
        onChange={handleChange}
        placeholder="0,00"
        className={cn("pl-10 text-lg font-semibold", className)}
      />
    </div>
  );
}
