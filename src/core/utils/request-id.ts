/**
 * Gera um identificador único por requisição, usado para correlacionar
 * logs de uma mesma chamada de API (Coding Standards, item 13.6).
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
