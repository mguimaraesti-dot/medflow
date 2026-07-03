import { z } from "zod";

/**
 * Primitivos de validação reutilizáveis pelos DTOs de todas as features.
 * Centralizar aqui evita repetir a mesma regra (ex: "valor monetário
 * válido") em vários lugares com pequenas divergências.
 */

/** ID gerado pelo Prisma (`@default(cuid())`). */
export const cuidSchema = z.string().min(1, "ID inválido");

/**
 * Valor monetário de entrada (formulário/API). Vem como number porque é
 * assim que chega de um input numérico no frontend. Nunca positivo por
 * padrão — quem precisar aceitar zero declara explicitamente no schema
 * do DTO específico.
 */
export const moneyAmountSchema = z
  .number()
  .positive("O valor deve ser maior que zero")
  .multipleOf(0.01, "Use no máximo 2 casas decimais");

/** Data sem horário (ex: dia do caixa, vencimento de conta). */
export const dateOnlySchema = z.coerce.date();

/** Texto livre curto, tipicamente descrição de lançamento/conta. */
export const shortTextSchema = (maxLength = 500) =>
  z.string().trim().max(maxLength).optional();
