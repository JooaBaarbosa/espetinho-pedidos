import { eq } from 'drizzle-orm'
import type { Db } from '.'
import { ErroValidacao } from './erros'
import { config } from './schema'

export async function lerConfig(db: Db): Promise<{ tempoMaxMin: number }> {
  const [linha] = await db.select().from(config).where(eq(config.id, 1))
  return { tempoMaxMin: linha?.tempoMaxMin ?? 15 }
}

export async function salvarConfig(db: Db, { tempoMaxMin }: { tempoMaxMin: number }): Promise<void> {
  if (!Number.isInteger(tempoMaxMin) || tempoMaxMin < 1 || tempoMaxMin > 120) {
    throw new ErroValidacao('Tempo máximo deve ser de 1 a 120 minutos')
  }
  await db
    .insert(config)
    .values({ id: 1, tempoMaxMin })
    .onConflictDoUpdate({ target: config.id, set: { tempoMaxMin } })
}
