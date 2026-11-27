import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { beforeAll, beforeEach } from 'vitest'
import { getDb } from '@/db'

const urlTeste = process.env.DATABASE_URL_TEST!
const pastaMigracoes = resolve(process.cwd(), 'drizzle')

// A fonte unica dos dados iniciais e a propria migracao de seed.
const seedSql = readFileSync(resolve(pastaMigracoes, '0001_seed.sql'), 'utf8').replaceAll(
  '--> statement-breakpoint',
  '',
)

beforeAll(async () => {
  await migrate(getDb(urlTeste), { migrationsFolder: pastaMigracoes })
})

beforeEach(async () => {
  const db = getDb(urlTeste)
  await db.execute(sql`TRUNCATE itens_pedido, pedidos, sabores, config RESTART IDENTITY CASCADE`)
  await db.execute(sql.raw(seedSql))
})
