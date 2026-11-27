import { z } from 'zod'
import { getDb } from '@/db'
import { editarSabor } from '@/db/sabores'
import { erro, json, lerJson, nomeSaborSchema, tratarErro } from '../../responder'

export const dynamic = 'force-dynamic'

const edicaoSchema = z.object(
  {
    nome: nomeSaborSchema.optional(),
    ativo: z.boolean('Dados inválidos').optional(),
    ordem: z.number('Dados inválidos').int('Dados inválidos').optional(),
  },
  'Dados inválidos',
)

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: bruto } = await params
    if (!/^[1-9]\d{0,9}$/.test(bruto)) return erro('Sabor não encontrado', 404)
    const campos = edicaoSchema.parse(await lerJson(req))
    const sabor = await editarSabor(getDb(), Number(bruto), campos)
    return sabor ? json(sabor) : erro('Sabor não encontrado', 404)
  } catch (e) {
    return tratarErro(e)
  }
}
