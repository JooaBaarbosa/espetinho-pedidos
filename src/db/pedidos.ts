import { and, asc, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { contarPedidos, inicioDoDiaSP, proximoStatus, type NovoPedido } from '@/lib/regras'
import type { Acao, Pedido, PainelResposta } from '@/lib/tipos'
import type { Db } from '.'
import { lerConfig } from './config'
import { ErroValidacao } from './erros'
import { itensPedido, pedidos, sabores } from './schema'

export { ErroValidacao }

type LinhaPedido = typeof pedidos.$inferSelect

async function montar(db: Db, linhas: LinhaPedido[]): Promise<Pedido[]> {
  if (linhas.length === 0) return []
  const itens = await db
    .select()
    .from(itensPedido)
    .where(
      inArray(
        itensPedido.pedidoId,
        linhas.map((l) => l.id),
      ),
    )
    .orderBy(asc(itensPedido.id))
  return linhas.map((l) => ({
    id: l.id,
    cliente: l.cliente,
    status: l.status,
    criadoEm: l.criadoEm.toISOString(),
    prontoEm: l.prontoEm?.toISOString() ?? null,
    finalizadoEm: l.finalizadoEm?.toISOString() ?? null,
    itens: itens
      .filter((i) => i.pedidoId === l.id)
      .map((i) => ({ saborId: i.saborId, nomeSabor: i.nomeSabor, quantidade: i.quantidade })),
  }))
}

export async function listarPainel(db: Db, agora: Date): Promise<PainelResposta> {
  const [ativosLinhas, finalizadosLinhas, cfg] = await Promise.all([
    db
      .select()
      .from(pedidos)
      .where(or(eq(pedidos.status, 'preparacao'), eq(pedidos.status, 'espera')))
      .orderBy(asc(pedidos.criadoEm)),
    db
      .select()
      .from(pedidos)
      .where(
        and(
          or(eq(pedidos.status, 'entregue'), eq(pedidos.status, 'cancelado')),
          gte(pedidos.finalizadoEm, inicioDoDiaSP(agora)),
        ),
      )
      .orderBy(desc(pedidos.finalizadoEm)),
    lerConfig(db),
  ])
  const ativos = await montar(db, ativosLinhas)
  const finalizadosHoje = await montar(db, finalizadosLinhas)
  return {
    agora: agora.toISOString(),
    tempoMaxMin: cfg.tempoMaxMin,
    ativos,
    finalizadosHoje,
    contadores: contarPedidos(ativos, finalizadosHoje),
  }
}

/** `agora` define `criado_em`; o padrao e o relogio do servidor. */
export async function criarPedido(
  db: Db,
  input: NovoPedido,
  agora: Date = new Date(),
): Promise<{ criado: boolean; pedido: Pedido }> {
  const ids = input.itens.map((i) => i.saborId)
  const encontrados = await db
    .select()
    .from(sabores)
    .where(and(inArray(sabores.id, ids), eq(sabores.ativo, true)))
  if (new Set(encontrados.map((s) => s.id)).size !== new Set(ids).size) {
    throw new ErroValidacao('Sabor indisponível')
  }
  const nomes = new Map(encontrados.map((s) => [s.id, s.nome]))

  const criado = await db.transaction(async (tx) => {
    const inseridos = await tx
      .insert(pedidos)
      .values({ id: input.id, cliente: input.cliente, criadoEm: agora })
      .onConflictDoNothing({ target: pedidos.id })
      .returning({ id: pedidos.id })
    if (inseridos.length === 0) return false
    await tx.insert(itensPedido).values(
      input.itens.map((i) => ({
        pedidoId: input.id,
        saborId: i.saborId,
        nomeSabor: nomes.get(i.saborId)!,
        quantidade: i.quantidade,
      })),
    )
    return true
  })

  const [linha] = await db.select().from(pedidos).where(eq(pedidos.id, input.id))
  const [pedido] = await montar(db, [linha!])
  return { criado, pedido: pedido! }
}

export async function aplicarAcao(
  db: Db,
  id: string,
  acao: Acao,
  agora: Date,
): Promise<{ ok: true; pedido: Pedido } | { ok: false; motivo: 'conflito' | 'nao_encontrado' }> {
  const [atual] = await db.select().from(pedidos).where(eq(pedidos.id, id))
  if (!atual) return { ok: false, motivo: 'nao_encontrado' }
  const novoStatus = proximoStatus(atual.status, acao)
  if (!novoStatus) return { ok: false, motivo: 'conflito' }

  const [atualizado] = await db
    .update(pedidos)
    .set({
      status: novoStatus,
      ...(acao === 'pronto' ? { prontoEm: agora } : { finalizadoEm: agora }),
    })
    .where(and(eq(pedidos.id, id), eq(pedidos.status, atual.status)))
    .returning()
  if (!atualizado) return { ok: false, motivo: 'conflito' }
  const [pedido] = await montar(db, [atualizado])
  return { ok: true, pedido: pedido! }
}
