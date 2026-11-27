// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy, config } from "@/proxy";
import { COOKIE_SESSAO, criarToken, lerSessao, VALIDADE_SEG } from "@/lib/sessao";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";

function req(path: string, token?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `${COOKIE_SESSAO}=${token}` } : {},
  });
}

describe("proxy", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
    vi.stubEnv("COOKIE_INSEGURO", "");
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
    vi.unstubAllEnvs();
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
  it("token com mais de 7 dias passa e renova o cookie por mais 30 dias", async () => {
    const oitoDias = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const res = await proxy(req("/api/pedidos", await criarToken(SECRET, oitoDias)));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    const cookie = res.cookies.get(COOKIE_SESSAO);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: VALIDADE_SEG });
    const sessao = await lerSessao(cookie!.value, SECRET);
    expect(sessao!.iat).toBeGreaterThan(Date.now() / 1000 - 60);
  });
  it("token de 1 dia passa sem renovar o cookie", async () => {
    const umDia = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const res = await proxy(req("/", await criarToken(SECRET, umDia)));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("set-cookie")).toBeNull();
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
