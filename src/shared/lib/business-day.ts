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
