import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * CONSULTA ABRE A FICHA, NÃO O FORMULÁRIO APAGADO (issue #103).
 *
 * Pela rota de verdade, e no Cliente: é a entidade cujo detalhe vem do servidor
 * (`GET /api/partners/{id}`), então o teste atravessa rota, fronteira de dados e
 * ficha juntos — que é onde o componente pronto e nunca montado se esconde. A
 * ficha ficou uma janela inteira em `main` sem nenhuma tela a usar.
 *
 * O que ele trava, em uma frase: **`?modo=consulta` não devolve campo de
 * digitação**, e o lápis de um módulo abre a edição JÁ naquele módulo.
 *
 * ## O que a Reface 2.0 acrescentou aqui (D19, #487)
 *
 * A ficha passou a usar o mesmo esqueleto das telas de documento: cabeçalho do
 * REGISTRO (entidade no singular + código em mono + situação), coluna lateral
 * de consulta (identidade e resumo) e uma PRÓXIMA AÇÃO que não é `Alterar`.
 * Os casos novos travam as três coisas que a migração pode desfazer sem
 * ninguém notar: o nome do registro não pode passar a aparecer três vezes, a
 * primária tem de ser a transição de estado (não o gesto de sempre), e
 * `Desativar` tem de passar pela confirmação antes de gravar.
 */

const CLIENTE = '7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70'

function servidor() {
  return stubDeParceiros([
    parceiro({
      id: CLIENTE,
      legalName: 'ANDRÉ BATALHA',
      document: '12345678909',
      email: 'andre@teste.com.br',
      isCustomer: true,
      isSupplier: false,
    }),
  ])
}

describe('ficha do cliente em consulta', () => {
  it('lê por módulos, sem campo de digitação', async () => {
    renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    // Duas vezes na tela, e as duas de propósito: o cartão de identidade da
    // lateral diz que registro está aberto, o módulo `Identificação` diz o
    // valor do campo. O CABEÇALHO não conta — ele diz `Cliente`, a entidade,
    // não o nome de quem está aberto; se um dia contar três, é porque o nome
    // voltou para o título e a lateral virou repetição.
    expect(await screen.findAllByText('ANDRÉ BATALHA')).toHaveLength(2)
    // O nome do campo é rótulo de LEITURA, não `<label>` de controle: procurar
    // por `findByLabelText('Nome')` acharia o formulário, que é o que saiu.
    expect(screen.getByText('Nome / Razão social')).toBeInTheDocument()
    // Dentro da PÁGINA, não do documento: o shell tem a busca da barra lateral,
    // e ela é navegação da aplicação, não campo do cadastro.
    const pagina = document.querySelector('[data-slot="ficha-de-cadastro"]') as HTMLElement
    expect(within(pagina).queryByRole('textbox')).not.toBeInTheDocument()

    // Módulo sem nenhum dado não some da tela: fica recolhido, com o convite.
    expect(screen.getByRole('button', { name: 'Preencher Endereço' })).toBeInTheDocument()
  })

  it('o lápis do módulo abre a edição com AQUELE módulo aberto', async () => {
    const { router, user } = renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    await user.click(
      await screen.findByRole('button', { name: 'Preencher Documentos e dados pessoais' }),
    )

    // Saiu da consulta (o `modo` não viaja junto) e disse qual módulo quer.
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ modulo: 'documentos' })
    })

    // E o bloco correspondente do formulário nasce ABERTO — sem isto o lápis
    // entregaria o formulário inteiro com o módulo pedido ainda fechado, que é
    // exatamente a fricção que a ficha existe para tirar.
    const bloco = await screen.findByRole('button', { name: 'Documentos e dados pessoais' })
    expect(bloco).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByLabelText('RG')).toBeInTheDocument()

    // Os outros opcionais continuam fechados: o foco é em UM módulo.
    expect(screen.getByRole('button', { name: 'Fiscal' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('Alterar sem módulo abre o formulário inteiro, como sempre', async () => {
    const { router, user } = renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    await user.click(await screen.findByRole('button', { name: /^Alterar$/ }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({})
    })
    expect(await screen.findByLabelText('Nome')).toHaveValue('ANDRÉ BATALHA')
  })

  it('o cabeçalho é do REGISTRO: entidade, código e situação', async () => {
    renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    // A entidade no singular, não o nome da tela. `Cadastro de Clientes` dizia
    // onde o operador está, e quem abriu uma ficha já sabe.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Cliente')
    // O código sai do `PartnerDto.code`, ao lado do título e em mono.
    expect(document.querySelector('[data-slot="registro-id"]')).toHaveTextContent('F001')
    // Dentro do CABEÇALHO: `Ativo` também é o rótulo do campo homônimo no
    // módulo `Identificação`, e uma busca solta acharia os dois.
    // O cabeçalho de registro É o `PageHeader` na variante `registro` desde a
    // D5 — a variante é que diz o papel, e um segundo `data-slot` para a mesma
    // peça daria dois nomes à mesma coisa (D37).
    const cabecalho = document.querySelector(
      '[data-slot="page-header"][data-variante="registro"]',
    ) as HTMLElement
    expect(within(cabecalho).getByText('Ativo')).toBeInTheDocument()
  })

  it('a primária é a transição de estado, e Alterar desceu para secundária', async () => {
    renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    // `Alterar` é o gesto de SEMPRE — vale em todo estado, então não é o
    // próximo passo deste registro. O próximo passo de um cadastro ativo é
    // tirá-lo de circulação.
    const primaria = await waitFor(() => {
      const botao = document.querySelector('[data-slot="page-header-primaria"]')
      expect(botao).not.toBeNull()
      return botao as HTMLElement
    })
    expect(primaria).toHaveTextContent('Desativar')
    expect(screen.getByRole('button', { name: /^Alterar$/ })).not.toBe(primaria)
  })

  it('Desativar pergunta antes de gravar', async () => {
    const { user } = renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    await user.click(await screen.findByRole('button', { name: 'Desativar' }))

    // A confirmação é `confirmar-desativacao`, a mesma da listagem: desativar
    // tira o cadastro das telas que o usam, e um clique sem parada some com ele
    // sem o operador ler o que some.
    expect(await screen.findByText('Desativar cliente?')).toBeInTheDocument()
  })

  it('a lateral NÃO repete o que os módulos já dizem', async () => {
    renderRoute(`/cadastros/clientes/${CLIENTE}?modo=consulta`, servidor())

    // O cartão de identidade traz nome, documento e cidade — a resposta de
    // relance a "quem está aberto".
    expect(await screen.findByText('Identidade')).toBeInTheDocument()

    // E o cartão `Resumo` NÃO monta no cliente. É decisão medida, não falta:
    // "em aberto / últimos registros" só é consultável por `supplierId`
    // (fornecedor); por cliente não há filtro em `/api/quotes` nem em
    // `/api/orders`. Preencher com campo do cadastro daria duas fontes para a
    // mesma pergunta — ver `features/parceiro/ficha-resumo.tsx`.
    expect(screen.queryByText('Resumo')).not.toBeInTheDocument()
  })
})
