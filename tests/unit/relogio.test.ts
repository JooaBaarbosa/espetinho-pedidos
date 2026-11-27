import { describe, expect, it } from "vitest";
import { criarRelogio } from "@/lib/relogio";

describe("criarRelogio", () => {
  it("soma ao agora do servidor o tempo local passado desde a resposta", () => {
    const relogio = criarRelogio("2026-11-24T20:00:00.000Z", 1000);
    expect(relogio(61000).toISOString()).toBe("2026-11-24T20:01:00.000Z");
  });

  it("independe do relógio de parede do aparelho", () => {
    const relogio = criarRelogio("2026-11-24T20:00:00.000Z", 5_000_000);
    expect(relogio(5_000_000).toISOString()).toBe("2026-11-24T20:00:00.000Z");
    expect(relogio(5_000_500).toISOString()).toBe("2026-11-24T20:00:00.500Z");
  });
});
