"use client";

import { Heart, History, Lightbulb, Repeat } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import {
  STATUS_META,
  PERIODICITY_LABEL,
  formatCompetencia,
} from "./accounts-payable-helpers";
import { useRecurringBillOccurrences } from "./use-recurring-bill-occurrences";
import {
  useRecurringBillInsights,
  type RecurringBillHealthLevel,
} from "./use-recurring-bill-insights";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

const HEALTH_META: Record<
  RecurringBillHealthLevel,
  { label: string; badgeClassName: string; barClassName: string }
> = {
  OK: {
    label: "Em dia",
    badgeClassName:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
    barClassName: "bg-green-500",
  },
  ATTENTION: {
    label: "Atenção",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    barClassName: "bg-amber-500",
  },
  CRITICAL: {
    label: "Crítica",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    barClassName: "bg-red-500",
  },
};

function averageLeadLabel(days: number | null): string {
  if (days === null) return "—";
  if (days > 0)
    return `${days} dia${days === 1 ? "" : "s"} antes do vencimento`;
  if (days < 0)
    return `${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"} após o vencimento`;
  return "No dia do vencimento";
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

/**
 * Drawer secundário — evolução cronológica da recorrência (resumo
 * financeiro, saúde e insight automático) seguida da timeline de Cards por
 * ocorrência. Todas as ocorrências já existem como `AccountsPayable` reais
 * (geração em lote no cadastro, sem cron incremental) — por isso, ao
 * contrário do mockup original, toda ocorrência aqui tem "Abrir Conta" e
 * mostra seu status real (Paga/Pendente/Vencida/Cancelada), sem um 4º
 * estado sintético de "Programada ainda não gerada".
 */
export function RecurringBillTimelineDrawer({
  recurringBillId,
  currentPayableId,
  open,
  onOpenChange,
  onOpenAccount,
}: {
  recurringBillId: string;
  currentPayableId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAccount: (payable: AccountsPayableResponseDTO) => void;
}) {
  const { data: result } = useRecurringBillOccurrences(recurringBillId);
  const occurrences = result?.items ?? [];
  const { data: insights } = useRecurringBillInsights(recurringBillId);
  const { data: suppliers } = useSuppliers();
  const supplierName = suppliers?.find(
    (s) => s.id === insights?.supplierId,
  )?.name;

  const healthMeta = insights ? HEALTH_META[insights.health.status] : null;
  // Barra usa a pontualidade real quando já existe histórico de pagamento;
  // sem nenhum pagamento ainda, aproxima pelo status calculado.
  const healthPercent =
    insights?.health.punctualityPercent ??
    (insights?.health.status === "OK"
      ? 100
      : insights?.health.status === "ATTENTION"
        ? 60
        : 20);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Linha do Tempo
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {insights && (
            <>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  {insights.description}
                  {supplierName ? ` - ${supplierName}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  {PERIODICITY_LABEL[insights.periodicity]}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <SummaryField
                    label="Valor mensal"
                    value={formatCurrencyBRL(insights.monthlyAmount)}
                  />
                  <SummaryField
                    label="Valor anual previsto"
                    value={formatCurrencyBRL(insights.yearlyForecastAmount)}
                  />
                  <SummaryField
                    label="Próxima geração"
                    value={
                      insights.nextGenerationDate
                        ? formatDateOnlyBR(insights.nextGenerationDate)
                        : "—"
                    }
                  />
                  <SummaryField
                    label="Ocorrências geradas"
                    value={String(insights.occurrencesGenerated)}
                  />
                  <SummaryField
                    label="Ocorrências pagas"
                    value={String(insights.occurrencesPaid)}
                  />
                  <SummaryField
                    label="Ocorrências pendentes"
                    value={String(insights.occurrencesPending)}
                  />
                  <SummaryField
                    label="Ocorrências atrasadas"
                    value={String(insights.occurrencesOverdue)}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Heart className="h-4 w-4 text-red-500" />
                  Saúde da Recorrência
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <Badge
                    variant="outline"
                    className={healthMeta?.badgeClassName}
                  >
                    {healthMeta?.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <SummaryField
                    label="Último pagamento"
                    value={
                      insights.health.lastPaymentDate
                        ? formatDateOnlyBR(insights.health.lastPaymentDate)
                        : "—"
                    }
                  />
                  <SummaryField
                    label="Pontualidade"
                    value={
                      insights.health.punctualityPercent !== null
                        ? `${insights.health.punctualityPercent}%`
                        : "—"
                    }
                  />
                  <SummaryField
                    label="Ocorrências"
                    value={String(insights.occurrencesGenerated)}
                  />
                  <SummaryField
                    label="Pagas"
                    value={String(insights.occurrencesPaid)}
                  />
                  <SummaryField
                    label="Pendentes"
                    value={String(insights.occurrencesPending)}
                  />
                  <SummaryField
                    label="Atrasadas"
                    value={String(insights.occurrencesOverdue)}
                  />
                  <SummaryField
                    label="Canceladas"
                    value={String(insights.occurrencesCancelled)}
                  />
                  <SummaryField
                    label="Valor anual previsto"
                    value={formatCurrencyBRL(insights.yearlyForecastAmount)}
                  />
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Saúde</span>
                    <span className="font-medium">{healthPercent}%</span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        healthMeta?.barClassName,
                      )}
                      style={{ width: `${healthPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Insight do MedFlow
                </p>
                {insights.insight.kind === "LATE_PATTERN" ? (
                  <>
                    <p className="text-sm">
                      Nos últimos {insights.insight.recentWindowSize} meses esta
                      despesa foi paga com atraso em{" "}
                      {insights.insight.recentLateCount} oportunidade
                      {insights.insight.recentLateCount === 1 ? "" : "s"}.
                    </p>
                    <SummaryField
                      label="Tempo médio de atraso"
                      value={`${insights.insight.averageDelayDays} dia${insights.insight.averageDelayDays === 1 ? "" : "s"}`}
                    />
                  </>
                ) : insights.insight.kind === "PRICE_INCREASE" ? (
                  <>
                    <p className="text-sm">
                      Esta despesa sofreu aumento de valor em{" "}
                      {insights.insight.increaseCount} oportunidades no último
                      ano.
                    </p>
                    <SummaryField
                      label="Variação acumulada"
                      value={`+${insights.insight.cumulativeChangePercent}%`}
                    />
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      Esta recorrência possui {insights.insight.monthsOfHistory}{" "}
                      meses de histórico.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <SummaryField
                        label="Pagamentos em dia"
                        value={String(insights.insight.onTimeCount)}
                      />
                      <SummaryField
                        label="Atrasos"
                        value={String(insights.insight.lateCount)}
                      />
                      <SummaryField
                        label="Tempo médio de pagamento"
                        value={averageLeadLabel(
                          insights.insight.averageLeadDays,
                        )}
                      />
                      <SummaryField
                        label="Próximo vencimento"
                        value={
                          insights.nextGenerationDate
                            ? formatDateOnlyBR(insights.nextGenerationDate)
                            : "—"
                        }
                      />
                    </div>
                  </>
                )}
                <p className="text-xs">
                  <span className="text-muted-foreground">Recomendação: </span>
                  {insights.insight.recommendation}
                </p>
              </div>
            </>
          )}

          {occurrences.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Nenhuma ocorrência encontrada."
              description="As contas geradas por esta recorrência aparecem aqui."
            />
          ) : (
            <ol className="space-y-3">
              {occurrences.map((occurrence) => {
                const badge = STATUS_META[occurrence.displayStatus];
                const isCurrent = occurrence.id === currentPayableId;
                return (
                  <li
                    key={occurrence.id}
                    className={cn(
                      "space-y-2 rounded-lg border p-3",
                      isCurrent && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {formatCompetencia(occurrence.dueDate)}
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-primary border-primary/30"
                          >
                            Atual
                          </Badge>
                        )}
                      </p>
                      <Badge variant="outline" className={badge.badgeClassName}>
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <SummaryField
                        label="Vencimento"
                        value={formatDateOnlyBR(occurrence.dueDate)}
                      />
                      <SummaryField
                        label="Valor"
                        value={formatCurrencyBRL(occurrence.amount)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenAccount(occurrence)}
                    >
                      Abrir Conta
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
