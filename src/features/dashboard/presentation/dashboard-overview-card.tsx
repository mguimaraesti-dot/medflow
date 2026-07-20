import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Info,
  Landmark,
  Wallet,
} from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { DashboardPendencyResponseDTO } from "../application/dtos/dashboard-overview.response-dto";

export const SEVERITY_ICON_CLASSES: Record<
  DashboardPendencyResponseDTO["severity"],
  string
> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-500",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function pendencySubtitle(
  pendency: DashboardPendencyResponseDTO,
): string {
  switch (pendency.code) {
    case "OVERDUE_PAYABLES":
    case "DUE_TODAY_PAYABLES":
      return `Total: ${formatCurrencyBRL(pendency.amount ?? "0")}`;
    case "PENDING_TREASURY_CONFIRMATION":
      return `${pendency.count === 1 ? "1 recolhimento" : `${pendency.count} recolhimentos`} — ${formatCurrencyBRL(pendency.amount ?? "0")}`;
    case "CASH_REGISTER_NOT_OPENED":
      return "Aguardando abertura";
    case "REVERSED_ENTRIES_TODAY":
      return "Verifique os motivos no histórico";
    default:
      return "";
  }
}

/**
 * "Visão Geral" — agrupa dois painéis que antes eram cards separados
 * (Disponibilidade Financeira + Pendências, aqui renomeado "Tendências e
 * Alertas") num único card, empilhados verticalmente (Refinamento
 * reagrupamento visual Dashboard). Mesma lógica/dados de antes, só
 * reposicionados.
 */
export function DashboardOverviewCard({
  cashBalance,
  safeBalance,
  availableTotal,
  pendencies,
}: {
  cashBalance: string;
  safeBalance: string;
  availableTotal: string;
  pendencies: DashboardPendencyResponseDTO[];
}) {
  return (
    <Card className="flex flex-col gap-3 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm font-semibold">Visão Geral</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-3">
        <div>
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
            Disponibilidade Financeira
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                Soma do dinheiro físico da Caixa Recepção com o saldo do Cofre.
              </TooltipContent>
            </Tooltip>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex min-w-[92px] flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500">
                <Wallet className="h-5 w-5" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Caixa{" "}
                <span className="text-muted-foreground/70">(dinheiro)</span>
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrencyBRL(cashBalance)}
              </span>
            </div>
            <span className="text-muted-foreground pb-6 text-xl font-light">
              +
            </span>
            <div className="flex min-w-[92px] flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500">
                <Landmark className="h-5 w-5" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Cofre
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrencyBRL(safeBalance)}
              </span>
            </div>
            <span className="text-muted-foreground pb-6 text-xl font-light">
              =
            </span>
            <div className="flex min-w-[130px] flex-col items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2">
              <span className="text-xs font-semibold text-green-600 dark:text-green-500">
                Total Disponível
              </span>
              <span className="text-lg font-bold text-green-600 tabular-nums dark:text-green-500">
                {formatCurrencyBRL(availableTotal)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
            Tendências e Alertas
          </p>
          {pendencies.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma pendência no momento.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pendencies.map((pendency) => (
                <div
                  key={pendency.code}
                  className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2.5"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      SEVERITY_ICON_CLASSES[pendency.severity],
                    )}
                  >
                    {pendency.severity === "info" ? (
                      <Info className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {pendency.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {pendencySubtitle(pendency)}
                    </p>
                  </div>
                  <Link
                    href={pendency.href}
                    className="text-primary bg-primary/10 hover:bg-primary/20 flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold"
                  >
                    Resolver <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
