"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { buildWhatsAppMessage } from "./accounts-payable-helpers";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Copia o mesmo texto do lembrete automático (`zapi-whatsapp-messaging.ts`)
 * pra colar manualmente num grupo — complemento pro envio automático via
 * lembrete, não substituto. RBAC: quem já enxerga a conta (chega até este
 * botão) pode copiar, sem permissão extra.
 */
export function CopyToWhatsAppButton({
  payable,
  supplierName,
  variant = "icon",
  className,
}: {
  payable: AccountsPayableResponseDTO;
  supplierName: string;
  /** "icon" — só o ícone (linha da tabela). "full" — ícone + rótulo (Drawer). */
  variant?: "icon" | "full";
  /** Sobrepõe o estilo padrão — usado pelo Drawer mobile pra parecer um item de menu em vez de um botão com borda. */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const message = buildWhatsAppMessage({
      supplierName,
      description: payable.description,
      amount: payable.amount,
      dueDate: payable.dueDate,
    });

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Copiado para o WhatsApp!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-green-600 hover:text-green-700 dark:text-green-500"
        aria-label="Copiar para WhatsApp"
        title={copied ? "Copiado!" : "Copiar para WhatsApp"}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <WhatsAppIcon className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("text-green-700 dark:text-green-500", className)}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <WhatsAppIcon className="h-4 w-4" />
      )}
      {copied ? "Copiado!" : "Copiar para WhatsApp"}
    </Button>
  );
}
