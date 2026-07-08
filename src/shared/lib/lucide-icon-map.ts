import {
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** PaymentMethod não tem campo `icon` no schema — mapeamento fixo pelo nome já seedado. */
const PAYMENT_METHOD_ICONS: Record<string, LucideIcon> = {
  PIX: Zap,
  Dinheiro: Banknote,
  "Cartão de Débito": CreditCard,
  "Cartão de Crédito": CreditCard,
  Boleto: Receipt,
  Transferência: Landmark,
};

export function getPaymentMethodIcon(name: string): LucideIcon {
  return PAYMENT_METHOD_ICONS[name] ?? Wallet;
}
