import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

const bancos = new Map<string, Db>()

/**
 * Um Pool por URL, reaproveitado entre chamadas. Pequeno e com conexões ociosas soltas
 * cedo (funções serverless). O listener de 'error' evita que a queda de uma conexão
 * ociosa derrube o processo.
 */
export function getDb(url: string = process.env.DATABASE_URL!): Db {
  let db = bancos.get(url)
  if (!db) {
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 })
    pool.on('error', (e) => console.error('Erro no pool do Postgres', e))
    db = drizzle(pool, { schema })
    bancos.set(url, db)
  }
  return db
}
