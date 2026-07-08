"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

/** Botão pequeno de copiar-pra-área-de-transferência — ícone vira check por 1.5s + toast de confirmação (padrão reaproveitado em qualquer valor textual copiável: código de barras, chave PIX, etc). */
export function CopyButton({
  value,
  label,
  successMessage,
}: {
  value: string;
  /** Texto acessível do botão (ex: "Copiar código de barras"). */
  label: string;
  /** Mensagem do toast de sucesso (ex: "Código copiado"). */
  successMessage: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`✓ ${successMessage}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0"
      aria-label={label}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
