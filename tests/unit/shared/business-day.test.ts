import { describe, it, expect } from "vitest";
import {
  getBusinessDay,
  startOfDayInTz,
  endOfDayInTz,
} from "@/shared/lib/business-day";

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

describe("startOfDayInTz", () => {
  it("mesmo comportamento de getBusinessDay, com (date, tz) invertido", () => {
    const reference = new Date("2026-07-08T01:39:57.819Z");
    expect(startOfDayInTz(reference, "America/Sao_Paulo").toISOString()).toBe(
      "2026-07-07T00:00:00.000Z",
    );
  });

  it("22h em horário de Brasília (já 01h do dia seguinte em UTC) cai no dia local correto", () => {
    // 22:00 de 14/07 em Brasília (UTC-3) = 01:00 UTC de 15/07.
    const reference = new Date("2026-07-15T01:00:00.000Z");
    expect(startOfDayInTz(reference, "America/Sao_Paulo").toISOString()).toBe(
      "2026-07-14T00:00:00.000Z",
    );
  });
});

describe("endOfDayInTz", () => {
  it("devolve 23:59:59.999 do dia local (meia-noite local do dia seguinte menos 1ms)", () => {
    const reference = new Date("2026-07-14T16:00:00.000Z"); // 13h em Brasília
    expect(endOfDayInTz(reference, "America/Sao_Paulo").toISOString()).toBe(
      "2026-07-14T23:59:59.999Z",
    );
  });

  it("22h em horário de Brasília ainda devolve o fim do dia LOCAL correto, não o do dia UTC", () => {
    // 22:00 de 14/07 em Brasília = 01:00 UTC de 15/07 — o dia local
    // ainda é 14/07, então o fim do dia deve ser 14/07T23:59:59.999Z,
    // nunca 15/07 (que seria o resultado se a conta usasse getters UTC
    // crus em vez do timezone informado).
    const reference = new Date("2026-07-15T01:00:00.000Z");
    expect(endOfDayInTz(reference, "America/Sao_Paulo").toISOString()).toBe(
      "2026-07-14T23:59:59.999Z",
    );
  });

  it("usa o timezone informado (não hardcoded)", () => {
    const reference = new Date("2026-07-08T01:39:57.819Z");
    expect(endOfDayInTz(reference, "UTC").toISOString()).toBe(
      "2026-07-08T23:59:59.999Z",
    );
  });
});
