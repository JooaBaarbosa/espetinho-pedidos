import { afterEach, describe, expect, it, vi } from "vitest";
import { novoPedidoSchema } from "@/lib/regras";
import { gerarId } from "@/lib/uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gerarId", () => {
  it("usa crypto.randomUUID quando existe", () => {
    const randomUUID = vi.fn(() => "11111111-1111-4111-8111-111111111111");
    vi.stubGlobal("crypto", { randomUUID, getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect(gerarId()).toBe("11111111-1111-4111-8111-111111111111");
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("sem randomUUID (http na rede local) gera UUID v4 com getRandomValues", () => {
    const original = crypto;
    vi.stubGlobal("crypto", { getRandomValues: original.getRandomValues.bind(original) });
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const id = gerarId();
      expect(id).toMatch(UUID_V4);
      expect(novoPedidoSchema.shape.id.safeParse(id).success).toBe(true);
      ids.add(id);
    }
    expect(ids.size).toBe(50);
  });
});
