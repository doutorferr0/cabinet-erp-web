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

    // Duas vezes na tela, e as duas de propósito: a banda de identidade diz que
    // registro está aberto, o módulo `Identificação` diz o valor do campo.
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
})
