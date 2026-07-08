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
