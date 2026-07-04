import {
  Banknote,
  CircleMinus,
  CirclePlus,
  CreditCard,
  Home,
  Landmark,
  Laptop,
  Megaphone,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Users,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Nomes seguem o catálogo lucide-react usado em prisma/seed-data.ts (campo Category.icon). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "shield-check": ShieldCheck,
  zap: Zap,
  "credit-card": CreditCard,
  "circle-plus": CirclePlus,
  home: Home,
  wifi: Wifi,
  syringe: Syringe,
  users: Users,
  landmark: Landmark,
  laptop: Laptop,
  megaphone: Megaphone,
  "circle-minus": CircleMinus,
};

export function getCategoryIcon(
  iconName: string | null | undefined,
): LucideIcon {
  return (iconName && CATEGORY_ICONS[iconName]) || CirclePlus;
}

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
