import { z } from 'zod'
import type { Acao, Contadores, ItemPedido, Pedido, Status } from './tipos'

const TRANSICOES: Record<Status, Partial<Record<Acao, Status>>> = {
  preparacao: { pronto: 'espera', cancelar: 'cancelado' },
  espera: { entregue: 'entregue', cancelar: 'cancelado' },
  entregue: {},
  cancelado: {},
}

export function proximoStatus(atual: Status, acao: Acao): Status | null {
  return TRANSICOES[atual][acao] ?? null
}

export function msDecorridos(criadoEm: string, agora: Date): number {
  return Math.max(0, agora.getTime() - new Date(criadoEm).getTime())
}

type AtrasoBase = Pick<Pedido, 'status' | 'criadoEm'>

export function estaAtrasado(p: AtrasoBase, agora: Date, tempoMaxMin: number): boolean {
  if (p.status !== 'preparacao' && p.status !== 'espera') return false
  return msDecorridos(p.criadoEm, agora) > tempoMaxMin * 60_000
}

export function minutosAtraso(p: AtrasoBase, agora: Date, tempoMaxMin: number): number {
  if (!estaAtrasado(p, agora, tempoMaxMin)) return 0
  return Math.floor((msDecorridos(p.criadoEm, agora) - tempoMaxMin * 60_000) / 60_000)
}

export function formatarCronometro(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const dois = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
}

const FUSO_SP = 'America/Sao_Paulo'

/** Deslocamento (ms) do fuso de SP em relacao ao UTC no instante dado (negativo a oeste). */
function offsetSP(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_SP,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante)
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'))
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000
}

/** Meia-noite local de Sao Paulo do dia de `agora`, como instante UTC. */
export function inicioDoDiaSP(agora: Date): Date {
  const [ano, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_SP })
    .format(agora)
    .split('-')
    .map(Number) as [number, number, number]
  const meiaNoiteComoUtc = Date.UTC(ano, mes - 1, dia)
  // Duas passadas cobrem mudancas de offset (horario de verao historico).
  let inicio = meiaNoiteComoUtc - offsetSP(new Date(meiaNoiteComoUtc))
  inicio = meiaNoiteComoUtc - offsetSP(new Date(inicio))
  return new Date(inicio)
}

export function contarPedidos(ativos: Pedido[], finalizadosHoje: Pedido[]): Contadores {
  const c: Contadores = { preparacao: 0, espera: 0, entregue: 0, cancelado: 0 }
  for (const p of [...ativos, ...finalizadosHoje]) c[p.status] += 1
  return c
}

const MSG_QTD = 'Quantidade deve ser de 1 a 50'

export const novoPedidoSchema = z.object({
  id: z.uuid('Identificador do pedido inválido'),
  cliente: z
    .string('Informe o nome do cliente')
    .trim()
    .min(1, 'Informe o nome do cliente')
    .max(40, 'Nome do cliente com no máximo 40 caracteres'),
  itens: z
    .array(
      z.object({
        saborId: z.number().int(),
        quantidade: z.number(MSG_QTD).int(MSG_QTD).min(1, MSG_QTD).max(50, MSG_QTD),
      }),
    )
    .min(1, 'Escolha pelo menos um sabor')
    .refine((itens) => new Set(itens.map((i) => i.saborId)).size === itens.length, {
      message: 'Sabor repetido no pedido',
    }),
})

export type NovoPedido = z.infer<typeof novoPedidoSchema>

export function resumoItens(itens: ItemPedido[]): string {
  return itens.map((i) => `${i.quantidade} ${i.nomeSabor}`).join(' · ')
}

export function totalEspetinhos(itens: ItemPedido[]): number {
  return itens.reduce((soma, i) => soma + i.quantidade, 0)
}
