import { URL_FUNIS } from '@/data/crm-api'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Cadastro de Funis contra o BACKEND (servidor falso no `fetch`), pelo cliente
 * gerado — mudança de URL, de nome de campo ou da forma da resposta quebra aqui.
 *
 * O que esta tela tem de diferente das outras é o `Gravar` que vira N
 * requisições: o funil num endpoint, cada ETAPA no dela. Por isso os testes
 * olham verbo, caminho e corpo de cada escrita, e não só "gravou".
 */

const ID = '7b7f0c1e-4a1e-4c9a-9b7a-2f1d3c4b5a60'
const ETAPA_ID = 'c1a2b3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const LINHA = { id: ID, name: 'Venda de projeto', sort: 1, isDefault: true, active: true }

const ETAPAS = [
  {
    id: ETAPA_ID,
    pipelineId: ID,
    name: 'Contato',
    sort: 1,
    probability: 100_000, // 10% — int com 4 casas implícitas
    isWon: false,
    isLost: false,
    rotDays: 7,
  },
]

/** Sessão válida + funis; qualquer outro caminho rejeita alto (como o padrão). */
function servidorDeFunis(rotas: Record<string, () => Response> = {}): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())

    const rota = rotas[caminho]
    if (rota) return Promise.resolve(rota())
    if (caminho === URL_FUNIS) return Promise.resolve(json({ rows: [LINHA], total: 1 }))
    if (caminho === `${URL_FUNIS}/${ID}`) return Promise.resolve(json(LINHA))
    if (caminho === `${URL_FUNIS}/${ID}/stages`) return Promise.resolve(json(ETAPAS))

    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

/** Servidor que também ACEITA escrita, guardando verbo, caminho e corpo. */
function servidorComEscrita() {
  const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = []
  const base = servidorDeFunis()

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    // Verbo e corpo vêm do `Request` — o `init` chega vazio (src/test/servidor.ts).
    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const caminho = new URL(requisicao.url, 'http://localhost').pathname
      const texto = await requisicao.clone().text()
      chamadas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      // Criação devolve id; alteração devolve a linha.
      const criado = requisicao.method.toUpperCase() === 'POST'
      if (caminho.endsWith('/stages')) {
        return json({ ...ETAPAS[0], id: criado ? 'etapa-nova' : ETAPA_ID }, criado ? 201 : 200)
      }
      return json({ ...LINHA, id: criado ? 'funil-novo' : ID }, criado ? 201 : 200)
    }
    return base(entrada)
  }

  return { stub, chamadas }
}

describe('listagem de funis', () => {
  it('mostra os funis do servidor, com Padrão e Ativo', async () => {
    renderRoute('/crm/funis', servidorDeFunis())

    expect(await screen.findByText('Venda de projeto')).toBeInTheDocument()
    const linha = screen.getByText('Venda de projeto').closest('tr') as HTMLElement
    expect(within(linha).getByText('Sim')).toBeInTheDocument()
  })

  it('a ordenação usa o nome do campo NO CONTRATO, que é o que o sortBy aceita', async () => {
    const pedidos: string[] = []
    const stub: FetchStub = (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (new URL(url, 'http://localhost').pathname === URL_FUNIS) pedidos.push(url)
      return servidorDeFunis()(entrada)
    }

    const { user } = renderRoute('/crm/funis', stub)
    await screen.findByText('Venda de projeto')
    await user.click(screen.getByRole('button', { name: /Funil/ }))

    await waitFor(() => {
      const ultimo = pedidos[pedidos.length - 1] ?? ''
      expect(new URL(ultimo).searchParams.get('sortBy')).toBe('name')
    })
  })
})

describe('formulário do funil', () => {
  it('abre o Incluir em branco, sem inventar etapa nenhuma', async () => {
    renderRoute('/crm/funis/novo', servidorDeFunis())

    expect(await screen.findByLabelText('Funil')).toHaveValue('')
    // Funil nasce SEM coluna: semear "Contato/Proposta/Ganho" inventaria o
    // modelo de venda da empresa, que é o que muda de empresa para empresa.
    expect(screen.queryByLabelText(/Etapa linha 1/)).not.toBeInTheDocument()
  })

  it('carrega o funil E as etapas — a grade vem do endpoint das colunas', async () => {
    renderRoute(`/crm/funis/${ID}`, servidorDeFunis())

    expect(await screen.findByLabelText('Funil')).toHaveValue('Venda de projeto')
    expect(screen.getByLabelText('Etapa linha 1')).toHaveValue('Contato')
    // Probabilidade: 100000 no contrato = 10,0000% na tela.
    expect(screen.getByLabelText('Probabilidade linha 1')).toHaveValue('10,0000')
  })

  it('incluir funil grava o cabeçalho E a etapa nova, nessa ordem', async () => {
    const { stub, chamadas } = servidorComEscrita()
    const { user } = renderRoute('/crm/funis/novo', stub)

    await user.type(await screen.findByLabelText('Funil'), 'Balcão')
    await user.click(screen.getByRole('button', { name: /Incluir etapa/ }))
    await user.type(screen.getByLabelText('Etapa linha 1'), 'Atendimento')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(chamadas).toHaveLength(2))

    // O funil vem PRIMEIRO: no Incluir, o id que a etapa pendura só existe
    // depois do 201.
    expect(chamadas[0]).toMatchObject({ metodo: 'POST', caminho: URL_FUNIS })
    expect(chamadas[0]?.corpo).toMatchObject({ name: 'Balcão', isDefault: false, active: true })

    expect(chamadas[1]).toMatchObject({
      metodo: 'POST',
      caminho: `${URL_FUNIS}/funil-novo/stages`,
    })
    expect(chamadas[1]?.corpo).toMatchObject({ name: 'Atendimento', isWon: false, isLost: false })
  })

  it('etapa INTOCADA não vira requisição — só o funil é gravado', async () => {
    const { stub, chamadas } = servidorComEscrita()
    const { user } = renderRoute(`/crm/funis/${ID}`, stub)

    const nome = await screen.findByLabelText('Funil')
    await user.clear(nome)
    await user.type(nome, 'Venda de projeto — 2027')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0]).toMatchObject({ metodo: 'PUT', caminho: `${URL_FUNIS}/${ID}` })
    expect(chamadas.some((c) => c.caminho.includes('/stages'))).toBe(false)
  })

  it('editar a etapa manda PUT no endpoint DELA, com o id da linha', async () => {
    const { stub, chamadas } = servidorComEscrita()
    const { user } = renderRoute(`/crm/funis/${ID}`, stub)

    const etapa = await screen.findByLabelText('Etapa linha 1')
    await user.clear(etapa)
    await user.type(etapa, 'Primeiro contato')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(chamadas).toHaveLength(2))
    const escrita = chamadas.find((c) => c.caminho.includes('/stages'))
    expect(escrita?.metodo).toBe('PUT')
    expect(escrita?.caminho).toBe(`${URL_FUNIS}/${ID}/stages/${ETAPA_ID}`)
    // `PUT` substitui o estágio inteiro: o que a tela não edita viaja junto.
    expect(escrita?.corpo).toEqual({
      name: 'Primeiro contato',
      sort: 1,
      probability: 100_000,
      isWon: false,
      isLost: false,
      rotDays: 7,
    })
  })

  it('modo consulta abre sem Gravar', async () => {
    renderRoute(`/crm/funis/${ID}?modo=consulta`, servidorDeFunis())

    expect(await screen.findByLabelText('Funil')).toHaveValue('Venda de projeto')
    expect(screen.queryByRole('button', { name: 'Gravar' })).not.toBeInTheDocument()
  })
})
