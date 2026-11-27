import { asc, eq, sql } from 'drizzle-orm'
import type { Sabor } from '@/lib/tipos'
import type { Db } from '.'
import { ErroValidacao } from './erros'
import { sabores } from './schema'

const MSG_DUPLICADO = 'Sabor já existe'

function violouUnico(e: unknown): boolean {
  const causa = (e as { cause?: { code?: string }; code?: string }) ?? {}
  return causa.code === '23505' || causa.cause?.code === '23505'
}

export async function listarSabores(db: Db, opts: { incluirInativos?: boolean } = {}): Promise<Sabor[]> {
  const consulta = db.select().from(sabores)
  const linhas = await (opts.incluirInativos
    ? consulta
    : consulta.where(eq(sabores.ativo, true))
  ).orderBy(asc(sabores.ordem), asc(sabores.id))
  return linhas
}

export async function criarSabor(db: Db, nome: string): Promise<Sabor> {
  const limpo = nome.trim()
  if (!limpo) throw new ErroValidacao('Informe o nome do sabor')
  try {
    const [linha] = await db
      .insert(sabores)
      .values({ nome: limpo, ordem: sql`(select coalesce(max(${sabores.ordem}), 0) + 1 from ${sabores})` })
      .returning()
    return linha!
  } catch (e) {
    if (violouUnico(e)) throw new ErroValidacao(MSG_DUPLICADO)
    throw e
  }
}

export async function editarSabor(
  db: Db,
  id: number,
  campos: Partial<Pick<Sabor, 'nome' | 'ativo' | 'ordem'>>,
): Promise<Sabor | null> {
  const mudancas = { ...campos }
  if (mudancas.nome !== undefined) {
    mudancas.nome = mudancas.nome.trim()
    if (!mudancas.nome) throw new ErroValidacao('Informe o nome do sabor')
  }
  if (Object.keys(mudancas).length === 0) {
    const [atual] = await db.select().from(sabores).where(eq(sabores.id, id))
    return atual ?? null
  }
  try {
    const [linha] = await db.update(sabores).set(mudancas).where(eq(sabores.id, id)).returning()
    return linha ?? null
  } catch (e) {
    if (violouUnico(e)) throw new ErroValidacao(MSG_DUPLICADO)
    throw e
  }
}
