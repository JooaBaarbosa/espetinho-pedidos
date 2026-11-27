export type Status = 'preparacao' | 'espera' | 'entregue' | 'cancelado'
export type Acao = 'pronto' | 'entregue' | 'cancelar'

export interface ItemPedido {
  saborId: number
  nomeSabor: string
  quantidade: number
}

/** Datas em ISO 8601. */
export interface Pedido {
  id: string
  cliente: string
  status: Status
  criadoEm: string
  prontoEm: string | null
  finalizadoEm: string | null
  itens: ItemPedido[]
}

export interface Contadores {
  preparacao: number
  espera: number
  entregue: number
  cancelado: number
}

export interface PainelResposta {
  agora: string
  tempoMaxMin: number
  ativos: Pedido[]
  finalizadosHoje: Pedido[]
  contadores: Contadores
}

export interface Sabor {
  id: number
  nome: string
  ativo: boolean
  ordem: number
}
