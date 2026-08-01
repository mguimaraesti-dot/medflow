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
const FRASCO_AVULSO_LABEL = "Frasco (avulso)";

function extractKitSize(categoryName: string): number | null {
  const match = categoryName.match(KIT_NAME_PATTERN);
  return match ? Number(match[1]) : null;
}

/**
 * Igualdade exata (após trim/lower), nunca `includes` — "Kit 2 - ..." não
 * começa com "kit" seguido só de espaço/fim de string, então já não
 * colide com `KIT_NAME_PATTERN`, mas a igualdade exata aqui garante que
 * só a categoria "Frasco" em si (nunca uma variação futura tipo "Frasco
 * de vidro") entra nessa conta.
 */
function isFrascoAvulso(categoryName: string): boolean {
  return categoryName.trim().toLowerCase() === "frasco";
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
      isAvulso: false,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Lançamentos de categoria exatamente "Frasco" (não kit) — cada um conta
 * 1 frasco, independente de valor/forma de pagamento (não existe campo
 * de quantidade no lançamento; mesma disciplina de "1 lançamento = 1
 * unidade" já usada para kits). `categoryId` é preservado (é uma
 * categoria real, ao contrário do `categoryId: null` sintético usado
 * pro placeholder "Sem movimentação" no Relatório do Caixa Recepção).
 * `null` quando não há nenhum lançamento "Frasco" no período — mesma
 * regra de "sem pré-semear" do `buildKitRows`.
 */
function buildFrascoAvulsoRow(
  rows: CashFlowEntryReceiptRow[],
  categoryLabelById: Map<string, string>,
): StatusReportRecebimentosKitRow | null {
  let categoryId: string | null = null;
  let count = 0;

  for (const row of rows) {
    const label = categoryLabelById.get(row.categoryId) ?? "Sem categoria";
    if (!isFrascoAvulso(label)) continue;
    categoryId = row.categoryId;
    count += 1;
  }

  if (count === 0) return null;

  return {
    categoryId: categoryId!,
    label: FRASCO_AVULSO_LABEL,
    kitSize: 1,
    count,
    frascos: count,
    isAvulso: true,
  };
}

/** Frascos por lançamento individual (coluna "FRASCOS" da tabela de detalhe): kit usa o multiplicador do nome, "Frasco" avulso sempre conta 1, o resto fica "—" (`null`). */
function resolveEntryFrascos(categoryLabel: string): number | null {
  if (isFrascoAvulso(categoryLabel)) return 1;
  return extractKitSize(categoryLabel);
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
      frascos: resolveEntryFrascos(categoryLabel),
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

  // Frascos de kit e "Frasco" avulso são mutuamente exclusivos por nome
  // (regex de kit exige começar com "kit"; avulso exige igualdade exata
  // com "frasco") — somados aqui sem risco de dupla contagem.
  const kitRows = buildKitRows(rows, categoryLabelById);
  const totalKits = kitRows.reduce((sum, row) => sum + row.count, 0);
  const frascosDeKits = kitRows.reduce((sum, row) => sum + row.frascos, 0);

  const frascoAvulsoRow = buildFrascoAvulsoRow(rows, categoryLabelById);
  const frascosAvulsos = frascoAvulsoRow?.count ?? 0;
  const totalFrascos = frascosDeKits + frascosAvulsos;

  // Linha avulsa sempre por último, depois dos kits (já ordenados por
  // nome) — não entra no `.sort()` de cima porque "Frasco (avulso)"
  // ordenaria antes de qualquer "Kit N" alfabeticamente, o que não é a
  // posição desejada.
  const allKitRows = frascoAvulsoRow ? [...kitRows, frascoAvulsoRow] : kitRows;

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
    totalKits,
    frascosAvulsos,
    entries,
    kitRows: allKitRows,
  };
}
