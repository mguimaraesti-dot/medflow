export interface ReportExportColumn<T> {
  header: string;
  accessor: (row: T) => string;
}

export interface ReportExportInput<T> {
  title: string;
  columns: ReportExportColumn<T>[];
  rows: T[];
}

function toRowsOfStrings<T>(
  columns: ReportExportColumn<T>[],
  rows: T[],
): string[][] {
  return rows.map((row) => columns.map((column) => column.accessor(row)));
}

function sanitizeFileName(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * As 3 exportações abaixo importam suas bibliotecas dinamicamente
 * (`import()`) dentro da própria função, nunca no topo do arquivo —
 * jspdf/jspdf-autotable/exceljs/html2canvas juntas passam de 400kB e
 * só são necessárias no clique de "Exportar", não no carregamento
 * inicial da Central de Relatórios (mesmo cuidado já usado com
 * recharts no Dashboard/Relatórios).
 */

/** Exporta em PDF (tabela) — biblioteca client-side, sem chamada ao backend. */
export async function exportReportToPdf<T>({
  title,
  columns,
  rows,
}: ReportExportInput<T>): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`MedFlow — gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((column) => column.header)],
    body: toRowsOfStrings(columns, rows),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  doc.save(`${sanitizeFileName(title)}.pdf`);
}

/** Exporta em Excel (.xlsx) via `exceljs` — só escreve planilhas próprias, nunca faz parse de arquivo de terceiros. */
export async function exportReportToExcel<T>({
  title,
  columns,
  rows,
}: ReportExportInput<T>): Promise<void> {
  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Relatório");

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: Math.max(14, column.header.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.accessor(row)));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${sanitizeFileName(title)}.xlsx`);
}

const BRAND_LOGO_SVG = `
  <svg viewBox="0 0 32 32" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="18" width="7" height="12" rx="2.5" fill="#60A5FA"/>
    <rect x="12.5" y="10" width="7" height="20" rx="2.5" fill="#2563EB"/>
    <rect x="23" y="2" width="7" height="28" rx="2.5" fill="#1E3A8A"/>
  </svg>
`;

/**
 * Exporta como imagem (PNG) — cartão próprio (logo + título + tabela),
 * renderizado fora da tela e capturado via `html2canvas`, pensado pra
 * compartilhar num grupo do WhatsApp. Não é uma captura literal da
 * tela: usa sempre o visual claro da marca, independente do tema atual.
 */
export async function exportReportToImage<T>({
  title,
  columns,
  rows,
}: ReportExportInput<T>): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.width = "900px";
  container.style.padding = "24px";
  container.style.background = "#FFFFFF";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.color = "#0F172A";

  const headerRow = columns
    .map((column) => `<th>${column.header}</th>`)
    .join("");
  const bodyRows = toRowsOfStrings(columns, rows)
    .map(
      (cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
    )
    .join("");

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      ${BRAND_LOGO_SVG}
      <span style="font-size:18px;font-weight:700"><span style="color:#0F172A">Med</span><span style="color:#2563EB">Flow</span></span>
    </div>
    <h1 style="font-size:16px;margin:12px 0 4px">${title}</h1>
    <p style="font-size:11px;color:#64748B;margin:0 0 16px">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#2563EB;color:#FFFFFF">${headerRow}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #medflow-export-card table th, #medflow-export-card table td {
      padding: 6px 10px;
      border-bottom: 1px solid #E2E8F0;
      text-align: left;
    }
  `;
  container.id = "medflow-export-card";
  container.appendChild(style);

  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { backgroundColor: "#FFFFFF" });
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${sanitizeFileName(title)}.png`);
    }, "image/png");
  } finally {
    document.body.removeChild(container);
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
