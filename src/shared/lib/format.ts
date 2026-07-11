/**
 * Formatação para exibição na UI — distinto de `money.ts`
 * (`toMoneyString`), que serializa valores monetários na fronteira da
 * API. Aqui a entrada já é a string decimal fixa vinda do backend.
 *
 * Instâncias de `Intl.NumberFormat`/`Intl.DateTimeFormat` no escopo do
 * módulo (em vez de recriadas a cada chamada) — são stateless e a
 * construção não é gratuita; essas funções rodam por célula em toda
 * tabela do sistema (Contas a Pagar, Tesouraria, Fluxo de Caixa).
 */
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyBRL(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return CURRENCY_FORMATTER.format(numeric);
}

/**
 * Timezone fixo da clínica (mesmo default de `OrganizationSettings.timezone`
 * — MVP opera com uma única clínica, ver CLAUDE.md). Timestamps com hora
 * são sempre exibidos aqui, nunca no timezone implícito do navegador —
 * um dispositivo mal configurado não pode fazer "22:01" virar outro
 * horário pro usuário.
 */
const DISPLAY_TIMEZONE = "America/Sao_Paulo";

const DATE_TIME_BR_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
});

/** Datas do backend chegam em ISO 8601 (UTC); exibição sempre dd/MM/yyyy HH:mm no horário de Brasília. */
export function formatDateTimeBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_TIME_BR_FORMATTER.format(date);
}

const TIME_BR_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
});

/** Só o horário (HH:mm), no horário de Brasília — usado na Timeline do dia, onde a data já é implícita. */
export function formatTimeBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return TIME_BR_FORMATTER.format(date);
}

const DATE_ONLY_UTC_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Datas *sem hora* (ex: `dueDate`, `@db.Date` no schema) chegam como
 * meia-noite UTC — formatar no timezone local do navegador desloca o
 * dia pra trás em fusos atrás de UTC (ex: America/Sao_Paulo). Força
 * `timeZone: "UTC"` pra mostrar sempre o dia exato armazenado.
 */
export function formatDateOnlyBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_ONLY_UTC_FORMATTER.format(date);
}

const DATE_ONLY_LOCAL_BR_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: DISPLAY_TIMEZONE,
});

/** Diferente de `formatDateOnlyBR`: aqui a entrada é um timestamp de verdade (ex: `closedAt`), não uma data "pura" — formata no horário de Brasília, nunca UTC. */
export function formatDateOnlyLocalBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_ONLY_LOCAL_BR_FORMATTER.format(date);
}

const TODAY_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * "Hoje" no calendário de Brasília, representado como Date à meia-noite
 * UTC — mesmo formato de `dueDate` (`@db.Date`), pra poder comparar os
 * dois diretamente. NUNCA usar `new Date(); .setUTCHours(0,0,0,0)` pra
 * isso: aquilo trunca pro dia corrente em UTC, que a partir de ~21h no
 * horário de Brasília já é o dia seguinte (BRT = UTC-3) — uma conta com
 * vencimento hoje passava a contar como vencida horas antes da meia-noite
 * real em Brasília. Aqui o dia é lido primeiro no fuso certo.
 */
export function todayDateOnlyBR(referenceDate: Date = new Date()): Date {
  const parts = TODAY_PARTS_FORMATTER.formatToParts(referenceDate);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

const SMART_DUE_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/**
 * Data "inteligente" para a coluna Vencimento (UX spec Contas a Pagar):
 * "Hoje"/"Amanhã" perto, "Há N dias" no passado, "20 Jul" caso contrário
 * — evita mostrar só a data crua. Mesma correção de timezone de
 * `formatDateOnlyBR` (dueDate é meia-noite UTC).
 */
export function formatSmartDueDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const dateUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  const todayUTC = todayDateOnlyBR().getTime();

  const diffDays = Math.round((dateUTC - todayUTC) / 86_400_000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Há ${days} dia${days > 1 ? "s" : ""}`;
  }

  return SMART_DUE_DATE_FORMATTER.format(date);
}

/** "512 B" / "12,4 KB" / "3,1 MB" — usado pela lista de anexos de Contas a Pagar. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024)
    return `${kb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`;
  const mb = kb / 1024;
  return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
