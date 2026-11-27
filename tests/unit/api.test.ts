import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buscarConfig,
  buscarPainel,
  buscarSabores,
  buscarTodosSabores,
  criarSabor,
  editarSabor,
  entrar,
  enviarPedido,
  ErroApi,
  executarAcao,
  sair,
  salvarConfig,
  SessaoExpirada,
} from "@/lib/api";
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
  it("buscarSabores devolve o corpo do GET /api/sabores", async () => {
    const sabores = [{ id: 1, nome: "Carne", ativo: true, ordem: 1 }];
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, sabores));
    vi.stubGlobal("fetch", fetchMock);
    await expect(buscarSabores()).resolves.toEqual(sabores);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/sabores");
  });

  it("buscarSabores com 401 lança SessaoExpirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "x" })));
    await expect(buscarSabores()).rejects.toBeInstanceOf(SessaoExpirada);
  });

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

  it("entrar devolve true em 200 e envia a senha por POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(entrar("dev")).resolves.toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/entrar");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: '{"senha":"dev"}' });
  });

  it("entrar devolve false em 401, sem lançar SessaoExpirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: "Senha incorreta" })));
    await expect(entrar("x")).resolves.toBe(false);
  });

  it("entrar com outro erro lança ErroApi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(500, { erro: "Configuração ausente" })));
    await expect(entrar("x")).rejects.toBeInstanceOf(ErroApi);
  });

  it("buscarTodosSabores pede todos=1", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, []));
    vi.stubGlobal("fetch", fetchMock);
    await buscarTodosSabores();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/sabores?todos=1");
  });

  it("criarSabor envia o nome e erro 400 vira ErroApi com a mensagem", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(400, { erro: "Sabor já existe" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(criarSabor("Carne")).rejects.toMatchObject({ message: "Sabor já existe", status: 400 });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: '{"nome":"Carne"}' });
  });

  it("editarSabor usa PATCH no id", async () => {
    const sabor = { id: 3, nome: "Coração", ativo: false, ordem: 3 };
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, sabor));
    vi.stubGlobal("fetch", fetchMock);
    await expect(editarSabor(3, { ativo: false })).resolves.toEqual(sabor);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/sabores/3");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH", body: '{"ativo":false}' });
  });

  it("buscarConfig e salvarConfig", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { tempoMaxMin: 20 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(buscarConfig()).resolves.toEqual({ tempoMaxMin: 20 });
    await salvarConfig(20);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/config");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT", body: '{"tempoMaxMin":20}' });
  });

  it("salvarConfig fora do intervalo lança ErroApi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(400, { erro: "Tempo máximo inválido" })));
    await expect(salvarConfig(500)).rejects.toBeInstanceOf(ErroApi);
  });

  describe("tempo limite", () => {
    /** fetch que só termina quando o sinal aborta, rejeitando com o motivo do aborto. */
    function fetchPendurado() {
      return vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, rejeitar) => {
            init?.signal?.addEventListener("abort", () => rejeitar(init.signal?.reason));
          }),
      );
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it("requisição sem resposta rejeita depois de 8 s como erro de rede", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", fetchPendurado());
      const erro = buscarPainel().catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(7999);
      let terminou = false;
      void erro.then(() => (terminou = true));
      await Promise.resolve();
      expect(terminou).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const e = await erro;
      expect(e).toMatchObject({ name: "TimeoutError" });
      expect(e).not.toBeInstanceOf(SessaoExpirada);
      expect(e).not.toBeInstanceOf(ErroApi);
    });

    it("entrar também tem tempo limite", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", fetchPendurado());
      const erro = entrar("dev").catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(8000);
      const e = await erro;
      expect(e).toMatchObject({ name: "TimeoutError" });
      expect(e).not.toBeInstanceOf(ErroApi);
    });
  });

  it("sair faz POST em /api/sair", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await sair();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/sair");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });
});
