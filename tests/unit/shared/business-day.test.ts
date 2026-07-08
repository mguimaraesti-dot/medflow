import { describe, it, expect } from "vitest";
import { getBusinessDay } from "@/shared/lib/business-day";

describe("getBusinessDay", () => {
  it("calcula o dia calendário no timezone informado, não em UTC puro", () => {
    // 01:39 UTC de 08/07 é ainda 22:39 de 07/07 em America/Sao_Paulo
    // (UTC-3) — bug real reportado: um caixa aberto/fechado nesse
    // horário caía no dia UTC seguinte em vez do dia local correto.
    const reference = new Date("2026-07-08T01:39:57.819Z");

    const utcBoundary = new Date(reference);
    utcBoundary.setUTCHours(0, 0, 0, 0);
    expect(utcBoundary.toISOString()).toBe("2026-07-08T00:00:00.000Z");

    const businessDay = getBusinessDay("America/Sao_Paulo", reference);
    expect(businessDay.toISOString()).toBe("2026-07-07T00:00:00.000Z");
  });

  it("mantém o mesmo dia quando bem longe da meia-noite UTC", () => {
    const reference = new Date("2026-07-08T16:13:33.955Z");
    const businessDay = getBusinessDay("America/Sao_Paulo", reference);
    expect(businessDay.toISOString()).toBe("2026-07-08T00:00:00.000Z");
  });

  it("usa o timezone informado (não hardcoded) — UTC não desloca nada", () => {
    const reference = new Date("2026-07-08T01:39:57.819Z");
    const businessDay = getBusinessDay("UTC", reference);
    expect(businessDay.toISOString()).toBe("2026-07-08T00:00:00.000Z");
  });
});
