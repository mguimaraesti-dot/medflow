import { describe, it, expect } from "vitest";
import {
  getBusinessDay,
  startOfDayInTz,
  endOfDayInTz,
  startOfDayInstant,
  endOfDayInstant,
  labelToStartInstant,
  labelToEndInstant,
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

/**
 * Bug real de produção: filtro "Hoje" da Tesouraria usava o RÓTULO de
 * `startOfDayInTz`/`endOfDayInTz` diretamente como limite de
 * `SafeMovement.createdAt` (uma coluna `DateTime` de verdade). Em
 * Brasília (UTC-3), tudo criado entre ~21h e meia-noite local já tinha
 * virado o dia UTC seguinte — o rótulo (baseado só na data, sem esse
 * deslocamento) excluía essas movimentações por engano. Sangria e
 * handoff confirmados às 21h47/21h51 (hora local) sumiam do filtro
 * "Hoje" mesmo tendo acontecido hoje. `startOfDayInstant`/
 * `endOfDayInstant`/`labelToStartInstant`/`labelToEndInstant` devolvem
 * o instante UTC REAL (não um rótulo) — corretos para limitar colunas
 * `DateTime`, nunca para colunas de data pura (`dueDate`,
 * `CashRegisterDay.date`), que continuam usando os rótulos acima.
 */
describe("startOfDayInstant / endOfDayInstant", () => {
  const TZ = "America/Sao_Paulo";

  it("devolve o instante UTC real da meia-noite local, 3h depois do rótulo equivalente", () => {
    const reference = new Date("2026-09-23T22:46:42.356Z"); // qualquer instante do dia 23/09 em Brasília (19:46 local)
    expect(startOfDayInstant(reference, TZ).toISOString()).toBe(
      "2026-09-23T03:00:00.000Z",
    );
    expect(endOfDayInstant(reference, TZ).toISOString()).toBe(
      "2026-09-24T02:59:59.999Z",
    );
  });

  it("inclui movimentações criadas entre 21h e meia-noite local — o caso real que motivou o fix", () => {
    // Sangria confirmada às 21h47 (hora local) de 23/09 — em UTC já é
    // 24/09, então caía fora do rótulo antigo (que terminava em
    // 2026-09-23T23:59:59.999Z, 3h adiantado do fim real do dia local).
    const referenceNow = new Date("2026-09-24T01:46:42.356Z"); // "agora" = 22:46 local de 23/09
    const sangriaCreatedAt = new Date("2026-09-24T00:47:36.947Z"); // 21:47 local de 23/09
    const handoffCreatedAt = new Date("2026-09-24T00:51:19.599Z"); // 21:51 local de 23/09

    const start = startOfDayInstant(referenceNow, TZ);
    const end = endOfDayInstant(referenceNow, TZ);

    expect(sangriaCreatedAt >= start && sangriaCreatedAt <= end).toBe(true);
    expect(handoffCreatedAt >= start && handoffCreatedAt <= end).toBe(true);
  });

  it("não inclui uma movimentação de ontem no intervalo de hoje", () => {
    const referenceNow = new Date("2026-09-24T01:46:42.356Z");
    const yesterdayConfirmedAt = new Date("2026-09-22T21:25:08.815Z"); // 18:25 local de 22/09

    const start = startOfDayInstant(referenceNow, TZ);
    const end = endOfDayInstant(referenceNow, TZ);

    expect(yesterdayConfirmedAt >= start && yesterdayConfirmedAt <= end).toBe(
      false,
    );
  });

  it("dias consecutivos são contíguos — fim de um dia + 1ms = início do dia seguinte, sem gap nem sobreposição", () => {
    const day1 = new Date("2026-09-22T12:00:00.000Z");
    const day2 = new Date("2026-09-23T12:00:00.000Z");

    const endOfDay1 = endOfDayInstant(day1, TZ);
    const startOfDay2 = startOfDayInstant(day2, TZ);

    expect(new Date(endOfDay1.getTime() + 1).getTime()).toBe(
      startOfDay2.getTime(),
    );
  });
});

describe("labelToStartInstant / labelToEndInstant", () => {
  const TZ = "America/Sao_Paulo";

  it("converte um rótulo (ex.: 'ontem' = rótulo de hoje menos 1 dia UTC) sem reconverter pelo fuso", () => {
    const todayLabel = startOfDayInTz(new Date("2026-09-24T01:46:42.356Z"), TZ); // rótulo: 2026-09-23T00:00:00.000Z
    const yesterdayLabel = new Date(todayLabel);
    yesterdayLabel.setUTCDate(yesterdayLabel.getUTCDate() - 1);

    // Regressão: uma implementação errada (re-derivar o rótulo passando-o
    // de novo por startOfDayInTz/getBusinessDay) desloca a data pra
    // trás e pode devolver um fim de dia ANTERIOR ao início do mesmo
    // dia. Aqui start < end é a garantia mínima de que isso não
    // aconteceu.
    const start = labelToStartInstant(yesterdayLabel, TZ);
    const end = labelToEndInstant(yesterdayLabel, TZ);
    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(start.toISOString()).toBe("2026-09-22T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-23T02:59:59.999Z");
  });
});
