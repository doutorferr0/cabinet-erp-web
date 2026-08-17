import { stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * GUARDA: o seletor `Colunas` MEXE na grade.
 *
 * O `ColunasPorModulo` viveu na `main` desde a #104 com três testes verdes e
 * **nenhuma tela o montando** — o único `import` fora do próprio arquivo era o
 * do teste dele. É a mesma classe de falha que a #104 já tinha tido uma vez, e
 * a guarda de filtro (`filtro-chega-na-tela.test.tsx`) não a pega: aquela cobra
 * o que a tela DECLARA, e componente que ninguém monta não é declarado por
 * ninguém.
 *
 * Por isso a asserção aqui atravessa as duas pontas: marcar a caixa no seletor
 * e exigir a COLUNA no cabeçalho da grade. Um teste que só abrisse o painel
 * passaria verde com o `colunasDaGrade` inteiro removido.
 */

function grade() {
  return within(screen.getByRole('table'))
}

describe('a coluna que o operador liga chega à grade', () => {
  // Colaborador é MOCK: o id da coluna é a chave do registro. `Data de
  // admissão` está no schema e NÃO na grade que a tela declara — é exatamente o
  // caso que o seletor existe para resolver.
  it('Colaboradores — ligar `Data de admissão` acrescenta a coluna', async () => {
    const { user } = renderRoute('/cadastros/colaboradores')

    await screen.findByText('Cadastro de Colaboradores')
    expect(grade().queryByRole('columnheader', { name: 'Data de admissão' })).toBeNull()

    await user.click(await screen.findByRole('button', { name: 'Colunas' }))
    await user.click(await screen.findByLabelText('Data de admissão'))

    expect(
      await grade().findByRole('columnheader', { name: 'Data de admissão' }),
    ).toBeInTheDocument()
  })

  // Cliente é HTTP: o id é o nome do contrato (`email`), e não o do schema.
  // Errar a ponta aqui daria coluna vazia em toda linha.
  it('Clientes — ligar `E-mail` acrescenta a coluna', async () => {
    const { user } = renderRoute('/cadastros/clientes', stubDeParceiros())

    await screen.findByText('Cadastro de Clientes')
    expect(grade().queryByRole('columnheader', { name: 'E-mail' })).toBeNull()

    await user.click(await screen.findByRole('button', { name: 'Colunas' }))
    await user.click(await screen.findByLabelText('E-mail'))

    expect(await grade().findByRole('columnheader', { name: 'E-mail' })).toBeInTheDocument()
  })

  // O "fixa" sai da GRADE, não do `col: true` do schema. Setor é coluna
  // declarada pela tela de Colaboradores, então não se desmarca.
  it('coluna que a tela já desenha aparece travada no seletor', async () => {
    const { user } = renderRoute('/cadastros/colaboradores')

    await screen.findByText('Cadastro de Colaboradores')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))

    const setor = await screen.findByLabelText(/^Setor/)
    expect(setor).toBeChecked()
    expect(setor).toBeDisabled()
  })

  // `CPF / CNPJ` é `col: true` no schema do cliente e a listagem NÃO o desenha.
  // Antes da correção o seletor o marcava como fixo — descrevendo uma grade que
  // não existe. Ele tem que ser oferecido, e funcionar.
  it('Clientes — `CPF / CNPJ` é opcional, porque a grade não o traz', async () => {
    const { user } = renderRoute('/cadastros/clientes', stubDeParceiros())

    await screen.findByText('Cadastro de Clientes')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))

    const doc = await screen.findByLabelText('CPF / CNPJ')
    expect(doc).not.toBeChecked()
    expect(doc).not.toBeDisabled()

    await user.click(doc)
    expect(await grade().findByRole('columnheader', { name: 'CPF / CNPJ' })).toBeInTheDocument()
  })
})
