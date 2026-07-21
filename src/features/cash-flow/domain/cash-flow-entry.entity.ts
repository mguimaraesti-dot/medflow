import { Prisma } from "@prisma/client";

export type CashFlowEntryType = "IN" | "OUT";

/**
 * Entidade de domínio de um lançamento de caixa. Imutável por natureza
 * (Coding Standards, item 13.2) — não existe operação de update/delete
 * no repositório, só create e leitura.
 */
export interface CashFlowEntry {
  id: string;
  organizationId: string;
  cashRegisterDayId: string;

  type: CashFlowEntryType;
  amount: Prisma.Decimal;
  description: string | null;
  occurredAt: Date;

  categoryId: string;
  paymentMethodId: string;
  /** Denormalizado só pra exibição (Timeline do Dashboard) — via join na infraestrutura. Só populado por `list()`; `undefined` nos demais métodos (não precisam disso hoje). */
  paymentMethodName?: string;
  /** Idem — junto com o nome, pra decidir badge Dinheiro/PIX sem outra consulta. */
  paymentMethodIsCash?: boolean;
  accountsPayableId: string | null;

  /** Nome do paciente pagando — obrigatório no formulário quando `type === "IN"`. */
  patientName: string | null;
  /** Justificativa da retirada — obrigatória no formulário quando `type === "OUT"`. */
  withdrawalReason: string | null;

  createdByUserId: string;
  /** Denormalizado só pra exibição (coluna "Usuário" da tabela) — via join na infraestrutura. */
  createdByUserName: string;
  createdAt: Date;

  isReversed: boolean;
  reversalOfEntryId: string | null;
}
