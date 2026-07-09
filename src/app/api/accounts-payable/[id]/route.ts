import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import { updateAccountsPayableSchema } from "@/features/accounts-payable/application/dtos/update-accounts-payable.dto";
import { deleteAccountsPayableSchema } from "@/features/accounts-payable/application/dtos/delete-accounts-payable.dto";
import { updateAccountsPayableUseCase } from "@/features/accounts-payable/application/update-accounts-payable.use-case";
import { softDeleteAccountsPayableUseCase } from "@/features/accounts-payable/application/soft-delete-accounts-payable.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();

/**
 * Edição escopada (fornecedor/categoria/valor/vencimento/observação) —
 * nunca altera status. Só permitida enquanto a conta está PENDENTE.
 * Quando pertence a uma recorrência, `scope: "SERIES"` propaga a mudança
 * às próximas ocorrências ainda pendentes (valor e vencimento continuam
 * os de cada ocorrência, nunca sobrescritos em lote).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("editar conta sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json();
    const input = updateAccountsPayableSchema.parse(body);

    const result = await updateAccountsPayableUseCase(
      id,
      input,
      user.id,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json({ data: toAccountsPayableResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]",
      useCase: "updateAccountsPayableUseCase",
    });
  }
}

/**
 * Exclusão lógica (soft delete) — exclusivo de Administrador
 * (payable:delete). Nunca remove a linha do banco; só marca deletedAt.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_DELETE);
    if (!user.organizationId) {
      throw new ForbiddenError("excluir conta sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const input = deleteAccountsPayableSchema.parse(body);

    const result = await softDeleteAccountsPayableUseCase(
      id,
      input,
      user.id,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json({ data: toAccountsPayableResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]",
      useCase: "softDeleteAccountsPayableUseCase",
    });
  }
}
