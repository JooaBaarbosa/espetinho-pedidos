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

/** Sem resposta neste prazo, a requisição é abortada e rejeita como erro de rede. */
const TEMPO_LIMITE_MS = 8000;

/**
 * Sinal com o tempo limite, somado ao sinal de quem chama, se houver. Equivale a
 * `AbortSignal.timeout`, mas sobre `setTimeout` (que os testes controlam com relógio falso).
 */
function sinalComLimite(sinal?: AbortSignal | null): AbortSignal {
  const controle = new AbortController();
  setTimeout(
    () => controle.abort(new DOMException("Tempo limite da requisição", "TimeoutError")),
    TEMPO_LIMITE_MS,
  );
  const limite = controle.signal;
  return sinal ? AbortSignal.any([sinal, limite]) : limite;
}

/**
 * Único ponto (com `entrar`) que chama `fetch`: aplica a regra 401 → `SessaoExpirada`.
 * Erro de rede e tempo limite propagam como estão (não são `ErroApi`).
 */
async function requisitar(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { cache: "no-store", ...init, signal: sinalComLimite(init?.signal) });
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

/** Todos os sabores (ativos e inativos), na ordem de exibição. */
export async function buscarTodosSabores(): Promise<Sabor[]> {
  const res = await requisitar("/api/sabores?todos=1");
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as Sabor[];
}

export async function criarSabor(nome: string): Promise<Sabor> {
  const res = await postJson("/api/sabores", { nome });
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as Sabor;
}

export async function editarSabor(
  id: number,
  campos: Partial<Pick<Sabor, "nome" | "ativo" | "ordem">>,
): Promise<Sabor> {
  const res = await requisitar(`/api/sabores/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(campos),
  });
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as Sabor;
}

export async function buscarConfig(): Promise<{ tempoMaxMin: number }> {
  const res = await requisitar("/api/config");
  if (!res.ok) throw await erroDe(res);
  return (await res.json()) as { tempoMaxMin: number };
}

export async function salvarConfig(tempoMaxMin: number): Promise<void> {
  const res = await requisitar("/api/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tempoMaxMin }),
  });
  if (!res.ok) throw await erroDe(res);
}

export async function sair(): Promise<void> {
  const res = await postJson("/api/sair");
  if (!res.ok) throw await erroDe(res);
}

/** `true` com a senha certa, `false` com 401. Não passa pela regra de sessão expirada. */
export async function entrar(senha: string): Promise<boolean> {
  const res = await fetch("/api/entrar", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ senha }),
    signal: sinalComLimite(),
  });
  if (res.status === 401) return false;
  if (!res.ok) throw await erroDe(res);
  return true;
}
