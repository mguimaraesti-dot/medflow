import { Info, Landmark, Wallet } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function DashboardAvailabilityCard({
  cashBalance,
  safeBalance,
  availableTotal,
}: {
  cashBalance: string;
  safeBalance: string;
  availableTotal: string;
}) {
  return (
    <Card className="flex flex-col gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          Disponibilidade Financeira
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="text-muted-foreground h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              Soma do dinheiro físico da Caixa Recepção com o saldo do Cofre.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-wrap items-center justify-center gap-3 px-4">
        <div className="flex min-w-[92px] flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-muted-foreground text-xs font-medium">
            Caixa <span className="text-muted-foreground/70">(dinheiro)</span>
          </span>
          <span className="text-base font-semibold tabular-nums">
            {formatCurrencyBRL(cashBalance)}
          </span>
        </div>
        <span className="text-muted-foreground pb-6 text-xl font-light">+</span>
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
        <span className="text-muted-foreground pb-6 text-xl font-light">=</span>
        <div className="flex min-w-[130px] flex-col items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5">
          <span className="text-xs font-semibold text-green-600 dark:text-green-500">
            Total Disponível
          </span>
          <span className="text-xl font-bold text-green-600 tabular-nums dark:text-green-500">
            {formatCurrencyBRL(availableTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
