/**
 * Base de todos os erros de domínio do MedFlow.
 *
 * Regra (Coding Standards): erros de negócio nunca usam
 * `throw new Error("string solta")` — sempre uma subclasse de
 * DomainError, com `code` (identificador estável, usado pelo frontend
 * para decidir como reagir) e `httpStatus` (usado pelo error-handler
 * para montar a resposta HTTP).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ---------------------------------------------------------------
// Genéricos — reutilizáveis por qualquer feature
// ---------------------------------------------------------------

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;

  constructor(entity: string, id: string) {
    super(`${entity} não encontrado(a): ${id}`, { entity, id });
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;

  constructor(action: string) {
    super(`Você não tem permissão para: ${action}`, { action });
  }
}

// ---------------------------------------------------------------
// Específicos do domínio financeiro (Sprint 1)
// ---------------------------------------------------------------

export class CashRegisterClosedError extends DomainError {
  readonly code = "CASH_REGISTER_CLOSED";
  readonly httpStatus = 409;

  constructor(cashRegisterDayId: string) {
    super("Caixa fechado. Solicite reabertura a um administrador.", {
      cashRegisterDayId,
    });
  }
}

export class CashRegisterAlreadyOpenError extends DomainError {
  readonly code = "CASH_REGISTER_ALREADY_OPEN";
  readonly httpStatus = 409;

  constructor(organizationId: string, date: string) {
    super("Já existe um caixa aberto para esta data.", {
      organizationId,
      date,
    });
  }
}

export class CashRegisterNotOpenError extends DomainError {
  readonly code = "CASH_REGISTER_NOT_OPEN";
  readonly httpStatus = 409;

  constructor(organizationId: string) {
    super("Não há caixa aberto para hoje. Abra o caixa antes de continuar.", {
      organizationId,
    });
  }
}

export class DuplicateReversalError extends DomainError {
  readonly code = "DUPLICATE_REVERSAL";
  readonly httpStatus = 409;

  constructor(cashFlowEntryId: string) {
    super("Este lançamento já foi estornado anteriormente.", {
      cashFlowEntryId,
    });
  }
}

export class PayableAlreadyProcessedError extends DomainError {
  readonly code = "PAYABLE_ALREADY_PROCESSED";
  readonly httpStatus = 409;

  constructor(accountsPayableId: string) {
    super("Esta conta já foi paga ou cancelada.", { accountsPayableId });
  }
}

export class PayableCannotBeDeletedError extends DomainError {
  readonly code = "PAYABLE_CANNOT_BE_DELETED";
  readonly httpStatus = 409;

  constructor(accountsPayableId: string, status: "PAID" | "CANCELLED") {
    super(
      status === "PAID"
        ? "Contas pagas não podem ser excluídas para preservar a integridade do histórico financeiro."
        : "Contas canceladas não podem ser excluídas — permanecem apenas para consulta histórica.",
      { accountsPayableId, status },
    );
  }
}

export class PayableAlreadyDeletedError extends DomainError {
  readonly code = "PAYABLE_ALREADY_DELETED";
  readonly httpStatus = 409;

  constructor(accountsPayableId: string) {
    super("Esta conta já foi excluída.", { accountsPayableId });
  }
}

export class PayableNotDeletedError extends DomainError {
  readonly code = "PAYABLE_NOT_DELETED";
  readonly httpStatus = 409;

  constructor(accountsPayableId: string) {
    super("Esta conta não está excluída.", { accountsPayableId });
  }
}

export class RecurringBillAlreadyEndedError extends DomainError {
  readonly code = "RECURRING_BILL_ALREADY_ENDED";
  readonly httpStatus = 409;

  constructor(recurringBillId: string) {
    super("Esta recorrência já foi encerrada.", { recurringBillId });
  }
}

export class SupplierHasLinkedRecordsError extends DomainError {
  readonly code = "SUPPLIER_HAS_LINKED_RECORDS";
  readonly httpStatus = 409;

  constructor(supplierId: string) {
    super(
      "Este beneficiário possui contas vinculadas e não pode ser excluído.",
      { supplierId },
    );
  }
}

export class CategoryHasLinkedRecordsError extends DomainError {
  readonly code = "CATEGORY_HAS_LINKED_RECORDS";
  readonly httpStatus = 409;

  constructor(categoryId: string, linkedRecordsCount: number) {
    super(
      "Esta categoria não pode ser excluída porque existem contas vinculadas.",
      { categoryId, linkedRecordsCount },
    );
  }
}

// ---------------------------------------------------------------
// Motor de Tesouraria (docs/decisions/adr-tesouraria.md)
// ---------------------------------------------------------------

export class SafeMovementNotPendingError extends DomainError {
  readonly code = "SAFE_MOVEMENT_NOT_PENDING";
  readonly httpStatus = 409;

  constructor(safeMovementId: string) {
    super("Esta movimentação já foi confirmada ou cancelada.", {
      safeMovementId,
    });
  }
}

export class InsufficientSafeBalanceError extends DomainError {
  readonly code = "INSUFFICIENT_SAFE_BALANCE";
  readonly httpStatus = 409;

  constructor(
    organizationId: string,
    requestedAmount: string,
    availableBalance: string,
  ) {
    super("O Cofre não tem saldo suficiente para este valor.", {
      organizationId,
      requestedAmount,
      availableBalance,
    });
  }
}

// ---------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------

export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";
  readonly httpStatus = 401;

  constructor() {
    // Mensagem deliberadamente genérica — nunca revela se o e-mail
    // existe ou se foi a senha que errou (US01, critério de aceite).
    super("E-mail ou senha inválidos.");
  }
}

export class UserInactiveError extends DomainError {
  readonly code = "USER_INACTIVE";
  readonly httpStatus = 403;

  constructor() {
    super("Este usuário está inativo. Contate um administrador.");
  }
}

export class UserPendingApprovalError extends DomainError {
  readonly code = "USER_PENDING_APPROVAL";
  readonly httpStatus = 403;

  constructor() {
    super(
      "Seu acesso ainda não foi liberado. Aguarde um Gerente ou Administrador atribuir seu perfil.",
    );
  }
}

export class CannotModifyOwnRoleError extends DomainError {
  readonly code = "CANNOT_MODIFY_OWN_ROLE";
  readonly httpStatus = 403;

  constructor(reason: "role" | "status" = "role") {
    super(
      reason === "role"
        ? "Você não pode alterar o seu próprio perfil de acesso."
        : "Você não pode ativar ou desativar o seu próprio usuário.",
    );
  }
}

export class LastActiveAdminError extends DomainError {
  readonly code = "LAST_ACTIVE_ADMIN";
  readonly httpStatus = 409;

  constructor() {
    super("É necessário manter ao menos um Administrador ativo no sistema.");
  }
}

export class UserEmailAlreadyExistsError extends DomainError {
  readonly code = "USER_EMAIL_ALREADY_EXISTS";
  readonly httpStatus = 409;

  constructor(email: string) {
    super("Este e-mail já está cadastrado.", { email });
  }
}

export class UnauthenticatedError extends DomainError {
  readonly code = "UNAUTHENTICATED";
  readonly httpStatus = 401;

  constructor() {
    super("É necessário estar autenticado para realizar esta ação.");
  }
}

// ---------------------------------------------------------------
// Anexos de Contas a Pagar (Google Drive)
// ---------------------------------------------------------------

export class AttachmentTooLargeError extends DomainError {
  readonly code = "ATTACHMENT_TOO_LARGE";
  readonly httpStatus = 413;

  constructor(maxSizeMb: number) {
    super(`O arquivo excede o limite de ${maxSizeMb}MB por anexo.`, {
      maxSizeMb,
    });
  }
}

export class UnsupportedAttachmentTypeError extends DomainError {
  readonly code = "UNSUPPORTED_ATTACHMENT_TYPE";
  readonly httpStatus = 400;

  constructor(mimeType: string) {
    super(
      `Tipo de arquivo não suportado: ${mimeType}. Envie PDF, JPG ou PNG.`,
      {
        mimeType,
      },
    );
  }
}

export class NoAttachmentFileError extends DomainError {
  readonly code = "NO_ATTACHMENT_FILE";
  readonly httpStatus = 400;

  constructor() {
    super("Nenhum arquivo foi enviado.");
  }
}

/**
 * Falha externa (Drive fora do ar, cota excedida, credencial inválida,
 * timeout) — nunca deixa a causa original vazar pro cliente (pode conter
 * detalhe da API do Google); a causa completa só vai pro log interno
 * (ver upload/delete/download-accounts-payable-attachment.use-case.ts).
 */
export class AttachmentStorageError extends DomainError {
  readonly code = "ATTACHMENT_STORAGE_ERROR";
  readonly httpStatus = 502;

  constructor(action: "enviar" | "baixar" | "excluir") {
    super(
      `Não foi possível ${action} o anexo agora. Tente novamente em instantes.`,
      { action },
    );
  }
}

// ---------------------------------------------------------------
// Lembretes de WhatsApp (Z-API)
// ---------------------------------------------------------------

export class WhatsAppNotConfiguredError extends DomainError {
  readonly code = "WHATSAPP_NOT_CONFIGURED";
  readonly httpStatus = 422;

  constructor(organizationId: string) {
    super(
      "Cadastre o número de WhatsApp da organização em Configurações antes de enviar lembretes.",
      { organizationId },
    );
  }
}

/**
 * Falha externa (Z-API fora do ar, instância desconectada, número
 * inválido) — nunca deixa a causa original vazar pro cliente; a causa
 * completa só vai pro log interno (ver
 * send-accounts-payable-whatsapp-reminder.use-case.ts).
 */
export class WhatsAppSendError extends DomainError {
  readonly code = "WHATSAPP_SEND_ERROR";
  readonly httpStatus = 502;

  constructor(accountsPayableId: string) {
    super("Não foi possível enviar o lembrete por WhatsApp agora.", {
      accountsPayableId,
    });
  }
}

/** Mesma falha externa de `WhatsAppSendError`, mas pro botão "Enviar por WhatsApp" dos relatórios — não há `accountsPayableId` nesse contexto. */
export class ReportWhatsAppSendError extends DomainError {
  readonly code = "REPORT_WHATSAPP_SEND_ERROR";
  readonly httpStatus = 502;

  constructor(reportId: string) {
    super("Não foi possível enviar o relatório por WhatsApp agora.", {
      reportId,
    });
  }
}
