import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const statusPedido = pgEnum('status_pedido', ['preparacao', 'espera', 'entregue', 'cancelado'])

export const sabores = pgTable('sabores', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull().unique(),
  ativo: boolean('ativo').notNull().default(true),
  ordem: integer('ordem').notNull(),
})

export const pedidos = pgTable(
  'pedidos',
  {
    id: uuid('id').primaryKey(),
    cliente: text('cliente').notNull(),
    status: statusPedido('status').notNull().default('preparacao'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    prontoEm: timestamp('pronto_em', { withTimezone: true }),
    finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
  },
  (t) => [index('pedidos_status_criado_idx').on(t.status, t.criadoEm)],
)

export const itensPedido = pgTable(
  'itens_pedido',
  {
    id: serial('id').primaryKey(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidos.id),
    saborId: integer('sabor_id')
      .notNull()
      .references(() => sabores.id),
    nomeSabor: text('nome_sabor').notNull(),
    quantidade: integer('quantidade').notNull(),
  },
  (t) => [check('itens_pedido_quantidade_check', sql`${t.quantidade} between 1 and 50`)],
)

export const config = pgTable('config', {
  id: integer('id').primaryKey(),
  tempoMaxMin: integer('tempo_max_min').notNull().default(15),
})
