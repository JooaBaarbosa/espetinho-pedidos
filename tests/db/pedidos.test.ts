import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { getDb } from '@/db'
import { aplicarAcao, criarPedido, ErroValidacao, listarPainel } from '@/db/pedidos'
import { editarSabor, listarSabores } from '@/db/sabores'
import { lerConfig } from '@/db/config'

const db = getDb(process.env.DATABASE_URL_TEST!)
const AGORA = new Date('2026-11-24T15:00:00Z')

async function ids() {
  const todos = await listarSabores(db)
  const por = (nome: string) => todos.find((s) => s.nome === nome)!.id
  return { carne: por('Carne'), frango: por('Frango') }
}

async function novo(agora: Date = AGORA, cliente = 'João') {
  const { carne, frango } = await ids()
  const id = randomUUID()
  const r = await criarPedido(db, {
    id,
    cliente,
    itens: [
      { saborId: carne, quantidade: 2 },
      { saborId: frango, quantidade: 1 },
    ],
  }, agora)
  return { id, ...r }
}

describe('seed', () => {
  it('traz os 10 sabores do cardápio e a config padrão', async () => {
    const sabores = await listarSabores(db)
    expect(sabores).toHaveLength(10)
    expect(sabores[7]!.nome).toBe('Medalhão de carne')
    expect(await lerConfig(db)).toEqual({ tempoMaxMin: 15 })
  })
})

describe('criarPedido', () => {
  it('cria em preparação com nome do sabor copiado nos itens', async () => {
    const { criado, pedido } = await novo()
    expect(criado).toBe(true)
    expect(pedido.status).toBe('preparacao')
    expect(pedido.cliente).toBe('João')
    expect(pedido.itens).toEqual([
      expect.objectContaining({ nomeSabor: 'Carne', quantidade: 2 }),
      expect.objectContaining({ nomeSabor: 'Frango', quantidade: 1 }),
    ])
  })

  it('é idempotente pelo id', async () => {
    const { carne } = await ids()
    const entrada = { id: randomUUID(), cliente: 'Ana', itens: [{ saborId: carne, quantidade: 1 }] }
    const a = await criarPedido(db, entrada)
    const b = await criarPedido(db, entrada)
    expect(a.criado).toBe(true)
    expect(b.criado).toBe(false)
    expect(b.pedido.id).toBe(entrada.id)
    const painel = await listarPainel(db, new Date())
    expect(painel.ativos).toHaveLength(1)
    expect(painel.ativos[0]!.itens).toHaveLength(1)
  })

  it('rejeita sabor desativado ou inexistente', async () => {
    const { carne } = await ids()
    await editarSabor(db, carne, { ativo: false })
    await expect(
      criarPedido(db, { id: randomUUID(), cliente: 'Ana', itens: [{ saborId: carne, quantidade: 1 }] }),
    ).rejects.toThrow(ErroValidacao)
    await expect(
      criarPedido(db, { id: randomUUID(), cliente: 'Ana', itens: [{ saborId: 99999, quantidade: 1 }] }),
    ).rejects.toThrow('Sabor indisponível')
  })
})

describe('aplicarAcao', () => {
  it('pronto e entregue preenchem as datas e os contadores', async () => {
    const { id } = await novo()
    const pronto = await aplicarAcao(db, id, 'pronto', new Date('2026-11-24T15:05:00Z'))
    expect(pronto.ok && pronto.pedido.status).toBe('espera')
    const entregue = await aplicarAcao(db, id, 'entregue', new Date('2026-11-24T15:08:00Z'))
    expect(entregue.ok).toBe(true)
    if (!entregue.ok) return
    expect(entregue.pedido.prontoEm).toBe('2026-11-24T15:05:00.000Z')
    expect(entregue.pedido.finalizadoEm).toBe('2026-11-24T15:08:00.000Z')
    const painel = await listarPainel(db, new Date('2026-11-24T15:10:00Z'))
    expect(painel.contadores).toEqual({ preparacao: 0, espera: 0, entregue: 1, cancelado: 0 })
    expect(painel.tempoMaxMin).toBe(15)
    expect(painel.agora).toBe('2026-11-24T15:10:00.000Z')
  })

  it('cancelar grava finalizadoEm', async () => {
    const { id } = await novo()
    const r = await aplicarAcao(db, id, 'cancelar', new Date('2026-11-24T15:02:00Z'))
    expect(r.ok && r.pedido.status).toBe('cancelado')
    expect(r.ok && r.pedido.finalizadoEm).toBe('2026-11-24T15:02:00.000Z')
    expect(r.ok && r.pedido.prontoEm).toBeNull()
  })

  it('conflito e não encontrado', async () => {
    const { id } = await novo()
    expect(await aplicarAcao(db, id, 'pronto', AGORA)).toMatchObject({ ok: true })
    expect(await aplicarAcao(db, id, 'pronto', AGORA)).toEqual({ ok: false, motivo: 'conflito' })
    expect(await aplicarAcao(db, randomUUID(), 'pronto', AGORA)).toEqual({
      ok: false,
      motivo: 'nao_encontrado',
    })
    const outro = await novo()
    expect(await aplicarAcao(db, outro.id, 'entregue', AGORA)).toEqual({ ok: false, motivo: 'conflito' })
  })
})

describe('listarPainel e virada do dia', () => {
  it('pedido de 23:50 segue ativo após meia-noite e entra nos finalizados de hoje', async () => {
    const { id } = await novo(new Date('2026-11-25T02:50:00Z'))
    const depois = new Date('2026-11-25T03:10:00Z')
    let painel = await listarPainel(db, depois)
    expect(painel.ativos.map((p) => p.id)).toEqual([id])
    await aplicarAcao(db, id, 'pronto', depois)
    await aplicarAcao(db, id, 'entregue', depois)
    painel = await listarPainel(db, depois)
    expect(painel.ativos).toHaveLength(0)
    expect(painel.finalizadosHoje.map((p) => p.id)).toEqual([id])
  })

  it('pedido entregue antes da meia-noite de SP não aparece no dia seguinte', async () => {
    const { id } = await novo(new Date('2026-11-25T02:50:00Z'))
    await aplicarAcao(db, id, 'pronto', new Date('2026-11-25T02:55:00Z'))
    await aplicarAcao(db, id, 'entregue', new Date('2026-11-25T02:59:00Z'))
    const painel = await listarPainel(db, new Date('2026-11-25T03:10:00Z'))
    expect(painel.finalizadosHoje).toHaveLength(0)
    expect(painel.contadores.entregue).toBe(0)
  })

  it('ativos por criação asc e finalizados por finalização desc', async () => {
    const a = await novo(new Date('2026-11-24T14:00:00Z'), 'A')
    const b = await novo(new Date('2026-11-24T14:01:00Z'), 'B')
    const c = await novo(new Date('2026-11-24T14:02:00Z'), 'C')
    await aplicarAcao(db, a.id, 'cancelar', new Date('2026-11-24T14:10:00Z'))
    await aplicarAcao(db, b.id, 'cancelar', new Date('2026-11-24T14:11:00Z'))
    const painel = await listarPainel(db, AGORA)
    expect(painel.ativos.map((p) => p.id)).toEqual([c.id])
    expect(painel.finalizadosHoje.map((p) => p.id)).toEqual([b.id, a.id])
  })
})

describe('renomear sabor', () => {
  it('pedido existente mantém o nome copiado', async () => {
    const { carne } = await ids()
    await novo()
    await editarSabor(db, carne, { nome: 'Carne bovina', ativo: false })
    const painel = await listarPainel(db, AGORA)
    expect(painel.ativos[0]!.itens.map((i) => i.nomeSabor)).toContain('Carne')
    expect(painel.ativos[0]!.itens.map((i) => i.nomeSabor)).not.toContain('Carne bovina')
  })
})
