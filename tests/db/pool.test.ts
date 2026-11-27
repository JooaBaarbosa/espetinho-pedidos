import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '@/db'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pool do Postgres', () => {
  it("erro de conexão ociosa ('error' no pool) é registrado e não derruba o processo", () => {
    const pool = getDb(process.env.DATABASE_URL_TEST!).$client
    const registro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const erro = new Error('conexão encerrada pelo servidor')
    expect(() => pool.emit('error', erro)).not.toThrow()
    expect(registro).toHaveBeenCalledWith('Erro no pool do Postgres', erro)
  })

  it('usa no máximo 5 conexões e solta as ociosas em 10 s', () => {
    const pool = getDb(process.env.DATABASE_URL_TEST!).$client
    expect(pool.options.max).toBe(5)
    expect(pool.options.idleTimeoutMillis).toBe(10_000)
  })
})
