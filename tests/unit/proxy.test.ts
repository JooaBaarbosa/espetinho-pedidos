// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy, config } from "@/proxy";
import { COOKIE_SESSAO, criarToken } from "@/lib/sessao";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";

function req(path: string, token?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `${COOKIE_SESSAO}=${token}` } : {},
  });
}

describe("proxy", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("pagina sem cookie redireciona para /entrar", async () => {
    const res = await proxy(req("/"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/entrar");
  });
  it("api sem cookie responde 401", async () => {
    const res = await proxy(req("/api/pedidos"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Sessão expirada" });
  });
  it.each(["/privacidade", "/termos", "/entrar", "/api/entrar"])("%s e publica", async (p) => {
    const res = await proxy(req(p));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
  it("com token valido passa", async () => {
    const res = await proxy(req("/", await criarToken(SECRET)));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
  it("token invalido redireciona", async () => {
    const res = await proxy(req("/", "lixo"));
    expect(res.status).toBe(307);
  });
  it("sem SESSION_SECRET nenhum token vale", async () => {
    const token = await criarToken(SECRET);
    delete process.env.SESSION_SECRET;
    const res = await proxy(req("/", token));
    expect(res.status).toBe(307);
  });
  it("matcher exclui estaticos", () => {
    expect(config.matcher[0]).toContain("_next/static");
    expect(config.matcher[0]).toContain("marca");
  });
});
