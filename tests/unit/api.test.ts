import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarPainel, enviarPedido, executarAcao, SessaoExpirada } from "@/lib/api";
import type { PainelResposta } from "@/lib/tipos";

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PAINEL: PainelResposta = {
  agora: "2026-11-24T20:00:00.000Z",
  tempoMaxMin: 15,
  ativos: [],
  finalizadosHoje: [],
  contadores: { preparacao: 0, espera: 0, entregue: 0, cancelado: 0 },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("buscarPainel devolve o corpo do GET /api/pedidos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, PAINEL));
    vi.stubGlobal("fetch", fetchMock);
    await expect(buscarPainel()).resolves.toEqual(PAINEL);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/pedidos");
  });

  it("401 em buscarPainel rejeita com SessaoExpirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "Sessão expirada" })));
    await expect(buscarPainel()).rejects.toBeInstanceOf(SessaoExpirada);
  });

  it("401 em executarAcao e enviarPedido também rejeita com SessaoExpirada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => resposta(401, { erro: "Sessão expirada" })),
    );
    await expect(executarAcao("abc", "pronto")).rejects.toBeInstanceOf(SessaoExpirada);
    await expect(
      enviarPedido({ id: "a", cliente: "Ana", itens: [{ saborId: 1, quantidade: 1 }] }),
    ).rejects.toBeInstanceOf(SessaoExpirada);
  });

  it("enviarPedido faz POST com o corpo em JSON e devolve o pedido", async () => {
    const criado = { id: "a", cliente: "Ana" };
    const fetchMock = vi.fn().mockResolvedValue(resposta(201, criado));
    vi.stubGlobal("fetch", fetchMock);
    const novo = { id: "a", cliente: "Ana", itens: [{ saborId: 1, quantidade: 2 }] };
    await expect(enviarPedido(novo)).resolves.toEqual(criado);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pedidos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(novo);
  });

  it("executarAcao: 200 vira 'ok' e usa POST na rota da ação", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    await expect(executarAcao("abc", "cancelar")).resolves.toBe("ok");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/pedidos/abc/cancelar");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });

  it("executarAcao: 409 vira 'conflito'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(resposta(409, { erro: "Pedido já foi atualizado em outro aparelho" })),
    );
    await expect(executarAcao("abc", "pronto")).resolves.toBe("conflito");
  });

  it("erro de rede rejeita com TypeError, não SessaoExpirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const erro = await buscarPainel().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(TypeError);
    expect(erro).not.toBeInstanceOf(SessaoExpirada);
  });

  it("outros erros HTTP rejeitam com a mensagem do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(400, { erro: "Informe o nome do cliente" })));
    await expect(
      enviarPedido({ id: "a", cliente: "", itens: [{ saborId: 1, quantidade: 1 }] }),
    ).rejects.toThrow("Informe o nome do cliente");
  });
});
