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
  | "payable-by-category";

export interface ReportCatalogItem {
  id: ReportId;
  label: string;
}

export interface ReportCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: ReportCatalogItem[];
}

/**
 * Catálogo estático da Central de Relatórios — 4 categorias, 13
 * relatórios. Cada `id` é resolvido pra um componente de tabela em
 * `reports-screen.tsx` (alguns componentes cobrem mais de um `id`,
 * ex: Fluxo Financeiro e Movimentações do Caixa usam o mesmo).
 */
export const REPORT_CATALOG: ReportCategory[] = [
  {
    id: "financial",
    label: "Financeiro",
    icon: Wallet,
    items: [
      { id: "cash-flow", label: "Fluxo Financeiro" },
      { id: "revenue-vs-expense", label: "Receitas x Despesas" },
      { id: "availability", label: "Disponibilidade Financeira" },
    ],
  },
  {
    id: "cash",
    label: "Caixa",
    icon: ArrowLeftRight,
    items: [
      { id: "cash-closing", label: "Fechamento Diário" },
      { id: "cash-differences", label: "Diferenças de Caixa" },
      { id: "cash-movements", label: "Movimentações do Caixa" },
    ],
  },
  {
    id: "treasury",
    label: "Tesouraria",
    icon: Landmark,
    items: [
      { id: "safe-receipts", label: "Recebimentos" },
      { id: "safe-adjustments", label: "Ajustes" },
      { id: "safe-withdrawals", label: "Retiradas" },
      { id: "safe-balance", label: "Saldo do Cofre" },
    ],
  },
  {
    id: "payable",
    label: "Contas a Pagar",
    icon: Receipt,
    items: [
      { id: "payable-paid", label: "Contas Pagas" },
      { id: "payable-upcoming", label: "Contas a Vencer" },
      { id: "payable-overdue", label: "Contas Vencidas" },
      { id: "payable-by-category", label: "Despesas por Categoria" },
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
