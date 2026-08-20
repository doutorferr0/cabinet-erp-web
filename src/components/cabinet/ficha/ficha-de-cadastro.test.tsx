import { colaborador as esquemaColaborador } from '@/features/cadastro/modulos'
import { parceiro, servidorDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A FICHA LIGADA NA ROTA (issue #103) — pelas rotas de verdade, não pelo
 * componente isolado.
 *
 * `FichaDeModulos` já tem teste próprio (paridade com o schema, módulo vazio,
 * "não informado"); o que ESTE arquivo prova é a outra metade, a que faltava:
 * **que `Consul.` chega nela**. O componente ficou órfão na `main` desde o PR
 * #137 — importado só pelo próprio teste — e órfão nenhum teste de unidade
 * denuncia. É a mesma classe de falha da #104: prop declarada, bloco nunca
 * renderizado, suíte verde.
 */

const CLIENTE = '11111111-1111-4111-8111-111111111111'

describe('modo consulta mostra a ficha, não o formulário', () => {
  it('colaborador: valores como texto, sem campo para digitar', async () => {
    const { container } = renderRoute('/cadastros/colaboradores/1?modo=consulta')

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Cadastro de Colaboradores',
    )
    // O nome aparece DUAS vezes, e as duas contam: no contexto da banda (quem
    // está aberto) e no par de leitura do módulo (o valor do campo `nome`).
    const identificacao = container.querySelector('[data-modulo-id="identificacao"]')
    expect(identificacao).not.toBeNull()
    expect(within(identificacao as HTMLElement).getByText('CARLA SOUZA')).toBeInTheDocument()

    // A prova de que não é mais o formulário desabilitado: o campo não existe.
    // Antes desta PR ele existia, com `disabled`, e o operador percorria 40
    // controles apagados para ler quatro linhas.
    expect(screen.queryByLabelText('Nome completo')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Buscar naturalidade' })).toBeNull()

    // UMA saída, e uma só (#235). A ficha era a única tela que trazia a sua
    // própria (`Fechar`, no cabeçalho); com o `Voltar` da folha, mantê-la daria
    // dois botões que fazem a mesma coisa a três centímetros um do outro. Esta
    // contagem é o que reprova quem devolver o `voltar` ao `PageHeader`.
    expect(screen.getAllByRole('button', { name: /^(Voltar|Fechar)$/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Gravar/ })).toBeNull()
  })

  it('a ficha tem uma seção por módulo do schema — nem a mais, nem a menos', async () => {
    const { container } = renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await screen.findByRole('heading', { level: 1 })
    const secoes = [...container.querySelectorAll('[data-modulo-id]')].map(
      (secao) => secao.getAttribute('data-modulo-id') ?? '',
    )
    expect(secoes).toEqual(esquemaColaborador.modulos.map((modulo) => modulo.id))
  })

  it('módulo sem nada dentro convida a preencher', async () => {
    renderRoute('/cadastros/colaboradores/1?modo=consulta')

    // `Metas e comissão` é feito só de campos que o repo ainda não guarda
    // (`campo` ausente no schema): vazio de verdade, e a ficha o diz.
    expect(await screen.findByRole('button', { name: 'Preencher Metas e comissão' })).toBeVisible()
  })

  it('o lápis do módulo leva de volta à edição, dizendo qual módulo', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await user.click(await screen.findByRole('button', { name: 'Alterar Identificação' }))

    // O `modo` não viaja (sair da consulta é a ação) e o `modulo` viaja: é ele
    // que abre AQUELE bloco na edição, em vez do formulário inteiro fechado.
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ modulo: 'identificacao' })
    })
    expect(router.state.location.pathname).toBe('/cadastros/colaboradores/1')
    // E na edição o formulário volta, editável.
    expect(await screen.findByLabelText('Nome completo')).toBeEnabled()
  })

  it('a saída da folha volta para a listagem', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await user.click(await screen.findByRole('button', { name: 'Voltar' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
  })

  it('sem o search param a tela continua sendo o formulário', async () => {
    renderRoute('/cadastros/colaboradores/1')

    expect(await screen.findByLabelText('Nome completo')).toBeEnabled()
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()
  })

  /**
   * As três telas de parceiro leem HTTP, e a ficha precisa do registro TRADUZIDO
   * pelo papel — não do `PartnerDto` cru. Cliente é a que menos tem campo
   * coberto pelo contrato, então é onde o "não informado" mais aparece: se a
   * tradução falhasse, a ficha renderizaria tudo vazio e ainda assim montaria.
   */
  it('cliente (HTTP): a ficha lê o registro traduzido pelo papel', async () => {
    const { stub } = servidorDeParceiros([
      parceiro({ id: CLIENTE, legalName: 'ESTÚDIO FERRARI', isCustomer: true, isSupplier: false }),
    ])
    const { container } = renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, stub)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Cadastro de Clientes',
    )
    await waitFor(() => {
      const identificacao = container.querySelector('[data-modulo-id="identificacao"]')
      expect(identificacao).not.toBeNull()
      // `legalName` do DTO chega ao campo `nome` do schema — é o papel que traduz.
      expect(within(identificacao as HTMLElement).getByText('ESTÚDIO FERRARI')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Gravar/ })).toBeNull()

    // Campo que o `PartnerDto` não publica fica declarado, não sumido — é a
    // mesma economia do `AvisoDeCobertura`, dentro do módulo.
    expect(screen.getAllByText('não informado').length).toBeGreaterThan(0)
  })
})
