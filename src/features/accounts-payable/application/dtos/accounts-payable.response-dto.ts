import { toMoneyString } from "@/shared/lib/money";
import type {
  AccountsPayable,
  PayableStatus,
  PaymentConfirmationSource,
  PaymentOrigin,
} from "../../domain/accounts-payable.entity";

export interface AccountsPayableResponseDTO {
  id: string;
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string;
  dueDate: Date;
  barcode: string | null;
  digitableLine: string | null;
  pixKey: string | null;
  qrCodeUrl: string | null;
  boletoPdfUrl: string | null;
  status: PayableStatus;
  /** Igual a `status`, exceto quando PENDING e já vencida — nunca persistido, só calculado aqui. */
  displayStatus: PayableStatus;
  paymentOrigin: PaymentOrigin;
  recurringBillId: string | null;
  occurrenceNumber: number | null;
  createdByUserId: string;
  createdByUserName: string;
  paidByUserId: string | null;
  paidByUserName: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;
  /** Nº da movimentação do Cofre gerada ao pagar via COFRE — `null` sempre que `paymentOrigin` for BANCO ou a conta ainda não foi paga. */
  paidSafeMovementId: string | null;
  deletedAt: Date | null;
  deletedByUserName: string | null;
  deletionReason: string | null;
  createdAt: Date;
}

export function toAccountsPayableResponseDTO(
  payable: AccountsPayable,
  referenceDate: Date = new Date(),
): AccountsPayableResponseDTO {
  // Compara só a data (UTC), nunca o horário — senão uma conta com
  // vencimento hoje vira "Vencida" assim que passa da meia-noite UTC
  // (bem antes do fim do dia no horário de Brasília). "Vencida" só a
  // partir do dia seguinte ao vencimento.
  const referenceDay = new Date(referenceDate);
  referenceDay.setUTCHours(0, 0, 0, 0);
  const displayStatus: PayableStatus =
    payable.status === "PENDING" && payable.dueDate < referenceDay
      ? "OVERDUE"
      : payable.status;

  return {
    id: payable.id,
    organizationId: payable.organizationId,
    supplierId: payable.supplierId,
    categoryId: payable.categoryId,
    description: payable.description,
    amount: toMoneyString(payable.amount) as string,
    dueDate: payable.dueDate,
    barcode: payable.barcode,
    digitableLine: payable.digitableLine,
    pixKey: payable.pixKey,
    qrCodeUrl: payable.qrCodeUrl,
    boletoPdfUrl: payable.boletoPdfUrl,
    status: payable.status,
    displayStatus,
    paymentOrigin: payable.paymentOrigin,
    recurringBillId: payable.recurringBillId,
    occurrenceNumber: payable.occurrenceNumber,
    createdByUserId: payable.createdByUserId,
    createdByUserName: payable.createdByUserName,
    paidByUserId: payable.paidByUserId,
    paidByUserName: payable.paidByUserName,
    paidAt: payable.paidAt,
    paidVia: payable.paidVia,
    paidSafeMovementId: payable.paidSafeMovementId,
    deletedAt: payable.deletedAt,
    deletedByUserName: payable.deletedByUserName,
    deletionReason: payable.deletionReason,
    createdAt: payable.createdAt,
  };
}
