import { Landmark, Wallet } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * "Valores disponíveis em espécie" (posição) — seção 3 do Dashboard
 * mobile. Mesmos
 * `cashBalance`/`safeBalance`/`availableTotal` do overview, já usados
 * hoje no KPI row e em "Disponibilidade Financeira" — aqui só aparecem
 * UMA vez (Opção A do protótipo de KPI: 2 cards Caixa/Cofre + Total em
 * faixa destacada), em vez de repetidos em 3 lugares diferentes.
 */
export function DashboardMobilePosition({
  cashBalance,
  safeBalance,
  availableTotal,
}: {
  cashBalance: string;
  safeBalance: string;
  availableTotal: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Valores disponíveis em espécie
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Card className="py-3">
          <CardContent className="flex flex-col gap-2 px-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                Caixa{" "}
                <span className="text-muted-foreground/70">na gaveta</span>
              </p>
              <p className="text-lg font-semibold text-green-600 tabular-nums dark:text-green-500">
                {formatCurrencyBRL(cashBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex flex-col gap-2 px-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
              <Landmark className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                Cofre{" "}
                <span className="text-muted-foreground/70">em espécie</span>
              </p>
              <p className="text-lg font-semibold text-green-600 tabular-nums dark:text-green-500">
                {formatCurrencyBRL(safeBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/15 to-green-500/5 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400">
            Total disponível
          </p>
          <p className="text-muted-foreground text-[11px]">Caixa + Cofre</p>
        </div>
        <p className="text-xl font-bold tracking-tight text-green-600 tabular-nums dark:text-green-500">
          {formatCurrencyBRL(availableTotal)}
        </p>
      </div>
    </div>
  );
}
