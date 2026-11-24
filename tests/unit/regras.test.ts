import { describe, expect, it } from 'vitest'
import {
  contarPedidos,
  estaAtrasado,
  formatarCronometro,
  inicioDoDiaSP,
  minutosAtraso,
  msDecorridos,
  novoPedidoSchema,
  proximoStatus,
  resumoItens,
  totalEspetinhos,
} from '@/lib/regras'
import type { ItemPedido, Pedido } from '@/lib/tipos'

const criado = '2026-11-24T20:00:00Z'
const em = (hhmmss: string) => new Date(`2026-11-24T${hhmmss}Z`)

describe('proximoStatus', () => {
  it('permite as transicoes validas', () => {
    expect(proximoStatus('preparacao', 'pronto')).toBe('espera')
    expect(proximoStatus('espera', 'entregue')).toBe('entregue')
    expect(proximoStatus('preparacao', 'cancelar')).toBe('cancelado')
    expect(proximoStatus('espera', 'cancelar')).toBe('cancelado')
  })
  it('recusa as invalidas', () => {
    expect(proximoStatus('preparacao', 'entregue')).toBeNull()
    expect(proximoStatus('espera', 'pronto')).toBeNull()
    expect(proximoStatus('entregue', 'cancelar')).toBeNull()
    expect(proximoStatus('cancelado', 'pronto')).toBeNull()
  })
})

describe('atraso', () => {
  it('igual ao maximo nao atrasa', () => {
    expect(estaAtrasado({ status: 'preparacao', criadoEm: criado }, em('20:15:00'), 15)).toBe(false)
  })
  it('passou do maximo atrasa', () => {
    expect(estaAtrasado({ status: 'preparacao', criadoEm: criado }, em('20:15:01'), 15)).toBe(true)
  })
  it('entregue nunca atrasa, espera atrasa', () => {
    expect(estaAtrasado({ status: 'entregue', criadoEm: criado }, em('21:00:00'), 15)).toBe(false)
    expect(estaAtrasado({ status: 'espera', criadoEm: criado }, em('21:00:00'), 15)).toBe(true)
  })
  it('minutosAtraso arredonda para baixo', () => {
    expect(minutosAtraso({ status: 'preparacao', criadoEm: criado }, em('20:19:59'), 15)).toBe(4)
  })
  it('minutosAtraso e 0 quando nao atrasado', () => {
    expect(minutosAtraso({ status: 'preparacao', criadoEm: criado }, em('20:10:00'), 15)).toBe(0)
    expect(minutosAtraso({ status: 'entregue', criadoEm: criado }, em('21:00:00'), 15)).toBe(0)
  })
})

describe('msDecorridos', () => {
  it('nunca e negativo', () => {
    expect(msDecorridos('2026-11-24T21:00:00Z', em('20:00:00'))).toBe(0)
  })
  it('calcula a diferenca', () => {
    expect(msDecorridos(criado, em('20:01:00'))).toBe(60_000)
  })
})

describe('formatarCronometro', () => {
  it('formata mm:ss e h:mm:ss', () => {
    expect(formatarCronometro(0)).toBe('00:00')
    expect(formatarCronometro(65_000)).toBe('01:05')
    expect(formatarCronometro(3_600_000)).toBe('1:00:00')
    expect(formatarCronometro(3_725_000)).toBe('1:02:05')
  })
})

describe('inicioDoDiaSP', () => {
  it('23:30 em SP ainda e o dia anterior', () => {
    expect(inicioDoDiaSP(new Date('2026-11-25T02:30:00Z')).toISOString()).toBe('2026-11-24T03:00:00.000Z')
  })
  it('meia-noite em SP inicia o novo dia', () => {
    expect(inicioDoDiaSP(new Date('2026-11-25T03:00:00Z')).toISOString()).toBe('2026-11-25T03:00:00.000Z')
  })
})

const pedido = (status: Pedido['status']): Pedido => ({
  id: crypto.randomUUID(),
  cliente: 'X',
  status,
  criadoEm: criado,
  prontoEm: null,
  finalizadoEm: null,
  itens: [],
})

describe('contarPedidos', () => {
  it('conta por status', () => {
    const ativos = [pedido('preparacao'), pedido('preparacao'), pedido('espera')]
    const fin = [pedido('entregue'), pedido('entregue'), pedido('entregue'), pedido('cancelado')]
    expect(contarPedidos(ativos, fin)).toEqual({ preparacao: 2, espera: 1, entregue: 3, cancelado: 1 })
  })
})

describe('novoPedidoSchema', () => {
  const base = {
    id: '3f2b8c1e-9d4a-4b6e-8a7c-1d2e3f4a5b6c',
    cliente: 'Maria',
    itens: [{ saborId: 1, quantidade: 2 }],
  }
  const msgs = (v: unknown) => {
    const r = novoPedidoSchema.safeParse(v)
    return r.success ? [] : r.error.issues.map((i) => i.message)
  }

  it('apara o cliente', () => {
    const r = novoPedidoSchema.parse({ ...base, cliente: '  João  ' })
    expect(r.cliente).toBe('João')
  })
  it('cliente vazio falha', () => {
    expect(msgs({ ...base, cliente: '   ' })).toContain('Informe o nome do cliente')
  })
  it('limite de 40 caracteres', () => {
    expect(msgs({ ...base, cliente: 'a'.repeat(41) })).toContain('Nome do cliente com no máximo 40 caracteres')
    expect(novoPedidoSchema.safeParse({ ...base, cliente: 'a'.repeat(40) }).success).toBe(true)
  })
  it('itens vazios falha', () => {
    expect(msgs({ ...base, itens: [] })).toContain('Escolha pelo menos um sabor')
  })
  it('quantidade de 1 a 50', () => {
    for (const q of [0, 51]) {
      expect(msgs({ ...base, itens: [{ saborId: 1, quantidade: q }] })).toContain('Quantidade deve ser de 1 a 50')
    }
    for (const q of [1, 50]) {
      expect(novoPedidoSchema.safeParse({ ...base, itens: [{ saborId: 1, quantidade: q }] }).success).toBe(true)
    }
  })
  it('sabor repetido falha', () => {
    const itens = [
      { saborId: 1, quantidade: 1 },
      { saborId: 1, quantidade: 2 },
    ]
    expect(msgs({ ...base, itens })).toContain('Sabor repetido no pedido')
  })
  it('id nao uuid falha', () => {
    expect(msgs({ ...base, id: 'abc' })).toContain('Identificador do pedido inválido')
  })
})

describe('resumo de itens', () => {
  const itens: ItemPedido[] = [
    { saborId: 1, nomeSabor: 'Carne', quantidade: 2 },
    { saborId: 2, nomeSabor: 'Frango', quantidade: 1 },
  ]
  it('resume e soma', () => {
    expect(resumoItens(itens)).toBe('2 Carne · 1 Frango')
    expect(totalEspetinhos(itens)).toBe(3)
  })
})
