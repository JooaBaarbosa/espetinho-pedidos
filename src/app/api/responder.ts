import { z, ZodError } from 'zod'
import { ErroValidacao } from '@/db/erros'

export function json(dados: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(dados, { status, headers })
}

export function erro(mensagem: string, status: number): Response {
  return json({ erro: mensagem }, status)
}

/** Corpo JSON; ausente ou malformado vira `undefined` e falha na validação do schema. */
export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return undefined
  }
}

export const nomeSaborSchema = z
  .string('Informe o nome do sabor')
  .trim()
  .min(1, 'Informe o nome do sabor')
  .max(40, 'Nome do sabor com no máximo 40 caracteres')

export function tratarErro(e: unknown): Response {
  if (e instanceof ZodError) return erro(e.issues[0]?.message ?? 'Dados inválidos', 400)
  if (e instanceof ErroValidacao) return erro(e.message, 400)
  console.error(e)
  return erro('Erro inesperado', 500)
}
