/**
 * "Dia de caixa" — calculado no timezone da organização
 * (`OrganizationSettings.timezone`), nunca em UTC puro. O valor
 * retornado é meia-noite UTC do dia calendário *local*: mesma
 * convenção de "data pura" já usada em outros campos de só-data do
 * sistema (ex: `dueDate`) — não representa um instante UTC real, só
 * marca o dia. Sem isso, um caixa aberto perto da meia-noite UTC (ex:
 * 22h em horário de Brasília, já depois da meia-noite em UTC) cai no
 * dia calendário errado.
 */
export function getBusinessDay(
  timezone: string,
  referenceDate: Date = new Date(),
): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Início do dia calendário *local* (`timezone`) que contém `date`,
 * representado como meia-noite UTC do dia calendário local — mesmo
 * valor de `getBusinessDay`, só com a ordem de parâmetros invertida
 * (`date` primeiro) pra combinar com `endOfDayInTz`. Nunca usar
 * `getUTCFullYear`/`Date.UTC(now.getUTC...)` pra isso — mesmo bug de
 * fuso já corrigido aqui (`getBusinessDay`) e no relatório do Caixa
 * Recepção (`period-selector.tsx`).
 */
export function startOfDayInTz(date: Date, timezone: string): Date {
  return getBusinessDay(timezone, date);
}

/**
 * Fim do dia calendário *local* (`timezone`) que contém `date` —
 * meia-noite local do dia seguinte menos 1ms. Como o valor de
 * `startOfDayInTz` é só um rótulo (meia-noite UTC representando o dia
 * local, sem instante real associado), somar 1 dia e subtrair 1ms é
 * aritmética segura sobre esse rótulo, não sobre um instante de
 * verdade.
 */
export function endOfDayInTz(date: Date, timezone: string): Date {
  const start = startOfDayInTz(date, timezone);
  const nextDayStart = new Date(start);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  return new Date(nextDayStart.getTime() - 1);
}
