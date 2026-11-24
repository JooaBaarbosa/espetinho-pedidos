// @vitest-environment node
import { describe, expect, it } from "vitest";
import { criarToken, senhaConfere, tokenValido, VALIDADE_SEG } from "@/lib/sessao";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";

describe("sessao", () => {
  it("token criado e valido", async () => {
    expect(await tokenValido(await criarToken(SECRET), SECRET)).toBe(true);
  });
  it("token com outro secret e invalido", async () => {
    const t = await criarToken(SECRET);
    expect(await tokenValido(t, "outro-segredo-com-mais-de-32-caracteres!")).toBe(false);
  });
  it("token criado 31 dias atras e invalido", async () => {
    const agora = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(await tokenValido(await criarToken(SECRET, agora), SECRET)).toBe(false);
  });
  it("undefined, lixo e secret curto/vazio sao invalidos", async () => {
    expect(await tokenValido(undefined, SECRET)).toBe(false);
    expect(await tokenValido("lixo", SECRET)).toBe(false);
    const t = await criarToken(SECRET);
    expect(await tokenValido(t, "")).toBe(false);
    expect(await tokenValido(t, "curto")).toBe(false);
  });
  it("validade de 30 dias", () => {
    expect(VALIDADE_SEG).toBe(2592000);
  });
  it("senhaConfere", () => {
    expect(senhaConfere("abc", "abc")).toBe(true);
    expect(senhaConfere("abc", "abd")).toBe(false);
    expect(senhaConfere("", "abc")).toBe(false);
  });
});
