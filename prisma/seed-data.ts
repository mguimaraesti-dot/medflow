/**
 * Categorias financeiras padrão do MedFlow, conforme
 * docs/architecture/... (seção "Categorias financeiras iniciais") e
 * o refinamento de CTO que adicionou color/icon/displayOrder.
 *
 * Nomes de ícone seguem o catálogo do lucide-react.
 */

export type SeedCategory = {
  name: string;
  type: "IN" | "OUT";
  color: string;
  icon: string;
  displayOrder: number;
};

export const INCOME_CATEGORIES: SeedCategory[] = [
  {
    name: "Consulta Particular",
    type: "IN",
    color: "#16A34A",
    icon: "stethoscope",
    displayOrder: 1,
  },
  {
    name: "Convênio",
    type: "IN",
    color: "#0EA5E9",
    icon: "shield-check",
    displayOrder: 2,
  },
  { name: "PIX", type: "IN", color: "#22C55E", icon: "zap", displayOrder: 3 },
  {
    name: "Cartão",
    type: "IN",
    color: "#6366F1",
    icon: "credit-card",
    displayOrder: 4,
  },
  {
    name: "Outros",
    type: "IN",
    color: "#64748B",
    icon: "circle-plus",
    displayOrder: 5,
  },
];

export const EXPENSE_CATEGORIES: SeedCategory[] = [
  {
    name: "Aluguel",
    type: "OUT",
    color: "#DC2626",
    icon: "home",
    displayOrder: 1,
  },
  {
    name: "Energia",
    type: "OUT",
    color: "#F59E0B",
    icon: "zap",
    displayOrder: 2,
  },
  {
    name: "Internet",
    type: "OUT",
    color: "#7C3AED",
    icon: "wifi",
    displayOrder: 3,
  },
  {
    name: "Material Médico",
    type: "OUT",
    color: "#EF4444",
    icon: "syringe",
    displayOrder: 4,
  },
  {
    name: "Salários",
    type: "OUT",
    color: "#B91C1C",
    icon: "users",
    displayOrder: 5,
  },
  {
    name: "Impostos",
    type: "OUT",
    color: "#991B1B",
    icon: "landmark",
    displayOrder: 6,
  },
  {
    name: "Software",
    type: "OUT",
    color: "#0891B2",
    icon: "laptop",
    displayOrder: 7,
  },
  {
    name: "Marketing",
    type: "OUT",
    color: "#DB2777",
    icon: "megaphone",
    displayOrder: 8,
  },
  {
    name: "Outros",
    type: "OUT",
    color: "#64748B",
    icon: "circle-minus",
    displayOrder: 9,
  },
];

export const PAYMENT_METHODS: { name: string; displayOrder: number }[] = [
  { name: "Dinheiro", displayOrder: 1 },
  { name: "PIX", displayOrder: 2 },
  { name: "Cartão de Débito", displayOrder: 3 },
  { name: "Cartão de Crédito", displayOrder: 4 },
  { name: "Boleto", displayOrder: 5 },
  { name: "Transferência", displayOrder: 6 },
];
