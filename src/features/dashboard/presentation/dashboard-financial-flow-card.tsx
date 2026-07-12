import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  Banknote,
  FileText,
  Landmark,
  Unlock,
  Wallet,
} from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type FlowTone = "green" | "red";

const TONE_ICON_CLASSES: Record<FlowTone, string> = {
  green: "bg-green-500/10 text-green-600 dark:text-green-500",
  red: "bg-red-500/10 text-red-600 dark:text-red-500",
};

const TONE_BORDER_CLASSES: Record<FlowTone, string> = {
  green: "border-green-500/30",
  red: "border-red-500/30",
};

const TONE_VALUE_CLASSES: Record<FlowTone, string> = {
  green: "text-green-600 dark:text-green-500",
  red: "text-red-600 dark:text-red-500",
};

function FlowNode({
  icon: Icon,
  label,
  value,
  sub,
  count,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  count?: number;
  tone: FlowTone;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 flex w-full items-center gap-2.5 rounded-lg border p-2.5",
        TONE_BORDER_CLASSES[tone],
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          TONE_ICON_CLASSES[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p
          className={cn(
            "text-base font-semibold tabular-nums",
            TONE_VALUE_CLASSES[tone],
          )}
        >
          {value}
        </p>
        {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
      </div>
      {typeof count === "number" && (
        <span className="text-muted-foreground text-xs">{count}</span>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="text-muted-foreground flex justify-center">
      <ArrowDown className="h-3.5 w-3.5" />
    </div>
  );
}

export function DashboardFinancialFlowCard({
  receivedTodayTotal,
  receivedTodayCash,
  receivedTodayPix,
  receivedTodayCount,
  cashBalance,
  safeBalance,
  paidTodayAmount,
  paidTodayCount,
  availableTotal,
}: {
  receivedTodayTotal: string;
  receivedTodayCash: string;
  receivedTodayPix: string;
  receivedTodayCount: number;
  cashBalance: string;
  safeBalance: string;
  paidTodayAmount: string;
  paidTodayCount: number;
  availableTotal: string;
}) {
  return (
    <Card className="flex flex-col gap-3 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm font-semibold">
          Fluxo Financeiro do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-0 px-3">
        <FlowNode
          icon={Unlock}
          label="Recebimentos"
          value={formatCurrencyBRL(receivedTodayTotal)}
          sub={`Todas as formas · Dinheiro ${formatCurrencyBRL(receivedTodayCash)} + PIX ${formatCurrencyBRL(receivedTodayPix)}`}
          count={receivedTodayCount}
          tone="green"
        />
        <FlowArrow />
        <FlowNode
          icon={Wallet}
          label="Caixa Recepção"
          value={formatCurrencyBRL(cashBalance)}
          sub="Só dinheiro físico — PIX não fica em caixa"
          tone="green"
        />
        <FlowArrow />
        <FlowNode
          icon={Landmark}
          label="Cofre"
          value={formatCurrencyBRL(safeBalance)}
          tone="green"
        />
        <FlowArrow />
        <FlowNode
          icon={FileText}
          label="Pagamentos"
          value={`- ${formatCurrencyBRL(paidTodayAmount)}`}
          count={paidTodayCount}
          tone="red"
        />
        <FlowArrow />
        <FlowNode
          icon={Banknote}
          label="Saldo Disponível"
          value={formatCurrencyBRL(availableTotal)}
          tone="green"
        />
      </CardContent>
    </Card>
  );
}
