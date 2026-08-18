import { camposDoContrato, cliente, fornecedor } from '@/features/cadastro/modulos'
import { parceiro, servidorDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A RECUSA POR CAMPO, do servidor até o controle (issue #138).
 *
 * O `fields[]` do problem+json já vinha do mock e morria na fronteira: o
 * `ErroDoServidor` existia sem consumidor e cada tela imprimia `message` e
 * `detail` colados numa string. O que estes testes travam é o caminho inteiro —
 * o servidor recusa `legalName`, a tela imprime `Razão social` e o clique leva
 * o foco ao campo. Cada elo quebrado dá um sintoma diferente e nenhum aparece
 * na suíte antiga.
 */
describe('recusa por campo chega ao formulário', () => {
  it('o path do contrato sai com o nome que a TELA usa, não com o da API', async () => {
    const { stub } = servidorDeParceiros([parceiro()], {
      camposRecusados: [{ path: 'legalName', message: 'Informe a razão social.' }],
    })
    const { user } = renderRoute('/cadastros/fornecedores/novo', stub)

    await user.type(await screen.findByLabelText('Razão Social'), 'X')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    const aviso = await screen.findByRole('alert')
    // `legalName` é vocabulário de API. Impresso cru, manda o operador procurar
    // na tela uma palavra que não está nela.
    expect(aviso).toHaveTextContent('Razão social')
    expect(aviso).toHaveTextContent('Informe a razão social.')
    expect(aviso).not.toHaveTextContent('legalName')
  })

  it('clicar no campo recusado LEVA o foco até ele', async () => {
    const { stub } = servidorDeParceiros([parceiro()], {
      camposRecusados: [{ path: 'legalName', message: 'Informe a razão social.' }],
    })
    const { user } = renderRoute('/cadastros/fornecedores/novo', stub)

    const razaoSocial = await screen.findByLabelText('Razão Social')
    await user.type(razaoSocial, 'X')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await user.click(await screen.findByRole('button', { name: 'Razão social' }))

    // O formulário rola: quem apertou `Gravar` está no rodapé e o campo
    // recusado pode estar três telas acima. A lista é índice, não decoração.
    expect(razaoSocial).toHaveFocus()
  })

  it('o `title` do servidor e a frase da tela continuam separados', async () => {
    const { stub } = servidorDeParceiros([parceiro()], {
      camposRecusados: [{ path: 'legalName', message: 'Informe a razão social.' }],
    })
    const { user } = renderRoute('/cadastros/fornecedores/novo', stub)

    await user.type(await screen.findByLabelText('Razão Social'), 'X')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Requisição inválida') // title, do servidor
    expect(aviso).toHaveTextContent('Não foi possível gravar este cadastro.') // a tela
    expect(aviso).toHaveTextContent('Confira os campos destacados.') // detail
  })
})

/**
 * O mapa NÃO é escrito à mão em lugar nenhum: sai do mesmo schema que desenha o
 * formulário. Uma tabela paralela envelheceria calada no dia em que um campo
 * trocasse de `dto` — e o sintoma seria o operador voltando a ler o nome da API.
 */
describe('camposDoContrato', () => {
  it('traduz o path do contrato no campo e no rótulo de cada entidade', () => {
    expect(camposDoContrato(fornecedor).legalName).toEqual({
      nome: 'razaoSocial',
      rotulo: 'Razão social',
    })
    // A MESMA chave do contrato, outro campo e outro rótulo na tela do cliente:
    // é exatamente isso que um mapa global não conseguiria dizer.
    expect(camposDoContrato(cliente).legalName).toEqual({
      nome: 'nome',
      rotulo: 'Nome / Razão social',
    })
  })

  it('campo que o servidor não recebe fica de fora', () => {
    const mapa = camposDoContrato(fornecedor)
    // `sigla` existe no formulário e não tem `dto` — o servidor não tem como
    // recusar o que não recebe.
    expect(Object.values(mapa).some((campo) => campo.nome === 'sigla')).toBe(false)
  })
})
