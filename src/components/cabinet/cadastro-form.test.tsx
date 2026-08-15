import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Modo `Consul.` — transcrição §9 padrão 8. A tela é a mesma do `Alterar`;
 * o que muda é não poder editar nem gravar.
 *
 * A tela exercitada é **Colaborador**: estas asserções precisam de um cadastro
 * que abra registro EXISTENTE, e as três telas de parceiro passaram a ler
 * `GET /api/partners` — sem detalhe por id no contrato, elas só abrem em branco.
 * Colaborador segue mock, com `list`/`get`/`empty`. O objeto sob teste é o
 * `CadastroForm`, que é o mesmo nas duas.
 *
 * **O acoplamento tem preço, e ele apareceu na #101:** o rótulo do campo virou
 * `Nome completo` quando o cadastro passou a ler o schema de módulos, e estas
 * asserções quebraram sem que o `CadastroForm` mudasse uma linha. Se doer de
 * novo, a saída é um formulário de mentira montado aqui — que testaria o objeto
 * sob teste sem depender do rótulo de tela nenhuma.
 */
describe('CadastroForm em modo consulta', () => {
  it('carrega os dados mas desabilita os campos e esconde Gravar', async () => {
    renderRoute('/cadastros/colaboradores/1?modo=consulta')

    const nome = await screen.findByLabelText('Nome completo')
    expect(nome).toHaveValue('CARLA SOUZA')
    expect(nome).toBeDisabled()

    expect(screen.queryByRole('button', { name: /Gravar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fechar/ })).toBeInTheDocument()
    // O modo é CONTEXTO da banda, não sufixo do título: o `<h1>` diz a tela, o
    // Meta ao lado diz em que modo ela está.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cadastro de Colaboradores')
    expect(screen.getByText('Consulta')).toBeInTheDocument()
  })

  // A banda é identidade, não campo: `<fieldset disabled>` apaga o formulário
  // inteiro no modo consulta, e apagar junto o nome da tela deixaria o operador
  // sem saber onde está.
  it('banda de identidade não é desabilitada com o formulário', async () => {
    renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await screen.findByLabelText('Nome completo')
    const banda = screen.getByRole('heading', { level: 1 }).closest('div')
    expect(banda?.closest('fieldset')).toBeNull()
  })

  it('desabilita também os botões de dentro do formulário', async () => {
    renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await screen.findByLabelText('Nome completo')
    // `<fieldset disabled>` alcança botão de busca, não só input.
    expect(screen.getByRole('button', { name: 'Buscar naturalidade' })).toBeDisabled()
  })

  it('sem o search param a tela continua editável', async () => {
    renderRoute('/cadastros/colaboradores/1')

    const nome = await screen.findByLabelText('Nome completo')
    expect(nome).toBeEnabled()
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fechar/ })).not.toBeInTheDocument()
  })

  it('ação Consul. da listagem leva ao modo consulta', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores')

    await user.click(await screen.findByText('CARLA SOUZA'))
    await user.click(screen.getByRole('button', { name: 'Consul.' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores/1')
    })
    expect(router.state.location.search).toEqual({ modo: 'consulta' })
    expect(await screen.findByRole('button', { name: /Fechar/ })).toBeInTheDocument()
  })

  it('ação Alterar da mesma listagem NÃO entra em consulta', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores')

    await user.click(await screen.findByText('CARLA SOUZA'))
    await user.click(screen.getByRole('button', { name: 'Alterar' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores/1')
    })
    expect(router.state.location.search).toEqual({})
  })

  it('grade do documento também fica somente-leitura', async () => {
    renderRoute('/compras/ordens/2?modo=consulta')

    // O total continua sendo calculado e exibido…
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    // …mas nenhuma célula aceita digitação.
    expect(screen.getByLabelText('Quantidade linha 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Busca \(Alt\+T\)/ })).toBeDisabled()
  })

  it('rodapé fixo usa régua forte na borda superior (DESIGN.md)', async () => {
    renderRoute('/cadastros/colaboradores/1')

    const gravar = await screen.findByRole('button', { name: /Gravar/ })
    const rodape = gravar.closest('div')
    // A régua é utility (`rule-strong-top`), não `border-t` + cor na tela: a
    // espessura de 3px é parte dela e muda num ponto só na recalibração.
    expect(rodape?.className).toContain('rule-strong-top')
  })
})
