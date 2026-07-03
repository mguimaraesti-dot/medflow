import { Prisma } from "@prisma/client";

/**
 * Converte um Decimal do Prisma para string decimal fixa (2 casas) — o
 * único formato de valor monetário autorizado a cruzar a fronteira da
 * API (Coding Standards, item 13.1). O frontend NUNCA recebe um objeto
 * Decimal do Prisma diretamente.
 *
 * Uso: sempre ao montar um DTO de saída (nunca dentro de um componente
 * React, nunca dentro de um use case que ainda vai processar o valor).
 */
export function toMoneyString(
  value: Prisma.Decimal | number | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value.toFixed(2);
  return value.toFixed(2);
}
