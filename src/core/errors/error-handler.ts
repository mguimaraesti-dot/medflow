import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./domain-error";
import { logger, type LogContext } from "../logger/logger";

export interface ErrorHandlerContext {
  requestId: string;
  route: string;
  useCase?: string;
  userId?: string;
  organizationId?: string;
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Ponto único de tratamento de erro para toda API Route.
 *
 * Uso esperado em cada `route.ts`:
 * ```ts
 * try {
 *   // ...
 * } catch (error) {
 *   return handleApiError(error, { requestId, route: "/api/cash-flow" });
 * }
 * ```
 *
 * Nunca expõe stack trace ou mensagem crua do Prisma ao cliente
 * (Coding Standards, item 6) — isso só vai para o log interno.
 */
export function handleApiError(
  error: unknown,
  context: ErrorHandlerContext,
): NextResponse<ApiErrorBody> {
  const logContext: LogContext = {
    requestId: context.requestId,
    route: context.route,
    useCase: context.useCase,
    userId: context.userId,
    organizationId: context.organizationId,
  };

  if (error instanceof DomainError) {
    logger.warn(`DomainError: ${error.code}`, {
      ...logContext,
      errorCode: error.code,
      meta: error.meta,
    });

    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.httpStatus },
    );
  }

  if (error instanceof ZodError) {
    logger.warn("ValidationError (Zod)", {
      ...logContext,
      issues: error.issues,
    });

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  // Erro não previsto (bug, falha de infraestrutura, etc.) — logamos
  // tudo internamente, mas devolvemos uma mensagem genérica ao cliente.
  logger.error("Erro não tratado", {
    ...logContext,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Ocorreu um erro interno. Tente novamente.",
      },
    },
    { status: 500 },
  );
}
