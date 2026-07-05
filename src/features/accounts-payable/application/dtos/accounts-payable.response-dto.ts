import { toMoneyString } from "@/shared/lib/money";
import type {
  AccountsPayable,
  PayableStatus,
  PaymentConfirmationSource,
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
  recurringBillId: string | null;
  createdByUserId: string;
  createdByUserName: string;
  paidByUserId: string | null;
  paidByUserName: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;
  createdAt: Date;
}

export function toAccountsPayableResponseDTO(
  payable: AccountsPayable,
  referenceDate: Date = new Date(),
): AccountsPayableResponseDTO {
  const displayStatus: PayableStatus =
    payable.status === "PENDING" && payable.dueDate < referenceDate
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
    recurringBillId: payable.recurringBillId,
    createdByUserId: payable.createdByUserId,
    createdByUserName: payable.createdByUserName,
    paidByUserId: payable.paidByUserId,
    paidByUserName: payable.paidByUserName,
    paidAt: payable.paidAt,
    paidVia: payable.paidVia,
    createdAt: payable.createdAt,
  };
}
