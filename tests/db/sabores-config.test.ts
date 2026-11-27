import { describe, expect, it } from 'vitest'
import { getDb } from '@/db'
import { ErroValidacao } from '@/db/pedidos'
import { criarSabor, editarSabor, listarSabores } from '@/db/sabores'
import { lerConfig, salvarConfig } from '@/db/config'

const db = getDb(process.env.DATABASE_URL_TEST!)

describe('sabores', () => {
  it('cria com ordem max+1 e rejeita duplicado', async () => {
    const s = await criarSabor(db, 'Pão de alho')
    expect(s).toMatchObject({ nome: 'Pão de alho', ativo: true, ordem: 11 })
    await expect(criarSabor(db, 'Pão de alho')).rejects.toThrow(ErroValidacao)
    await expect(criarSabor(db, 'Pão de alho')).rejects.toThrow('Sabor já existe')
  })

  it('lista sem inativos por padrão e com inativos sob opção', async () => {
    const todos = await listarSabores(db)
    await editarSabor(db, todos[0]!.id, { ativo: false })
    expect(await listarSabores(db)).toHaveLength(9)
    expect(await listarSabores(db, { incluirInativos: true })).toHaveLength(10)
  })

  it('edita campos e devolve null para id inexistente', async () => {
    const [primeiro] = await listarSabores(db)
    const r = await editarSabor(db, primeiro!.id, { nome: 'Carne bovina', ordem: 20 })
    expect(r).toMatchObject({ nome: 'Carne bovina', ordem: 20 })
    expect(await editarSabor(db, 99999, { nome: 'X' })).toBeNull()
  })

  it('renomear para nome já existente rejeita', async () => {
    const [a, b] = await listarSabores(db)
    await expect(editarSabor(db, a!.id, { nome: b!.nome })).rejects.toThrow('Sabor já existe')
  })
})

describe('config', () => {
  it('rejeita fora de 1..120 e grava 20', async () => {
    await expect(salvarConfig(db, { tempoMaxMin: 0 })).rejects.toThrow(ErroValidacao)
    await expect(salvarConfig(db, { tempoMaxMin: 121 })).rejects.toThrow(ErroValidacao)
    await expect(salvarConfig(db, { tempoMaxMin: 1.5 })).rejects.toThrow(ErroValidacao)
    await salvarConfig(db, { tempoMaxMin: 20 })
    expect(await lerConfig(db)).toEqual({ tempoMaxMin: 20 })
  })
})
