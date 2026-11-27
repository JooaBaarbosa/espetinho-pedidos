import { z } from 'zod'
import { getDb } from '@/db'
import { criarSabor, listarSabores } from '@/db/sabores'
import { json, lerJson, nomeSaborSchema, tratarErro } from '../responder'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  try {
    const todos = new URL(req.url).searchParams.get('todos') === '1'
    return json(await listarSabores(getDb(), { incluirInativos: todos }), 200, {
      'Cache-Control': 'no-store',
    })
  } catch (e) {
    return tratarErro(e)
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { nome } = z.object({ nome: nomeSaborSchema }, 'Dados inválidos').parse(await lerJson(req))
    return json(await criarSabor(getDb(), nome), 201)
  } catch (e) {
    return tratarErro(e)
  }
}
