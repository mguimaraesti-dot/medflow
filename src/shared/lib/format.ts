/**
 * Formatação para exibição na UI — distinto de `money.ts`
 * (`toMoneyString`), que serializa valores monetários na fronteira da
 * API. Aqui a entrada já é a string decimal fixa vinda do backend.
 */
export function formatCurrencyBRL(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

/** Datas do backend chegam em ISO 8601 (UTC); exibição sempre dd/MM/yyyy HH:mm. */
export function formatDateTimeBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Só o horário (HH:mm) — usado na Timeline do dia, onde a data já é implícita. */
export function formatTimeBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Datas *sem hora* (ex: `dueDate`, `@db.Date` no schema) chegam como
 * meia-noite UTC — formatar no timezone local do navegador desloca o
 * dia pra trás em fusos atrás de UTC (ex: America/Sao_Paulo). Força
 * `timeZone: "UTC"` pra mostrar sempre o dia exato armazenado.
 */
export function formatDateOnlyBR(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

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

  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const diffDays = Math.round((dateUTC - todayUTC) / 86_400_000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Há ${days} dia${days > 1 ? "s" : ""}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
