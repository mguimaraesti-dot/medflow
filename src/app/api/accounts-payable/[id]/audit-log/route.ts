import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError, NotFoundError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { AuditLogRepository } from "@/core/audit/audit-log.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const auditLogRepository = new AuditLogRepository();

/** Timeline real de eventos da conta (aba Histórico/Auditoria do Drawer). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar auditoria sem organização vinculada");
    }
    const { id } = await params;

    const payable = await accountsPayableRepository.findById(id);
    if (!payable || payable.organizationId !== user.organizationId) {
      throw new NotFoundError("Conta a pagar", id);
    }

    const events = await auditLogRepository.findByEntity("AccountsPayable", id);

    return NextResponse.json({ data: events });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/audit-log",
    });
  }
}
