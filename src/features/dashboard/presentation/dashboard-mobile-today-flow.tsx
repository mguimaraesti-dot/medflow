import { FileText, Unlock } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * "O que entrou e saiu hoje" (fluxo do dia) — seção 4 do Dashboard
 * mobile. Mesmos `receivedToday*`/`paidToday*` já usados hoje em
 * `DashboardFinancialFlowCard` — aqui só as DUAS linhas do dia
 * (Recebimentos/Pagamentos), sem repetir Caixa/Cofre/Saldo Disponível
 * (que já aparecem em "Quanto tenho agora"). Em linha (não KPI) porque
 * a composição "Dinheiro X + PIX Y" precisa de espaço horizontal.
 */
export function DashboardMobileTodayFlow({
  receivedTodayTotal,
  receivedTodayCash,
  receivedTodayPix,
  receivedTodayCount,
  paidTodayAmount,
  paidTodayCount,
}: {
  receivedTodayTotal: string;
  receivedTodayCash: string;
  receivedTodayPix: string;
  receivedTodayCount: number;
  paidTodayAmount: string;
  paidTodayCount: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        O que entrou e saiu hoje
      </p>
      <Card className="py-1">
        <CardContent className="divide-y px-3">
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-500">
              <Unlock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Recebimentos</p>
              <p className="text-muted-foreground text-xs">
                Dinheiro {formatCurrencyBRL(receivedTodayCash)} + PIX{" "}
                {formatCurrencyBRL(receivedTodayPix)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold text-green-600 tabular-nums dark:text-green-500">
                + {formatCurrencyBRL(receivedTodayTotal)}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {receivedTodayCount === 1
                  ? "1 lançamento"
                  : `${receivedTodayCount} lançamentos`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-500">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Pagamentos</p>
              <p className="text-muted-foreground text-xs">Contas pagas hoje</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-destructive text-base font-semibold tabular-nums">
                - {formatCurrencyBRL(paidTodayAmount)}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {paidTodayCount === 1 ? "1 conta" : `${paidTodayCount} contas`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
