import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { CreateAccountsPayableInput } from "./dtos/create-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

export async function createAccountsPayableUseCase(
  input: CreateAccountsPayableInput,
  createdByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayable> {
  const payable = await deps.accountsPayableRepository.create({
    organizationId,
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount.toFixed(2),
    dueDate: input.dueDate,
    barcode: input.barcode,
    digitableLine: input.digitableLine,
    pixKey: input.pixKey,
    qrCodeUrl: input.qrCodeUrl,
    boletoPdfUrl: input.boletoPdfUrl,
    recurringBillId: input.recurringBillId,
    createdByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: createdByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "CREATE",
      after: {
        description: payable.description,
        amount: input.amount.toFixed(2),
      },
    },
  });

  logger.info("Conta a pagar criada", {
    organizationId,
    accountsPayableId: payable.id,
  });

  return payable;
}
