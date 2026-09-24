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

/**
 * Deslocamento real (ms) do timezone em relação a UTC no instante
 * `date` — positivo quando o timezone está à FRENTE de UTC, negativo
 * quando está atrás (ex.: America/Sao_Paulo é -03:00 desde o fim do
 * horário de verão em 2019). Calculado de verdade via `Intl`, nunca
 * hardcoded, pra continuar correto se a regra do fuso mudar.
 */
function timezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Instante UTC REAL da meia-noite local (`timezone`) do dia calendário
 * que contém `date` — ao contrário de `startOfDayInTz`, que devolve só
 * um RÓTULO (meia-noite UTC representando o dia local, sem instante
 * real associado; correto só pra comparar com campos de data pura,
 * como `dueDate`/`CashRegisterDay.date`).
 *
 * Usar o rótulo como limite de um intervalo contra uma coluna
 * `DateTime` de verdade (`createdAt`, `occurredAt`) é o bug que motivou
 * esta função: em Brasília (UTC-3), tudo que acontece entre 21h e
 * meia-noite local já caiu no dia UTC seguinte — o rótulo (baseado só
 * na data, sem esse deslocamento) exclui esses registros por engano.
 * Confirmado em produção: sangria/handoff criados às 21h47/21h51
 * (hora local) desapareciam do filtro "Hoje" da Tesouraria porque o
 * `to` do intervalo (rótulo) ficava 3h adiantado do instante real de
 * meia-noite.
 */
/**
 * Converte um RÓTULO já calculado (meia-noite UTC representando um dia
 * calendário local — valor de `startOfDayInTz`, ou aritmética pura de
 * calendário sobre um, ex.: "ontem" = rótulo de hoje menos 1 dia UTC)
 * pro instante UTC REAL que ele representa. Nunca "re-derivar" um
 * rótulo passando-o de novo por `startOfDayInTz`/`getBusinessDay` —
 * isso trata o rótulo como se fosse um instante real e o reconverte
 * pelo fuso, deslocando a data pra trás (armadilha em que a primeira
 * versão de `endOfDayInstant` caiu: chegou a devolver um valor
 * ANTERIOR ao início do mesmo dia). `label` já é a fonte da verdade —
 * só extrai Y/M/D dele.
 */
export function labelToStartInstant(label: Date, timezone: string): Date {
  const guess = new Date(
    Date.UTC(
      label.getUTCFullYear(),
      label.getUTCMonth(),
      label.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const offset = timezoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offset);
}

/** Instante UTC REAL do fim do dia calendário representado pelo RÓTULO `label` — ver `labelToStartInstant`. O dia seguinte é aritmética pura sobre o rótulo (`setUTCDate`), nunca reconvertido. */
export function labelToEndInstant(label: Date, timezone: string): Date {
  const nextDayLabel = new Date(label);
  nextDayLabel.setUTCDate(nextDayLabel.getUTCDate() + 1);
  const nextDayStart = labelToStartInstant(nextDayLabel, timezone);
  return new Date(nextDayStart.getTime() - 1);
}

export function startOfDayInstant(date: Date, timezone: string): Date {
  return labelToStartInstant(startOfDayInTz(date, timezone), timezone);
}

/** Instante UTC REAL do fim do dia calendário local (`timezone`) que contém `date` — ver `startOfDayInstant`/`labelToEndInstant`. */
export function endOfDayInstant(date: Date, timezone: string): Date {
  return labelToEndInstant(startOfDayInTz(date, timezone), timezone);
}
