"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { SegmentedControl } from "./segmented-control";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { startOfDayInTz } from "@/shared/lib/business-day";

export type PeriodPreset =
  "TODAY" | "WEEK" | "MONTH" | "NEXT_MONTH" | "YEAR" | "CUSTOM";

export interface PeriodRange {
  from: Date;
  to: Date;
}

/**
 * Mesmo default de `OrganizationSettings.timezone` usado em outros
 * pontos do backend (MVP opera com uma única clínica, ver CLAUDE.md).
 */
const TIMEZONE = "America/Sao_Paulo";

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/**
 * Fim do dia representado por um rótulo de data JÁ correto (meia-noite
 * UTC representando um dia calendário — mesma convenção de
 * `startOfDayInTz`/`dueDate`), não um instante real. Aritmética pura,
 * sem reconverter timezone: passar um rótulo por `startOfDayInTz`/
 * `endOfDayInTz` de novo desloca a data pra trás (o rótulo seria lido
 * como se fosse um instante real e re-convertido, cruzando meia-noite
 * ao subtrair as horas do fuso). Só `computePeriodRange` converte o
 * instante real (`new Date()`) uma única vez; daqui em diante é tudo
 * aritmética de calendário sobre esse rótulo.
 */
function endOfDayLabel(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/** Períodos representam o intervalo do calendário inteiro (ex: mês inteiro), não recortado até hoje. */
export function computePeriodRange(
  preset: PeriodPreset,
  custom?: PeriodRange,
): PeriodRange {
  const today = startOfDayInTz(new Date(), TIMEZONE);

  if (preset === "TODAY") {
    return { from: today, to: endOfDayLabel(today) };
  }

  if (preset === "WEEK") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - today.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { from: start, to: endOfDayLabel(end) };
  }

  if (preset === "MONTH") {
    const start = utcDate(today.getUTCFullYear(), today.getUTCMonth(), 1);
    const end = utcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 0);
    return { from: start, to: endOfDayLabel(end) };
  }

  if (preset === "NEXT_MONTH") {
    const start = utcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
    const end = utcDate(today.getUTCFullYear(), today.getUTCMonth() + 2, 0);
    return { from: start, to: endOfDayLabel(end) };
  }

  if (preset === "YEAR") {
    const start = utcDate(today.getUTCFullYear(), 0, 1);
    const end = utcDate(today.getUTCFullYear(), 11, 31);
    return { from: start, to: endOfDayLabel(end) };
  }

  return custom ?? { from: today, to: endOfDayLabel(today) };
}

const PERIOD_PRESET_OPTIONS = [
  { value: "TODAY" as const, label: "Hoje" },
  { value: "WEEK" as const, label: "Esta Semana" },
  { value: "MONTH" as const, label: "Este Mês" },
  { value: "NEXT_MONTH" as const, label: "Próximo Mês" },
  { value: "YEAR" as const, label: "Este Ano" },
  { value: "CUSTOM" as const, label: "Personalizado" },
];

export function PeriodSelector({
  preset,
  custom,
  onChange,
  variant = "segmented",
  size = "default",
}: {
  preset: PeriodPreset;
  custom?: PeriodRange;
  onChange: (preset: PeriodPreset, custom?: PeriodRange) => void;
  /** "select" é um único dropdown (usado em telas que precisam de cabeçalho mais enxuto); "segmented" (default) preserva o comportamento original de botões. */
  variant?: "segmented" | "select";
  /** Só se aplica à variante "select" — alinha a altura com os demais filtros de uma toolbar (ex: Contas a Pagar). */
  size?: "sm" | "default";
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const range = computePeriodRange(preset, custom);

  function handlePresetChange(next: PeriodPreset) {
    if (next === "CUSTOM") {
      // Adota CUSTOM já com o range atual como ponto de partida — se só
      // marcássemos `popoverOpen` sem chamar `onChange`, o preset do pai
      // nunca vira "CUSTOM" e o Popover abaixo (guardado por
      // `preset === "CUSTOM"`) nunca chega a renderizar.
      setFromInput(range.from.toISOString().slice(0, 10));
      setToInput(range.to.toISOString().slice(0, 10));
      onChange("CUSTOM", { from: range.from, to: range.to });
      setPopoverOpen(true);
      return;
    }
    onChange(next);
  }

  function applyCustom() {
    if (!fromInput || !toInput) return;
    // `to` precisa virar fim do dia (23:59:59.999) — senão o intervalo
    // corta às 00:00 UTC do último dia (bug real já relatado: o
    // Relatório do Caixa Recepção perdia as movimentações de "hoje" em
    // qualquer período multi-dia digitado aqui).
    onChange("CUSTOM", {
      from: new Date(fromInput),
      to: endOfDayLabel(new Date(toInput)),
    });
    setPopoverOpen(false);
  }

  const customRangeControl = preset === "CUSTOM" && (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarDays className="h-4 w-4" />
          {formatDateOnlyBR(range.from)} - {formatDateOnlyBR(range.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-3 p-4">
        <div className="space-y-2">
          <Label htmlFor="period-from">De</Label>
          <Input
            id="period-from"
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-to">Até</Label>
          <Input
            id="period-to"
            type="date"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!fromInput || !toInput}
          onClick={applyCustom}
        >
          Aplicar
        </Button>
      </PopoverContent>
    </Popover>
  );

  if (variant === "select") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={preset}
          onValueChange={(value) => handlePresetChange(value as PeriodPreset)}
        >
          <SelectTrigger size={size} className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customRangeControl}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        options={PERIOD_PRESET_OPTIONS}
        value={preset}
        onChange={handlePresetChange}
      />
      {customRangeControl}
    </div>
  );
}
