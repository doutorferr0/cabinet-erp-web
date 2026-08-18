import { URL_PRODUTOS } from '@/data/produtos-api'
import { servidorDeOrcamentos } from '@/test/orcamentos'
import { stubDeParceiros } from '@/test/parceiros'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * GUARDA de uma CLASSE de falha, não de um caso.
 *
 * A #104 foi dada como entregue com a faixa de filtro por módulo **nunca
 * desenhada na tela**: a `VitraDataTable` só monta o bloco de filtro quando a
 * tela declara a whitelist (`filtros`), e a listagem de Profissional passava só
 * `modoDeFiltro` + `entidadeDoSchema`. O defeito sobreviveu porque a cobertura
 * montava o `FiltroPorModulo` DIRETO — componente verde, tela quebrada.
 *
 * **Presença do botão não serve como asserção.** Quando a guarda reprova, a
 * barra cai no botão genérico de ação, com o mesmo rótulo `Filtro` e a mesma
 * aparência — só que morto. A primeira versão deste teste asseria o botão e
 * passou verde com a prop removida de propósito. Por isso a asserção é
 * COMPORTAMENTAL: clicar e exigir que o painel real abra.
 *
 * Desde o #179 as listagens têm DUAS formas de controle, e o teste cobra a que
 * cada tela escolheu: os quatro cadastros de parceiro/colaborador desenham a
 * faixa de chips por módulo; as demais, as pílulas com o `Adicionar filtro`
 * (#199).
 * Trocar a forma sem trocar a asserção deixaria o teste verde sobre tela morta
 * de novo — as duas foram revalidadas por mutação nas duas props que guardam o
 * bloco (`filtros` e `entidadeDoSchema`), cada uma vermelha só na tela mutada.
 */
/** Produtos fala HTTP: a listagem só monta com a sessão e a página respondidas. */
const servidorDeProdutos: FetchStub = (entrada) => {
  const url = String(entrada instanceof Request ? entrada.url : entrada)
  const caminho = new URL(url, 'http://localhost').pathname
  if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
  if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
  if (caminho === URL_PRODUTOS) return Promise.resolve(json({ rows: [], total: 0 }))
  return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
}

/** Pílulas (#199): o `Adicionar filtro` abre a lista de campos filtráveis. */
async function exigeFiltroVivo(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: /^Adicionar filtro/ }))
  expect(await screen.findByPlaceholderText('Buscar campo…')).toBeInTheDocument()
}

/**
 * Modo por módulo (#104): não há botão `Filtro` — há a faixa de chips, e cada
 * chip abre o painel do seu módulo. Mesma exigência de sempre: não basta o chip
 * existir, ele tem que ABRIR.
 */
async function exigeFaixaDeModulo(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: /Identificação/ }))
  expect(await screen.findByText(/^Filtros de /)).toBeInTheDocument()
}

describe('toda listagem que declara filtro desenha o controle na tela', () => {
  it('Clientes', async () => {
    const { user } = renderRoute('/cadastros/clientes', stubDeParceiros())
    await exigeFaixaDeModulo(user)
  })

  it('Fornecedores', async () => {
    const { user } = renderRoute('/cadastros/fornecedores', stubDeParceiros())
    await exigeFaixaDeModulo(user)
  })

  it('Colaboradores', async () => {
    const { user } = renderRoute('/cadastros/colaboradores')
    await exigeFaixaDeModulo(user)
  })

  it('Profissionais', async () => {
    const { user } = renderRoute('/cadastros/profissionais', stubDeParceiros())
    await exigeFaixaDeModulo(user)
  })

  it('Pedidos de compra', async () => {
    const { user } = renderRoute('/compras/pedidos')
    await exigeFiltroVivo(user)
  })

  it('Ordens de compra', async () => {
    const { user } = renderRoute('/compras/ordens')
    await exigeFiltroVivo(user)
  })

  it('Orçamentos', async () => {
    const { user } = renderRoute('/vendas/orcamentos', servidorDeOrcamentos())
    await exigeFiltroVivo(user)
  })

  it('Produtos', async () => {
    const { user } = renderRoute('/cadastros/produtos', servidorDeProdutos)
    await exigeFiltroVivo(user)
  })
})

/**
 * Ficam FORA por não declararem filtro, e é decisão de tela, não lacuna:
 * `/crm/funis` e `/crm/motivos` são cadastros curtos, de poucas linhas, onde a
 * busca livre já responde. Incluí-los aqui exigiria painel de filtro em tela que
 * não pede um — o oposto do que este arquivo protege.
 *
 * O funil de oportunidades (`/crm/funil/$funilId`) declara `filtros` com lista
 * não-vazia, então satisfaz a guarda; a cobertura de rota dele já existe em
 * `apodrecimento.test.tsx` e no teste do quadro.
 */
