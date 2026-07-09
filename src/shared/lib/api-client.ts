export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Wrapper fino de `fetch` para as chamadas do TanStack Query — evita
 * repetir a checagem de `response.ok` e o parse de erro em cada hook.
 * Toda rota da API já devolve `{ data }` no sucesso e
 * `{ error: { code, message } }` na falha (`core/errors/error-handler.ts`).
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  // FormData (upload de arquivo) precisa que o próprio fetch defina o
  // Content-Type (com o boundary do multipart) — forçar
  // "application/json" aqui quebraria o corpo da requisição.
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers
      : { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json();

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiError(
      errorBody.error?.code ?? "UNKNOWN_ERROR",
      errorBody.error?.message ?? "Ocorreu um erro inesperado.",
      errorBody.error?.details,
    );
  }

  return (body as { data: T }).data;
}
