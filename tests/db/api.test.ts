import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { Pedido, PainelResposta, Sabor } from '@/lib/tipos'

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

const pedidosRota = await import('@/app/api/pedidos/route')
const acaoRota = await import('@/app/api/pedidos/[id]/[acao]/route')
const saboresRota = await import('@/app/api/sabores/route')
const saborRota = await import('@/app/api/sabores/[id]/route')
const configRota = await import('@/app/api/config/route')
const { tratarErro } = await import('@/app/api/responder')

function req(metodo: string, corpo?: unknown, url = 'http://t/api') {
  return new Request(url, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  })
}

const paramsAcao = (id: string, acao: string) => ({ params: Promise.resolve({ id, acao }) })
const paramsId = (id: string) => ({ params: Promise.resolve({ id }) })

async function sabores(): Promise<Sabor[]> {
  return (await saboresRota.GET(req('GET'))).json()
}

async function corpoPedido(cliente = 'João') {
  const [carne, frango] = await sabores()
  return {
    id: randomUUID(),
    cliente,
    itens: [
      { saborId: carne!.id, quantidade: 2 },
      { saborId: frango!.id, quantidade: 1 },
    ],
  }
}

describe('pedidos', () => {
  it('POST cria (201), repetir devolve 200 e o painel mostra 1 ativo', async () => {
    const corpo = await corpoPedido()
    const r1 = await pedidosRota.POST(req('POST', corpo))
    expect(r1.status).toBe(201)
    const p1: Pedido = await r1.json()
    expect(p1.id).toBe(corpo.id)
    expect(p1.status).toBe('preparacao')

    const r2 = await pedidosRota.POST(req('POST', corpo))
    expect(r2.status).toBe(200)

    const painel: PainelResposta = await (await pedidosRota.GET()).json()
    expect(painel.ativos).toHaveLength(1)
  })

  it('GET responde sem cache e reflete os contadores', async () => {
    const a = await corpoPedido('Ana')
    const b = await corpoPedido('Beto')
    await pedidosRota.POST(req('POST', a))
    await pedidosRota.POST(req('POST', b))
    await acaoRota.POST(req('POST'), paramsAcao(a.id, 'pronto'))
    await acaoRota.POST(req('POST'), paramsAcao(b.id, 'cancelar'))

    const res = await pedidosRota.GET()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const painel: PainelResposta = await res.json()
    expect(painel.contadores).toEqual({ preparacao: 0, espera: 1, entregue: 0, cancelado: 1 })
    expect(painel.tempoMaxMin).toBe(15)
  })

  it('itens vazios devolve 400 com a mensagem do schema', async () => {
    const corpo = { ...(await corpoPedido()), itens: [] }
    const r = await pedidosRota.POST(req('POST', corpo))
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({ erro: 'Escolha pelo menos um sabor' })
  })

  it('corpo que não é JSON devolve 400', async () => {
    const r = await pedidosRota.POST(req('POST', '{quebrado'))
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toBeTruthy()
  })

  it('sabor inexistente devolve 400 Sabor indisponível', async () => {
    const corpo = { id: randomUUID(), cliente: 'X', itens: [{ saborId: 9999, quantidade: 1 }] }
    const r = await pedidosRota.POST(req('POST', corpo))
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({ erro: 'Sabor indisponível' })
  })
})

describe('ações do pedido', () => {
  it('pronto 200, repetir 409, ação desconhecida 404, id inexistente 404, id inválido 404', async () => {
    const corpo = await corpoPedido()
    await pedidosRota.POST(req('POST', corpo))

    const ok = await acaoRota.POST(req('POST'), paramsAcao(corpo.id, 'pronto'))
    expect(ok.status).toBe(200)
    expect((await ok.json()).status).toBe('espera')

    const dup = await acaoRota.POST(req('POST'), paramsAcao(corpo.id, 'pronto'))
    expect(dup.status).toBe(409)
    expect(await dup.json()).toEqual({ erro: 'Pedido já foi atualizado em outro aparelho' })

    const voar = await acaoRota.POST(req('POST'), paramsAcao(corpo.id, 'voar'))
    expect(voar.status).toBe(404)

    const nada = await acaoRota.POST(req('POST'), paramsAcao(randomUUID(), 'pronto'))
    expect(nada.status).toBe(404)
    expect(await nada.json()).toEqual({ erro: 'Pedido não encontrado' })

    const invalido = await acaoRota.POST(req('POST'), paramsAcao('abc', 'pronto'))
    expect(invalido.status).toBe(404)
    expect(await invalido.json()).toEqual({ erro: 'Pedido não encontrado' })
  })
})

describe('sabores', () => {
  it('POST cria (201), nome vazio 400, duplicado 400', async () => {
    const r = await saboresRota.POST(req('POST', { nome: '  Pão de alho ' }))
    expect(r.status).toBe(201)
    expect((await r.json()).nome).toBe('Pão de alho')

    const vazio = await saboresRota.POST(req('POST', { nome: '   ' }))
    expect(vazio.status).toBe(400)
    expect(await vazio.json()).toEqual({ erro: 'Informe o nome do sabor' })

    const dup = await saboresRota.POST(req('POST', { nome: 'Pão de alho' }))
    expect(dup.status).toBe(400)
    expect(await dup.json()).toEqual({ erro: 'Sabor já existe' })

    const semCorpo = await saboresRota.POST(req('POST', 'xx'))
    expect(semCorpo.status).toBe(400)
  })

  it('PATCH edita (200), id inexistente ou inválido 404, corpo inválido 400', async () => {
    const [carne] = await sabores()
    const r = await saborRota.PATCH(req('PATCH', { ativo: false }), paramsId(String(carne!.id)))
    expect(r.status).toBe(200)
    expect((await r.json()).ativo).toBe(false)

    const ativos = await sabores()
    expect(ativos.find((s) => s.id === carne!.id)).toBeUndefined()
    const todos: Sabor[] = await (
      await saboresRota.GET(req('GET', undefined, 'http://t/api/sabores?todos=1'))
    ).json()
    expect(todos.find((s) => s.id === carne!.id)).toBeDefined()

    expect((await saborRota.PATCH(req('PATCH', { nome: 'Y' }), paramsId('99999'))).status).toBe(404)
    expect((await saborRota.PATCH(req('PATCH', { nome: 'Y' }), paramsId('abc'))).status).toBe(404)
    const ruim = await saborRota.PATCH(req('PATCH', { ativo: 'sim' }), paramsId(String(carne!.id)))
    expect(ruim.status).toBe(400)
    expect((await saborRota.PATCH(req('PATCH', '{x'), paramsId(String(carne!.id)))).status).toBe(400)
  })
})

describe('config', () => {
  it('GET devolve o padrão, PUT salva e valida', async () => {
    expect(await (await configRota.GET()).json()).toEqual({ tempoMaxMin: 15 })

    const ok = await configRota.PUT(req('PUT', { tempoMaxMin: 20 }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ tempoMaxMin: 20 })
    expect(await (await configRota.GET()).json()).toEqual({ tempoMaxMin: 20 })

    const zero = await configRota.PUT(req('PUT', { tempoMaxMin: 0 }))
    expect(zero.status).toBe(400)
    expect((await zero.json()).erro).toBeTruthy()
    expect((await configRota.PUT(req('PUT', { tempoMaxMin: 1.5 }))).status).toBe(400)
    expect((await configRota.PUT(req('PUT', 'lixo'))).status).toBe(400)
  })
})

describe('tratarErro', () => {
  it('erro inesperado vira 500 e é registrado no console', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = tratarErro(new Error('boom'))
    expect(r.status).toBe(500)
    expect(await r.json()).toEqual({ erro: 'Erro inesperado' })
    expect(espiao).toHaveBeenCalledOnce()
    espiao.mockRestore()
  })
})
