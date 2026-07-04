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

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;

  constructor(action: string) {
    super(`Você não tem permissão para: ${action}`, { action });
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly httpStatus = 409;
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

export class CashRegisterReopenReasonRequiredError extends DomainError {
  readonly code = "REOPEN_REASON_REQUIRED";
  readonly httpStatus = 400;

  constructor() {
    super("É obrigatório informar o motivo da reabertura do caixa.");
  }
}

export class PayableAlreadyProcessedError extends DomainError {
  readonly code = "PAYABLE_ALREADY_PROCESSED";
  readonly httpStatus = 409;

  constructor(accountsPayableId: string) {
    super("Esta conta já foi paga ou cancelada.", { accountsPayableId });
  }
}

// ---------------------------------------------------------------
// Motor de Tesouraria (docs/decisions/adr-tesouraria.md)
// ---------------------------------------------------------------

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

export class CashRegisterNotPendingConferenceError extends DomainError {
  readonly code = "CASH_REGISTER_NOT_PENDING_CONFERENCE";
  readonly httpStatus = 409;

  constructor(organizationId: string) {
    super("Não há caixa aguardando conferência.", { organizationId });
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

export class UnauthenticatedError extends DomainError {
  readonly code = "UNAUTHENTICATED";
  readonly httpStatus = 401;

  constructor() {
    super("É necessário estar autenticado para realizar esta ação.");
  }
}
