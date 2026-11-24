import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

const bancos = new Map<string, Db>()

/** Um Pool por URL, reaproveitado entre chamadas. */
export function getDb(url: string = process.env.DATABASE_URL!): Db {
  let db = bancos.get(url)
  if (!db) {
    db = drizzle(new Pool({ connectionString: url }), { schema })
    bancos.set(url, db)
  }
  return db
}
