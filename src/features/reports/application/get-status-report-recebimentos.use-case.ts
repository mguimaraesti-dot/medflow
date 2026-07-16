import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type {
  CashFlowEntryRepository,
  CashFlowEntryReceiptRow,
} from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type {
  StatusReportRecebimentosEntry,
  StatusReportRecebimentosKitRow,
  StatusReportRecebimentosSummary,
} from "../domain/status-report-recebimentos.entity";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  categoryRepository: CategoryRepository;
}

function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}

/**
 * Extrai o número de frascos do NOME da categoria ("Kit 2 - Rio Preto" →
 * 2), em vez de um mapa fixo — tolera variações de escrita ("KIT 2",
 * "Kit2") e passa a contar categorias novas ("Kit 4") automaticamente,
 * sem mudar código. Categorias que não começam com "kit" (Exames,
 * Sibo/Imo, Consulta...) não casam e ficam de fora (retornam `null`).
 *
 * PREMISSA (decidida com o usuário, não um dado do sistema): cada
 * LANÇAMENTO representa exatamente 1 kit vendido — não existe campo de
 * quantidade no lançamento. Se alguém um dia vender 2 kits e lançar um
 * valor dobrado num único lançamento, esta conta subestima os frascos
 * (contaria 1 kit, não 2).
 */
const KIT_NAME_PATTERN = /^kit\s*(\d+)/i;

function extractKitSize(categoryName: string): number | null {
  const match = categoryName.match(KIT_NAME_PATTERN);
  return match ? Number(match[1]) : null;
}

/** Linhas de frascos só para categorias de kit COM movimentação no período — sem pré-semear o catálogo inteiro (diferente do agrupamento do Relatório do Caixa Recepção). */
function buildKitRows(
  rows: CashFlowEntryReceiptRow[],
  categoryLabelById: Map<string, string>,
): StatusReportRecebimentosKitRow[] {
  const totals = new Map<
    string,
    { label: string; kitSize: number; count: number }
  >();

  for (const row of rows) {
    const label = categoryLabelById.get(row.categoryId) ?? "Sem categoria";
    const kitSize = extractKitSize(label);
    if (kitSize === null) continue;

    const current = totals.get(row.categoryId);
    totals.set(row.categoryId, {
      label,
      kitSize,
      count: (current?.count ?? 0) + 1,
    });
  }

  return [...totals.entries()]
    .map(([categoryId, data]) => ({
      categoryId,
      label: data.label,
      kitSize: data.kitSize,
      count: data.count,
      frascos: data.count * data.kitSize,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Relatório de Recebimentos — PDF de múltiplas páginas
 * (`infrastructure/status-report-recebimentos-pdf.ts`, via
 * `jspdf-autotable`). Diferente dos outros dois Status Reports
 * (imagem única, agregados), este é um relatório de CONFERÊNCIA:
 * detalhe lançamento a lançamento das entradas do Caixa Recepção no
 * período, com nome do paciente — sem teto de linhas (o PDF pagina
 * sozinho, ao contrário da imagem única dos outros relatórios).
 *
 * Estornados NÃO entram: `listReceiptsForReport` já filtra
 * `isReversed: false` e `type: "IN"` (o lançamento de estorno em si é
 * sempre `OUT`, nunca aparece aqui de qualquer forma). Os TOTAIS vêm de
 * soma sobre os lançamentos brutos (`rows`), nunca das linhas exibidas —
 * mesma disciplina dos outros relatórios.
 */
export async function getStatusReportRecebimentosUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<StatusReportRecebimentosSummary> {
  const [organization, rows, categories] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    deps.cashFlowEntryRepository.listReceiptsForReport(
      organizationId,
      dateFrom,
      dateTo,
    ),
    deps.categoryRepository.listActive(organizationId, "IN"),
  ]);

  const categoryLabelById = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  const entries: StatusReportRecebimentosEntry[] = rows.map((row) => {
    const categoryLabel =
      categoryLabelById.get(row.categoryId) ?? "Sem categoria";
    return {
      id: row.id,
      occurredAt: row.occurredAt,
      categoryLabel,
      patientName: row.patientName ?? "—",
      frascos: extractKitSize(categoryLabel),
      paymentMethodLabel: row.paymentMethodName,
      paymentMethodIsCash: row.paymentMethodIsCash,
      amount: row.amount.toFixed(2),
    };
  });

  const cashRows = rows.filter((row) => row.paymentMethodIsCash);
  const pixRows = rows.filter((row) => !row.paymentMethodIsCash);
  const cashTotal = sumDecimals(cashRows.map((row) => row.amount));
  const pixTotal = sumDecimals(pixRows.map((row) => row.amount));
  const totalAmount = cashTotal.plus(pixTotal);

  const kitRows = buildKitRows(rows, categoryLabelById);
  const totalFrascos = kitRows.reduce((sum, row) => sum + row.frascos, 0);

  return {
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    totalAmount: totalAmount.toFixed(2),
    totalCount: rows.length,
    cashTotal: cashTotal.toFixed(2),
    cashCount: cashRows.length,
    pixTotal: pixTotal.toFixed(2),
    pixCount: pixRows.length,
    totalFrascos,
    entries,
    kitRows,
  };
}
