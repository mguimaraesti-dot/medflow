import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toCashFlowInsightsResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-insights.response-dto";
import type { CashFlowInsights } from "@/features/cash-flow/application/get-cash-flow-insights.use-case";

describe("toCashFlowInsightsResponseDTO", () => {
  it("serializa total de byCategory e byHour como string decimal fixa", () => {
    const insights: CashFlowInsights = {
      byCategory: [
        {
          categoryId: "cat-1",
          categoryName: "Consulta",
          color: "#16A34A",
          total: new Prisma.Decimal("150.5"),
        },
      ],
      byHour: [{ hour: 9, total: new Prisma.Decimal("120") }],
    };

    const dto = toCashFlowInsightsResponseDTO(insights);

    expect(dto.byCategory[0].total).toBe("150.50");
    expect(typeof dto.byCategory[0].total).toBe("string");
    expect(dto.byHour[0]).toEqual({ hour: 9, total: "120.00" });
  });
});
