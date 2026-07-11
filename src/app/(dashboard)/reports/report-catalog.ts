import {
  ArrowLeftRight,
  Landmark,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ReportId =
  | "cash-flow"
  | "revenue-vs-expense"
  | "availability"
  | "cash-closing"
  | "cash-differences"
  | "cash-movements"
  | "safe-receipts"
  | "safe-adjustments"
  | "safe-withdrawals"
  | "safe-balance"
  | "payable-paid"
  | "payable-upcoming"
  | "payable-overdue"
  | "payable-by-category"
  | "safe-period-summary"
  | "cash-register-summary"
  | "payable-consolidated";

export interface ReportCatalogItem {
  id: ReportId;
  label: string;
  /**
   * `false` = oculto da Central de Relatórios (Reformulação v2), mas
   * o componente/rota continua existindo — pode reaparecer, adaptado,
   * dentro dos 3 relatórios novos. Omitido = visível (`true`).
   */
  active?: boolean;
}

export interface ReportCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: ReportCatalogItem[];
}

/**
 * Catálogo estático da Central de Relatórios. Cada `id` é resolvido pra
 * um componente de tabela em `reports-screen.tsx` (alguns componentes
 * cobrem mais de um `id`, ex: Fluxo Financeiro e Movimentações do
 * Caixa usam o mesmo).
 *
 * Reformulação v2: os 14 relatórios genéricos originais foram ocultos
 * (`active: false`) em favor de 3 relatórios prioritários e mais
 * específicos ao dia a dia da clínica — o código/rotas de todos os 14
 * continua intacto, só não aparece na navegação. `reports-screen.tsx`
 * filtra por `active` antes de renderizar o catálogo.
 */
export const REPORT_CATALOG: ReportCategory[] = [
  {
    id: "financial",
    label: "Financeiro",
    icon: Wallet,
    items: [
      { id: "cash-flow", label: "Fluxo Financeiro", active: false },
      {
        id: "revenue-vs-expense",
        label: "Receitas x Despesas",
        active: false,
      },
      {
        id: "availability",
        label: "Disponibilidade Financeira",
        active: false,
      },
    ],
  },
  {
    id: "cash",
    label: "Caixa Recepção",
    icon: ArrowLeftRight,
    items: [
      { id: "cash-closing", label: "Fechamento Diário", active: false },
      { id: "cash-differences", label: "Diferenças de Caixa", active: false },
      {
        id: "cash-movements",
        label: "Movimentações do Caixa",
        active: false,
      },
      { id: "cash-register-summary", label: "Caixa Recepção" },
    ],
  },
  {
    id: "treasury",
    label: "Tesouraria",
    icon: Landmark,
    items: [
      { id: "safe-receipts", label: "Recebimentos", active: false },
      { id: "safe-adjustments", label: "Ajustes", active: false },
      { id: "safe-withdrawals", label: "Retiradas", active: false },
      { id: "safe-balance", label: "Saldo do Cofre", active: false },
      { id: "safe-period-summary", label: "Cofre" },
    ],
  },
  {
    id: "payable",
    label: "Contas a Pagar",
    icon: Receipt,
    items: [
      { id: "payable-paid", label: "Contas Pagas", active: false },
      { id: "payable-upcoming", label: "Contas a Vencer", active: false },
      { id: "payable-overdue", label: "Contas Vencidas", active: false },
      {
        id: "payable-by-category",
        label: "Despesas por Categoria",
        active: false,
      },
      { id: "payable-consolidated", label: "Contas a Pagar" },
    ],
  },
];

export function findReportLabel(reportId: ReportId): string {
  for (const category of REPORT_CATALOG) {
    const item = category.items.find((entry) => entry.id === reportId);
    if (item) return item.label;
  }
  return "";
}
