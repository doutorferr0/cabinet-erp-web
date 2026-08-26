import { stubDeColaboradores } from '@/test/colaboradores'
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
  /**
   * INVERTIDO em 2026-08-25, e a inversão é o assunto do caso.
   *
   * Ele provava que ligar `Data de admissão` acrescentava a coluna — Colaborador
   * era MOCK, o provider em memória resolvia qualquer campo do schema, e o
   * seletor podia oferecer tudo.
   *
   * Com a listagem em `GET /api/employees`, a LINHA é o `EmployeeDto`, que tem
   * CINCO campos: `id`, `name`, `sector`, `jobTitle`, `active`. A admissão só
   * existe no `EmployeeDetailDto`, isto é, na ficha. **Oferecê-la aqui daria uma
   * coluna vazia em toda linha**, e o operador leria isso como "ninguém tem data
   * de admissão" — pior que não ter a coluna, porque parece dado.
   *
   * O caso vale mais invertido do que valia antes: ele agora guarda a regra que
   * o `dto:`/`whitelist` do schema existe para impor. Volta ao que era no dia em
   * que a listagem publicar o campo.
   */
  it('Colaboradores — `Data de admissão` NÃO é oferecida: a listagem não a traz', async () => {
    const { user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))

    expect(screen.queryByLabelText('Data de admissão')).not.toBeInTheDocument()
    // …e o que a listagem TRAZ continua no seletor. Sem esta metade, o caso
    // passaria com o seletor inteiro vazio.
    expect(await screen.findByLabelText(/^Cargo/)).toBeInTheDocument()
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
    const { user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))

    const setor = await screen.findByLabelText(/^Setor/)
    expect(setor).toBeChecked()
    expect(setor).toBeDisabled()
  })

  // O ponto de cor faz a resposta do seletor ("de onde vem esta coluna")
  // sobreviver ao fechamento dele. Vale para a coluna que a TELA declara, e não
  // só para a que o operador ligou.
  it('Clientes — o cabeçalho marca a coluna com a cor do módulo de origem', async () => {
    renderRoute('/cadastros/clientes', stubDeParceiros())

    await screen.findByText('Cadastro de Clientes')
    const nome = await grade().findByRole('columnheader', { name: /Nome/ })
    expect(nome.querySelector('[data-modulo="clientes"]')).not.toBeNull()
  })

  // Colaborador GANHOU cor em 2026-08-17 (PR #188, decisão do user: cor forte
  // em todas as opções de cadastro) — veste o púrpura de Pessoas
  // (`profissionais`). O ponto do cabeçalho acompanha o schema.
  it('Colaboradores — com a cor de Pessoas, o cabeçalho ganha ponto', async () => {
    renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    const nome = await grade().findByRole('columnheader', { name: /Nome/ })
    expect(nome.querySelector('[data-modulo="profissionais"]')).not.toBeNull()
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
