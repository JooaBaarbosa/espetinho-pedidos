import { getDb } from '@/db'
import { criarPedido, listarPainel } from '@/db/pedidos'
import { novoPedidoSchema } from '@/lib/regras'
import { json, lerJson, tratarErro } from '../responder'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const painel = await listarPainel(getDb(), new Date())
    return json(painel, 200, { 'Cache-Control': 'no-store' })
  } catch (e) {
    return tratarErro(e)
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const entrada = novoPedidoSchema.parse(await lerJson(req))
    const { criado, pedido } = await criarPedido(getDb(), entrada)
    return json(pedido, criado ? 201 : 200)
  } catch (e) {
    return tratarErro(e)
  }
}
