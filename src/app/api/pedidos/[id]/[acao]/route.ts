import { z } from 'zod'
import { getDb } from '@/db'
import { aplicarAcao } from '@/db/pedidos'
import type { Acao } from '@/lib/tipos'
import { erro, json, tratarErro } from '../../../responder'

export const dynamic = 'force-dynamic'

const ACOES: readonly string[] = ['pronto', 'entregue', 'cancelar'] satisfies Acao[]

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; acao: string }> },
): Promise<Response> {
  try {
    const { id, acao } = await params
    if (!ACOES.includes(acao)) return erro('Ação desconhecida', 404)
    if (!z.uuid().safeParse(id).success) return erro('Pedido não encontrado', 404)
    const r = await aplicarAcao(getDb(), id, acao as Acao, new Date())
    if (r.ok) return json(r.pedido)
    return r.motivo === 'conflito'
      ? erro('Pedido já foi atualizado em outro aparelho', 409)
      : erro('Pedido não encontrado', 404)
  } catch (e) {
    return tratarErro(e)
  }
}
