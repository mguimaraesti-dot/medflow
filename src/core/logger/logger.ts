/**
 * Logger estruturado central do MedFlow (Coding Standards, item 7).
 *
 * Regras:
 * - Nenhum `console.log` solto em código de produção — sempre `logger.*`.
 * - Formato: { level, message, context, timestamp }.
 * - Nunca logar senha, token ou dado sensível, mesmo em `debug`
 *   (Coding Standards, item 16).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  entity?: string;
  entityId?: string;
  route?: string;
  useCase?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = ["password", "token", "secret", "authorization"];

function sanitize(context?: LogContext): LogContext | undefined {
  if (!context) return context;

  const clean: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    const isSensitive = SENSITIVE_KEYS.some((k) =>
      key.toLowerCase().includes(k),
    );
    clean[key] = isSensitive ? "[REDACTED]" : value;
  }
  return clean;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    context: sanitize(context),
    timestamp: new Date().toISOString(),
  };

  // Em produção isso alimenta o agregador de logs da hospedagem (Vercel);
  // em desenvolvimento, aparece formatado no terminal.
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    write("debug", message, context),
  info: (message: string, context?: LogContext) =>
    write("info", message, context),
  warn: (message: string, context?: LogContext) =>
    write("warn", message, context),
  error: (message: string, context?: LogContext) =>
    write("error", message, context),
};
