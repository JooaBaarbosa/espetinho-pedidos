import { describe, expect, it, vi } from "vitest";
import { metadata } from "@/app/layout";

// next/font/google só é resolvido pelo compilador do Next; aqui devolve um stub.
vi.mock("next/font/google", () => {
  const fonte = () => ({ variable: "stub" });
  return { Anton: fonte, Oswald: fonte, Lato: fonte };
});

describe("smoke", () => {
  it("soma", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolve o alias @/", () => {
    expect(metadata.title).toBe("Pedidos | Brasamiga");
  });
});
