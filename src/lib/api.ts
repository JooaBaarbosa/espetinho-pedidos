import type { NovoPedido } from "./regras";
import type { Acao, PainelResposta, Pedido, Sabor } from "./tipos";

/** A sessão do aparelho acabou (qualquer 401 da API). */
export class SessaoExpirada extends Error {
  constructor() {
    super("Sessão expirada");
    this.name = "SessaoExpirada";
  }
}

/** Resposta HTTP de erro com a mensagem `{ erro }` do servidor. */
export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErroApi";
  }
}

/** Único ponto que chama `fetch`: aplica a regra 401 → `SessaoExpirada`. Erro de rede propaga. */
async function requisitar(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (res.status === 401) throw new SessaoExpirada();
  return res;
}

async function erroDe(res: Response): Promise<ErroApi> {
  const corpo: unknown = await res.json().catch(() => null);
  const mensagem =
    corpo && typeof corpo === "object" && "erro" in corpo && typeof corpo.erro === "string"
      ? corpo.erro
      : "Não foi possível falar com o servidor";
  return new ErroApi(mensagem, res.status);
}

function postJson(url: string, corpo?: unknown): Promise<Response> {
  return requisitar(url, {
    method: "POST",
    headers: corpo === undefined ? undefined : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

export async function buscarPainel(): Promise<PainelResposta> {
  const res = await requisitar("/api/pedidos");
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as PainelResposta;
}

/** Sabores ativos, na ordem de exibição. */
export async function buscarSabores(): Promise<Sabor[]> {
  const res = await requisitar("/api/sabores");
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as Sabor[];
}

export async function enviarPedido(p: NovoPedido): Promise<Pedido> {
  const res = await postJson("/api/pedidos", p);
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as Pedido;
}

/** `'conflito'` quando outro aparelho já mudou o pedido (409): basta recarregar. */
export async function executarAcao(id: string, acao: Acao): Promise<"ok" | "conflito"> {
  const res = await postJson(`/api/pedidos/${encodeURIComponent(id)}/${acao}`);
  if (res.status === 409) return "conflito";
  if (!res.ok) throw await erroDe(res);
  return "ok";
}
