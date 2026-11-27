// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as entrar } from "@/app/api/entrar/route";
import { POST as sair } from "@/app/api/sair/route";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";

function post(senha: unknown) {
  return new Request("http://localhost:3000/api/entrar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ senha }),
  });
}

describe("POST /api/entrar", () => {
  beforeEach(() => {
    process.env.APP_SENHA = "brasa";
    process.env.SESSION_SECRET = SECRET;
    delete process.env.COOKIE_INSEGURO;
  });
  afterEach(() => {
    delete process.env.APP_SENHA;
    delete process.env.SESSION_SECRET;
    delete process.env.COOKIE_INSEGURO;
  });

  it("senha certa: 200 e cookie HttpOnly, Secure, SameSite=lax", async () => {
    const res = await entrar(post("brasa"));
    expect(res.status).toBe(200);
    const c = res.headers.get("set-cookie")!;
    expect(c).toContain("sessao=");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c.toLowerCase()).toContain("samesite=lax");
    expect(c).toContain("Path=/");
    expect(c).toContain("Max-Age=2592000");
  });
  it("COOKIE_INSEGURO=1 remove Secure", async () => {
    process.env.COOKIE_INSEGURO = "1";
    const c = (await entrar(post("brasa"))).headers.get("set-cookie")!;
    expect(c).not.toContain("Secure");
  });
  it("senha errada: 401", async () => {
    const res = await entrar(post("errada"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Senha incorreta" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("corpo invalido: 401", async () => {
    const res = await entrar(new Request("http://localhost/api/entrar", { method: "POST", body: "x" }));
    expect(res.status).toBe(401);
  });
  it("SESSION_SECRET ausente ou curto: 500", async () => {
    for (const v of [undefined, "curto"]) {
      if (v === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = v;
      const res = await entrar(post("brasa"));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ erro: "Configuração ausente" });
    }
  });
});

describe("POST /api/sair", () => {
  it("apaga o cookie", async () => {
    const res = await sair();
    expect(res.status).toBe(200);
    const c = res.headers.get("set-cookie")!;
    expect(c).toContain("sessao=;");
    expect(c).toContain("Max-Age=0");
  });
});
