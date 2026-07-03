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
