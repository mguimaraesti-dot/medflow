import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  TONE_ICON_CLASSES,
  TONE_VALUE_CLASSES,
} from "./dashboard-timeline-card";

/**
 * "Entradas e saídas de hoje" (fluxo do dia) — seção 4 do Dashboard
 * mobile. Mesmos `receivedToday*`/`paidToday*` já usados hoje em
 * `DashboardFinancialFlowCard` — aqui só os DOIS KPIs do dia
 * (Entradas/Saídas, lado a lado), sem repetir Caixa/Cofre/Saldo
 * Disponível (que já aparecem em "Valores disponíveis em espécie").
 * Reaproveita as classes de tom (`TONE_ICON_CLASSES`/`TONE_VALUE_CLASSES`)
 * já usadas na Timeline — mesma convenção de cor do produto (verde =
 * entrada, vermelho = saída, azul = neutro/PIX).
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
        Entradas e saídas de hoje
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Card className="flex flex-col py-3">
          <CardContent className="flex flex-1 flex-col gap-3 px-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_CLASSES.green}`}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
              </span>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Entradas
              </p>
            </div>
            <p
              className={`text-lg font-semibold tabular-nums ${TONE_VALUE_CLASSES.green}`}
            >
              + {formatCurrencyBRL(receivedTodayTotal)}
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <Badge
                  variant="outline"
                  className={`border-transparent ${TONE_ICON_CLASSES.green}`}
                >
                  Dinheiro
                </Badge>
                <span className="font-medium tabular-nums">
                  {formatCurrencyBRL(receivedTodayCash)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <Badge
                  variant="outline"
                  className={`border-transparent ${TONE_ICON_CLASSES.blue}`}
                >
                  PIX
                </Badge>
                <span className="font-medium tabular-nums">
                  {formatCurrencyBRL(receivedTodayPix)}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-auto text-[11px]">
              {receivedTodayCount === 1
                ? "1 lançamento"
                : `${receivedTodayCount} lançamentos`}
            </p>
          </CardContent>
        </Card>
        <Card className="flex flex-col py-3">
          <CardContent className="flex flex-1 flex-col gap-3 px-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_CLASSES.red}`}
              >
                <ArrowUpFromLine className="h-3.5 w-3.5" />
              </span>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Saídas
              </p>
            </div>
            <p
              className={`text-lg font-semibold tabular-nums ${TONE_VALUE_CLASSES.red}`}
            >
              - {formatCurrencyBRL(paidTodayAmount)}
            </p>
            <p className="text-muted-foreground mt-auto text-[11px]">
              {paidTodayCount === 1
                ? "1 conta paga hoje"
                : `${paidTodayCount} contas pagas hoje`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
