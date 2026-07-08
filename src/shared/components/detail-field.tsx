/** Linha de resumo somente leitura (label + valor) — usado em Drawers e modais de detalhe/fechamento. */
export function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}
