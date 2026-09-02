import { stubDeColaboradores } from '@/test/colaboradores'
import { stubDeParceiros } from '@/test/parceiros'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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

  /**
   * INVERTIDO na Reface 2.0 (D9), e a inversão é o assunto do caso.
   *
   * Antes, TODA coluna que a tela declarava era fixa, e o seletor só servia
   * para acrescentar — por isso nunca houve o que contar como oculta. O menu
   * `Colunas · n ocultas` existe justamente para esconder a coluna que não
   * interessa hoje, então só a IDENTIDADE da linha (a primeira) continua
   * travada: sem ela a listagem vira um bloco de datas e valores sem sujeito.
   */
  it('só a identidade da linha trava; o resto da grade se esconde', async () => {
    const { user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))

    // Dentro do popover: com ele NÃO modal, os checkboxes de seleção de linha
    // da grade também estão na árvore, e o primeiro da tela seria um deles.
    const popover = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    const primeira = within(popover).getAllByRole('checkbox')[0] as HTMLElement
    expect(primeira).toBeChecked()
    expect(primeira).toBeDisabled()

    const setor = await screen.findByLabelText(/^Setor/)
    expect(setor).toBeChecked()
    expect(setor).not.toBeDisabled()

    await user.click(setor)
    await waitFor(() => {
      expect(grade().queryByRole('columnheader', { name: /^Setor/ })).toBeNull()
    })
  })

  /**
   * O ponto de cor faz a resposta do seletor ("de onde vem esta coluna")
   * sobreviver ao fechamento dele — e desde a D8 ele divide o lugar com o
   * ÍCONE DE TIPO, que é excludente: um cabeçalho mostra um ou outro.
   *
   * **A coluna TIPADA fica com o ícone** (mockup §Listagem: a grade se lê pela
   * forma da coluna antes do rótulo). O ponto continua onde ele responde a
   * pergunta que ninguém mais responde: a coluna que o operador LIGOU, que não
   * tem tipo e cuja origem só o seletor sabia. Foi por isso que os dois casos
   * abaixo trocaram de coluna quando a D14 tipou `Nome` — não por o ponto ter
   * saído da grade.
   */
  it('Clientes — a coluna ligada carrega a cor do módulo de origem', async () => {
    const { user } = renderRoute('/cadastros/clientes', stubDeParceiros())

    await screen.findByText('Cadastro de Clientes')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))
    await user.click(await screen.findByLabelText(/^E-mail/))

    const email = await grade().findByRole('columnheader', { name: /E-mail/ })
    expect(email.querySelector('[data-modulo="clientes"]')).not.toBeNull()
  })

  it('Clientes — a coluna tipada troca o ponto pelo ícone do tipo', async () => {
    renderRoute('/cadastros/clientes', stubDeParceiros())

    await screen.findByText('Cadastro de Clientes')
    const nome = await grade().findByRole('columnheader', { name: /Nome/ })
    expect(nome.querySelector('[data-slot="icone-de-tipo"]')).not.toBeNull()
    expect(nome.querySelector('[data-modulo]')).toBeNull()
  })

  // Colaborador GANHOU cor em 2026-08-17 (PR #188, decisão do user: cor forte
  // em todas as opções de cadastro) — veste o púrpura de Pessoas
  // (`profissionais`). O ponto do cabeçalho acompanha o schema.
  it('Colaboradores — com a cor de Pessoas, a coluna ligada ganha ponto', async () => {
    const { user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    await user.click(await screen.findByRole('button', { name: 'Colunas' }))
    // `Cargo` saiu da grade na D14 — virou subtítulo da pessoa na célula de
    // entidade —, então voltou a ser coluna que o operador LIGA, que é
    // exatamente onde o ponto de módulo ainda responde alguma coisa.
    await user.click(await screen.findByLabelText(/^Cargo/))

    const cargo = await grade().findByRole('columnheader', { name: /Cargo/ })
    expect(cargo.querySelector('[data-modulo="profissionais"]')).not.toBeNull()
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
