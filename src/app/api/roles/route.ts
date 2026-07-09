import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { generateRequestId } from "@/core/utils/request-id";
import { prisma } from "@/core/database/prisma.client";

/**
 * Lista simples de perfis (id/nome) para o seletor da tela de Gestão
 * de Acessos — cinco linhas estáticas, sem necessidade de use case ou
 * camada de domínio própria (mesmo espírito das "mini-features" de
 * leitura já existentes, ex: categories/payment-methods).
 */
export async function GET() {
  const requestId = generateRequestId();

  try {
    await requirePermission(PERMISSIONS.USERS_MANAGE);

    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/roles" });
  }
}
