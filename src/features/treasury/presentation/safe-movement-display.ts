import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

const DEFAULT_DESCRIPTION: Record<SafeMovementResponseDTO["type"], string> = {
  FUNDING: "Abertura de Caixa",
  SANGRIA: "Recebimento do Caixa",
  CASH_REGISTER_HANDOFF: "Recolhimento do Caixa",
  MANUAL_ADJUSTMENT: "Ajuste do Cofre",
  ACCOUNTS_PAYABLE_PAYMENT: "Pagamento de Conta a Pagar",
};

/**
 * `amount` no banco é sempre positivo, exceto em `MANUAL_ADJUSTMENT`
 * (carrega seu próprio sinal) — aqui convertemos pro sinal real de
 * efeito no saldo do Cofre, só para exibição (Coding Standards 18.1: o
 * dado persistido não muda, isso é só uma projeção visual). A UI da
 * Tesouraria não expõe os tipos internos (Sangria/Aporte/Recolhimento/
 * Ajuste) — só "Entrada" (dinheiro entrou no Cofre) ou "Saída"
 * (dinheiro saiu do Cofre), decidido pelo sinal.
 */
export function signedAmount(movement: SafeMovementResponseDTO): number {
  if (
    movement.type === "FUNDING" ||
    movement.type === "ACCOUNTS_PAYABLE_PAYMENT"
  ) {
    return -Number(movement.amount);
  }
  return Number(movement.amount);
}

export function isMovementIn(movement: SafeMovementResponseDTO): boolean {
  return signedAmount(movement) >= 0;
}

/** Descrição amigável — usa o motivo informado ou um texto padrão por tipo, nunca o nome técnico do `type`. */
export function describeMovement(movement: SafeMovementResponseDTO): string {
  return movement.reason?.trim() || DEFAULT_DESCRIPTION[movement.type];
}

/** Origem derivada do `type` — decisão do ADR: sem coluna nova no banco, só mapeamento na apresentação. */
const ORIGIN_LABEL: Record<SafeMovementResponseDTO["type"], string> = {
  FUNDING: "Tesouraria",
  SANGRIA: "Recepção",
  CASH_REGISTER_HANDOFF: "Recepção",
  MANUAL_ADJUSTMENT: "Tesouraria",
  ACCOUNTS_PAYABLE_PAYMENT: "Contas a Pagar",
};

export function originLabel(movement: SafeMovementResponseDTO): string {
  return ORIGIN_LABEL[movement.type];
}

/** Rótulo curto por tipo — usado na coluna "Categoria" quando não há `categoryName` vindo de uma Conta a Pagar vinculada. */
const CATEGORY_FALLBACK: Record<SafeMovementResponseDTO["type"], string> = {
  FUNDING: "Abertura",
  SANGRIA: "Recebimento",
  CASH_REGISTER_HANDOFF: "Recebimento",
  MANUAL_ADJUSTMENT: "Ajuste de Saldo",
  ACCOUNTS_PAYABLE_PAYMENT: "Pagamento",
};

export function categoryLabel(movement: SafeMovementResponseDTO): string {
  if (movement.categoryName) return movement.categoryName;
  if (movement.type === "MANUAL_ADJUSTMENT" && Number(movement.amount) < 0) {
    return "Despesas";
  }
  return CATEGORY_FALLBACK[movement.type];
}

export type MovementDirection = "IN" | "OUT" | "ADJUSTMENT";

/** "Ajuste" é uma categoria visual própria (azul) só pro `MANUAL_ADJUSTMENT` positivo — os demais seguem Entrada/Saída pelo sinal. */
export function movementDirection(
  movement: SafeMovementResponseDTO,
): MovementDirection {
  if (movement.type === "MANUAL_ADJUSTMENT" && Number(movement.amount) > 0) {
    return "ADJUSTMENT";
  }
  return isMovementIn(movement) ? "IN" : "OUT";
}

const STATUS_LABEL: Record<SafeMovementResponseDTO["status"], string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
};

export function statusLabel(status: SafeMovementResponseDTO["status"]): string {
  return STATUS_LABEL[status];
}
