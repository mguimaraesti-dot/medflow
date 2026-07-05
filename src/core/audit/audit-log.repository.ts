import { prisma } from "@/core/database/prisma.client";
import type { AuditAction, Prisma } from "@prisma/client";

/**
 * Evento de auditoria já resolvido com o nome do usuário — usado pra montar
 * timelines reais (ex: aba Histórico de Contas a Pagar). `AuditLog` é
 * gravado por várias features (ver core/errors, use-cases de
 * accounts-payable), mas a leitura é centralizada aqui por ser transversal.
 */
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  entity: string;
  entityId: string;
  action: AuditAction;
  reason: string | null;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  createdAt: Date;
}

export class AuditLogRepository {
  /** Todos os eventos de uma entidade, do mais antigo pro mais recente — nunca filtra nem apaga nada (ver invariante "Nunca perder histórico"). */
  async findByEntity(
    entity: string,
    entityId: string,
  ): Promise<AuditLogEntry[]> {
    const rows = await prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user?.name ?? null,
      entity: row.entity,
      entityId: row.entityId,
      action: row.action,
      reason: row.reason,
      before: row.before,
      after: row.after,
      createdAt: row.createdAt,
    }));
  }
}
