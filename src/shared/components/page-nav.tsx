"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

function buildPageList(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

/** Navegação numerada de páginas (desktop) — mesmo desenho já usado em Contas a Pagar. */
export function PageNav({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Página anterior</span>
      </Button>
      {buildPageList(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="text-muted-foreground px-1.5 text-sm"
          >
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(entry)}
          >
            {entry}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Próxima página</span>
      </Button>
    </div>
  );
}
