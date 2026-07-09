import { AlertTriangle, CalendarClock, Landmark, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";

type KpiTone = "green" | "amber" | "red";

const TONE_ICON_CLASSES: Record<KpiTone, string> = {
  green: "bg-green-500/10 text-green-600 dark:text-green-500",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  red: "bg-red-500/10 text-red-600 dark:text-red-500",
};

const TONE_VALUE_CLASSES: Record<KpiTone, string> = {
  green: "text-green-600 dark:text-green-500",
  amber: "text-amber-600 dark:text-amber-500",
  red: "text-red-600 dark:text-red-500",
};

function DashboardKpiCard({
  label,
  caption,
  value,
  footer,
  icon: Icon,
  tone,
}: {
  label: string;
  caption?: string;
  value: string;
  footer: string;
  icon: LucideIcon;
  tone: KpiTone;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              TONE_ICON_CLASSES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-muted-foreground text-sm font-medium">
            {label}
            {caption && (
              <span className="text-muted-foreground/70 font-normal">
                {" "}
                · {caption}
              </span>
            )}
          </span>
        </div>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            TONE_VALUE_CLASSES[tone],
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground text-xs">{footer}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardKpiRow({
  cashBalance,
  safeBalance,
  dueTodayAmount,
  dueTodayCount,
  overdueAmount,
  overdueCount,
}: {
  cashBalance: string;
  safeBalance: string;
  dueTodayAmount: string;
  dueTodayCount: number;
  overdueAmount: string;
  overdueCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardKpiCard
        label="Saldo Caixa"
        caption="dinheiro"
        value={formatCurrencyBRL(cashBalance)}
        footer="Atualizado agora"
        icon={Wallet}
        tone="green"
      />
      <DashboardKpiCard
        label="Saldo Cofre"
        value={formatCurrencyBRL(safeBalance)}
        footer="Atualizado agora"
        icon={Landmark}
        tone="green"
      />
      <DashboardKpiCard
        label="Contas vencem hoje"
        value={formatCurrencyBRL(dueTodayAmount)}
        footer={dueTodayCount === 1 ? "1 conta" : `${dueTodayCount} contas`}
        icon={CalendarClock}
        tone="amber"
      />
      <DashboardKpiCard
        label="Contas vencidas"
        value={formatCurrencyBRL(overdueAmount)}
        footer={overdueCount === 1 ? "1 conta" : `${overdueCount} contas`}
        icon={AlertTriangle}
        tone="red"
      />
    </div>
  );
}
