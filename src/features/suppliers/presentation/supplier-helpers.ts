import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

/**
 * "CNPJ · ...", "CPF · ...", ou "Sem documento" — o rótulo vem do campo
 * real `personType`, não é inferido pelo tamanho do documento (11 vs 14
 * dígitos), já que o cadastro sempre pede o tipo explicitamente.
 */
export function formatSupplierDocumentLabel(
  supplier: Pick<SupplierResponseDTO, "personType" | "document">,
): string {
  if (!supplier.document) return "Sem documento";
  const label = supplier.personType === "PESSOA_JURIDICA" ? "CNPJ" : "CPF";
  return `${label} · ${supplier.document}`;
}
