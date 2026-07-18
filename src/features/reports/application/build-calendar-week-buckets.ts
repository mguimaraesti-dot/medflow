const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatShortDayMonth(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export interface CalendarWeekBucket {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Semanas de CALENDÁRIO (domingo a sábado) dentro do período — não
 * blocos de 7 dias contados a partir de `dateFrom` (bug corrigido: um
 * período que começa numa quarta gerava "semanas" tipo 01-07, 08-14...,
 * quando "semana" implica semana de calendário de verdade). A primeira
 * e a última semana podem ser PARCIAIS quando o período não começa num
 * domingo ou não termina num sábado — isso é esperado, não um erro, e
 * o rótulo indica "(parcial)" pra não parecer bug.
 *
 * Fonte única de verdade — usada tanto pelo Relatório Executivo do
 * Cofre ("Saldo por semana") quanto pelo Relatório de Contas Pagas
 * ("Pagamentos por Semana"). As duas seções tinham implementações
 * duplicadas e divergentes (Contas Pagas usava blocos fixos de 7 dias);
 * qualquer correção futura na regra de semana só precisa acontecer
 * aqui.
 *
 * `dateFrom`/`dateTo` já chegam como rótulos de dia corretos no fuso
 * da organização — `computePeriodRange` (`period-selector.tsx`)
 * converteu o instante real (`new Date()`) uma única vez lá; a partir
 * daqui é só aritmética de calendário sobre esse rótulo, igual ao
 * preset "WEEK" do próprio `period-selector.tsx` (mesma técnica de
 * alinhar ao domingo via `getUTCDay()`). NUNCA criar um `new Date()`
 * aqui e ler getters UTC dele pra achar "hoje" — essa classe de bug de
 * fuso (já eliminada do projeto, ver `business-day.ts`) não pode
 * voltar.
 *
 * Fora de escopo aqui (ver follow-up separado): esta função não
 * converte os valores de `paidAt`/`createdAt` comparados contra os
 * buckets pra `America/Sao_Paulo` — os limites do bucket são rótulos
 * de dia já corretos, mas o instante real comparado contra eles ainda
 * pode cair no dia/semana errado perto da meia-noite (janela de risco:
 * 21h–23h59 em SP = 00h–02h59 UTC do dia seguinte).
 */
export function buildCalendarWeekBuckets(
  dateFrom: Date,
  dateTo: Date,
): CalendarWeekBucket[] {
  const buckets: CalendarWeekBucket[] = [];

  const firstSunday = new Date(dateFrom);
  firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());

  let weekStart = firstSunday;
  while (weekStart.getTime() <= dateTo.getTime()) {
    const weekEnd = new Date(weekStart.getTime() + 6 * ONE_DAY_MS);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const clippedStart =
      weekStart.getTime() < dateFrom.getTime() ? dateFrom : weekStart;
    const clippedEnd = weekEnd.getTime() > dateTo.getTime() ? dateTo : weekEnd;
    const isPartial =
      clippedStart.getTime() !== weekStart.getTime() ||
      clippedEnd.getTime() !== weekEnd.getTime();

    buckets.push({
      start: clippedStart,
      end: clippedEnd,
      label: `${formatShortDayMonth(clippedStart)} a ${formatShortDayMonth(clippedEnd)}${isPartial ? " (parcial)" : ""}`,
    });

    weekStart = new Date(weekStart.getTime() + 7 * ONE_DAY_MS);
  }

  return buckets;
}
