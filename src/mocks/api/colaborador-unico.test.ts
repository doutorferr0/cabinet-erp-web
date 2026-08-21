import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant, getEmployee, listEmployees } from '@/api/gerado'
import { ID_DO_USUARIO_DEMO, colaboradores, idDeColaborador } from '@/mocks/colaboradores'
import { nomeDeApoio } from '@/mocks/lookups'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetCrm } from './crm'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * UMA lista de pessoas, não duas (#276).
 *
 * O defeito que este arquivo segura foi medido no MOCK PURO, sem backend
 * nenhum: `GET /api/employees` servia três nomes escritos à mão em `crm.ts`
 * (Henrique Ferro, Ana Beatriz Lima, Caio Nogueira) e a tela de colaborador lia
 * dez outros de `src/mocks/colaboradores.ts`. **Interseção vazia.** No
 * `cabinetonline.cc`, que é 100% mock, quem abria Atividades escolhia o
 * responsável entre três pessoas e quem abria Colaboradores via dez
 * completamente diferentes.
 *
 * Nenhum teste pegava, porque cada lado tinha o seu e os dois passavam. O que
 * faltava era o teste do CRUZAMENTO, e é só isso que este arquivo é: ele não
 * afirma NOMES — afirma que os dois lados são a mesma lista. Escrever os nomes
 * aqui só mudaria o lugar onde a semente é duplicada.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetCrm()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** O teto do contrato, para a comparação ser do conjunto INTEIRO e não da página. */
const TODAS = { pageSize: 100 } as const

describe('a lista de pessoas do mock é uma só', () => {
  it('`GET /api/employees` devolve exatamente quem a tela de colaborador lista', async () => {
    const resposta = await listEmployees(TODAS)
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    const doServidor = resposta.data.rows.map((c) => `${c.id}|${c.name}`).sort()
    const daTela = colaboradores.map((p) => `${idDeColaborador(p.id)}|${p.nome}`).sort()

    expect(doServidor).toEqual(daTela)
    expect(resposta.data.total).toBe(colaboradores.length)
  })

  it('quem está logado consta da lista — o combo o oferece e a tela dele o mostra', async () => {
    const resposta = await listEmployees(TODAS)
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    // `emp-admin` é o id que `handlers.ts` grava na sessão do mock. Antes da
    // #276 ele existia só no combo: o usuário demo estava logado e não constava
    // do cadastro de quem trabalha aqui.
    const logado = resposta.data.rows.find((c) => c.id === 'emp-admin')
    expect(logado).toBeDefined()
    expect(logado?.name).toBe(colaboradores.find((p) => p.id === ID_DO_USUARIO_DEMO)?.nome)
  })

  it('a listagem publica o RÓTULO do setor e do cargo, não o id do item de apoio', async () => {
    const resposta = await listEmployees(TODAS)
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    const alguem = colaboradores.find((p) => p.setor && p.cargo)
    expect(alguem).toBeDefined()
    const linha = resposta.data.rows.find((c) => c.id === idDeColaborador(alguem?.id ?? 0))

    expect(linha?.sector).toBe(nomeDeApoio(alguem?.setor ?? null))
    expect(linha?.jobTitle).toBe(nomeDeApoio(alguem?.cargo ?? null))
    // O que sai é rótulo de gente, não `lk-SETOR-3`.
    expect(linha?.sector).not.toMatch(/^lk-/)
  })
})

describe('o detalhe do colaborador', () => {
  it('responde para todo id que a listagem devolveu', async () => {
    const lista = await listEmployees(TODAS)
    expect(lista.status).toBe(200)
    if (lista.status !== 200) return

    for (const linha of lista.data.rows) {
      const detalhe = await getEmployee(linha.id)
      expect(detalhe.status).toBe(200)
      if (detalhe.status !== 200) continue
      expect(detalhe.data.name).toBe(linha.name)
    }
  })

  it('publica os DOIS lados do par: o id para gravar e o rótulo para mostrar', async () => {
    const alguem = colaboradores.find((p) => p.setor && p.cargo)
    expect(alguem).toBeDefined()

    const detalhe = await getEmployee(idDeColaborador(alguem?.id ?? 0))
    expect(detalhe.status).toBe(200)
    if (detalhe.status !== 200) return

    expect(detalhe.data.sectorId).toBe(alguem?.setor)
    expect(detalhe.data.sector).toBe(nomeDeApoio(alguem?.setor ?? null))
    expect(detalhe.data.jobTitleId).toBe(alguem?.cargo)
    expect(detalhe.data.jobTitle).toBe(nomeDeApoio(alguem?.cargo ?? null))
    expect(detalhe.data.customerFacing).toBe(alguem?.atendimentoCliente)
    expect(detalhe.data.hiredAt).toBe(alguem?.dataAdmissao)
  })

  it('deixa em BRANCO o que a transcrição não tem, em vez de inventar', async () => {
    const detalhe = await getEmployee('emp-admin')
    expect(detalhe.status).toBe(200)
    if (detalhe.status !== 200) return

    // Preencher estes daria dado de mentira com cara de dado do servidor — é o
    // que o `AvisoDeCobertura` existe para dizer em voz alta.
    expect(detalhe.data.document).toBeNull()
    expect(detalhe.data.email).toBeNull()
    expect(detalhe.data.phone).toBeNull()
    expect(detalhe.data.photoUrl).toBeNull()
    expect(detalhe.data.role).toBeNull()
    expect(detalhe.data.linkActive).toBeNull()
  })

  it('id que não existe é 404, e não um registro em branco', async () => {
    const detalhe = await getEmployee('emp-9999')
    expect(detalhe.status).toBe(404)
  })
})
