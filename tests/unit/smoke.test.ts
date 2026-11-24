import { describe, expect, it } from "vitest";
import { metadata } from "@/app/layout";

describe("smoke", () => {
  it("soma", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolve o alias @/", () => {
    expect(metadata.title).toBe("Pedidos do espetinho");
  });
});
