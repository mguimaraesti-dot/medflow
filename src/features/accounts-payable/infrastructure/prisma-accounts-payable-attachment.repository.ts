import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import type {
  AccountsPayableAttachmentRepository,
  CreateAccountsPayableAttachmentInput,
} from "../domain/accounts-payable-attachment.repository";
import type { AccountsPayableAttachment } from "../domain/accounts-payable-attachment.entity";

const CREATED_BY_INCLUDE = {
  createdBy: { select: { name: true } },
} as const;

type RowWithCreatedBy = Prisma.AccountsPayableAttachmentGetPayload<{
  include: typeof CREATED_BY_INCLUDE;
}>;

function toDomain(row: RowWithCreatedBy): AccountsPayableAttachment {
  const { createdBy, ...attachment } = row;
  return { ...attachment, createdByUserName: createdBy.name };
}

export class PrismaAccountsPayableAttachmentRepository implements AccountsPayableAttachmentRepository {
  async create(
    data: CreateAccountsPayableAttachmentInput,
  ): Promise<AccountsPayableAttachment> {
    const row = await prisma.accountsPayableAttachment.create({
      data,
      include: CREATED_BY_INCLUDE,
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<AccountsPayableAttachment | null> {
    const row = await prisma.accountsPayableAttachment.findUnique({
      where: { id },
      include: CREATED_BY_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async listByAccountsPayableId(
    accountsPayableId: string,
  ): Promise<AccountsPayableAttachment[]> {
    const rows = await prisma.accountsPayableAttachment.findMany({
      where: { accountsPayableId },
      include: CREATED_BY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await prisma.accountsPayableAttachment.delete({ where: { id } });
  }
}
