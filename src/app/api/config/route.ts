import { z } from 'zod'
import { getDb } from '@/db'
import { lerConfig, salvarConfig } from '@/db/config'
import { json, lerJson, tratarErro } from '../responder'

export const dynamic = 'force-dynamic'

const configSchema = z.object(
  { tempoMaxMin: z.number('Dados inválidos').int('Tempo máximo deve ser um número inteiro') },
  'Dados inválidos',
)

export async function GET(): Promise<Response> {
  try {
    return json(await lerConfig(getDb()), 200, { 'Cache-Control': 'no-store' })
  } catch (e) {
    return tratarErro(e)
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const { tempoMaxMin } = configSchema.parse(await lerJson(req))
    const db = getDb()
    await salvarConfig(db, { tempoMaxMin })
    return json(await lerConfig(db))
  } catch (e) {
    return tratarErro(e)
  }
}
