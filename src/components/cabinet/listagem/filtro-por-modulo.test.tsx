import { ColunasPorModulo } from '@/components/cabinet/listagem/colunas-por-modulo'
import { FiltroPorModulo } from '@/components/cabinet/listagem/filtro-por-modulo'
import {
  ativosDoModulo,
  filtroDoCampo,
  idDoFiltro,
  modulosFiltraveis,
} from '@/components/cabinet/listagem/modulos-da-consulta'
import { colaborador, profissional } from '@/features/cadastro/modulos'
import type { FiltroDaTabela } from '@/lib/filtro-de-consulta'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

/**
 * FILTRO E COLUNAS POR MÓDULO (#104) — a diretriz 4 do lado da listagem.
 *
 * O que se afirma aqui é o que a DoD da issue pediu, e a razão de cada um está
 * no arquivo do componente: o chip conta certo, coluna fixa não desmarca, e
 * remover uma pill limpa exatamente um filtro.
 */

/** Casca controlada: o componente é controlado, e o teste precisa do estado. */
function ComEstado({ inicial = [] as FiltroDaTabela[] }) {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>(inicial)
  return <FiltroPorModulo entidade={profissional} filtros={filtros} onChange={setFiltros} />
}

/** Colaborador tem QUATRO módulos filtráveis — é nele que a troca de painel se vê. */
function ComEstadoMock() {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>([])
  return <FiltroPorModulo entidade={colaborador} filtros={filtros} onChange={setFiltros} />
}

describe('tradução schema → filtro', () => {
  /**
   * O `id` do filtro é o nome que VIAJA, e ele muda com a fonte: entidade `http`
   * manda o `dto` (que está na whitelist do contrato — fora dela é 400) e
   * entidade `mock` manda o `campo` (o caminho que o provider resolve). Errar
   * isso dá 400 no primeiro clique, ou filtro que não acha nada.
   */
  it('entidade http filtra pelo dto; mock, pelo campo', () => {
    const nome = profissional.modulos[0]?.campos.find((c) => c.k === 'nome')
    expect(profissional.fonte).toBe('http')
    expect(idDoFiltro(profissional, nome as never)).toBe('legalName')

    const nomeColab = colaborador.modulos[0]?.campos.find((c) => c.k === 'nome')
    expect(colaborador.fonte).toBe('mock')
    expect(idDoFiltro(colaborador, nomeColab as never)).toBe('nome')
  })

  it('período e faixa viram isBetween com os dois extremos', () => {
    // Colaborador é `mock`, e é onde há campo de data COM lastro: no
    // profissional (`http`) a data existe no mockup e o contrato não a publica.
    const admissao = colaborador.modulos
      .flatMap((m) => m.campos)
      .find((c) => c.fil === 'data') as never
    const filtro = filtroDoCampo(colaborador, admissao, ['2026-01-01', '2026-12-31'])

    expect(filtro?.variante).toBe('date')
    expect(filtro?.operador).toBe('isBetween')
    expect(filtro?.valor).toEqual(['2026-01-01', '2026-12-31'])
  })

  /** Módulo sem campo filtrável não vira chip: painel vazio não responde nada. */
  it('só entra na faixa o módulo que tem o que filtrar', () => {
    for (const entidade of [profissional, colaborador]) {
      const modulos = modulosFiltraveis(entidade)
      expect(modulos.length).toBeLessThan(entidade.modulos.length)
      for (const { campos } of modulos) expect(campos.length).toBeGreaterThan(0)
    }
  })

  /**
   * A FAIXA É MENOR NO RECURSO HTTP, e isso é a recusa em voz alta funcionando.
   *
   * O mockup desenha Documentos e Participação como filtráveis; o contrato não
   * publica `dto` para nenhum campo deles, e campo fora da whitelist é 400 no
   * primeiro clique. Colaborador é `mock` — ali quem resolve é o provider, pelo
   * `campo`, e por isso quatro módulos entram.
   */
  it('http oferece só o que o contrato publica; mock oferece o que o schema guarda', () => {
    expect(modulosFiltraveis(profissional).map((m) => m.modulo.id)).toEqual(['identificacao'])
    expect(modulosFiltraveis(colaborador).map((m) => m.modulo.id).length).toBeGreaterThan(1)
  })

  it('a contagem do chip é por LINHA de filtro, não por campo', () => {
    const modulo = profissional.modulos[0] as never
    const filtros: FiltroDaTabela[] = [
      { filtroId: 'a', id: 'legalName', variante: 'text', operador: 'iLike', valor: 'A' },
      { filtroId: 'b', id: 'legalName', variante: 'text', operador: 'iLike', valor: 'B' },
      { filtroId: 'c', id: 'registration', variante: 'text', operador: 'iLike', valor: 'C' },
    ]
    // Duas condições sobre `legalName` contam DUAS: é o que explica ao operador
    // por que a listagem está mais estreita do que ele esperava.
    expect(ativosDoModulo(profissional, modulo, filtros)).toBe(2)
  })
})

describe('FiltroPorModulo', () => {
  it('o chip mostra a contagem de filtros ativos daquele módulo', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    const chip = screen.getByRole('button', { name: /Identificação/ })
    expect(chip).toHaveTextContent(/^Identificação$/)

    await user.click(chip)
    await user.type(screen.getByLabelText('Nome completo'), 'MARINA')

    expect(screen.getByRole('button', { name: /Identificação/ })).toHaveTextContent('1')
  })

  it('um painel de cada vez — abrir outro fecha o anterior', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstadoMock />)

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    expect(screen.getByText('Filtros de Identificação')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Documentos/ }))
    expect(screen.queryByText('Filtros de Identificação')).not.toBeInTheDocument()
    expect(screen.getByText(/Filtros de Documentos/)).toBeInTheDocument()
  })

  it('clicar no chip aberto fecha — é alternador, não só abertura', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    const chip = screen.getByRole('button', { name: /Identificação/ })
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'false')
  })

  /** Fechar o painel é parar de editar, não desfazer: a pill fica. */
  it('o filtro sobrevive ao fechar o painel, como pill', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(screen.getByLabelText('Nome completo'), 'MARINA')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByText('Filtros de Identificação')).not.toBeInTheDocument()
    expect(screen.getByText('Nome completo:')).toBeInTheDocument()
  })

  it('remover uma pill limpa exatamente um filtro', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(screen.getByLabelText('Nome completo'), 'MARINA')
    await user.type(screen.getByLabelText('CPF / CNPJ'), '123')

    expect(screen.getByText('Nome completo:')).toBeInTheDocument()
    expect(screen.getByText('CPF / CNPJ:')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover filtro Nome completo' }))

    expect(screen.queryByText('Nome completo:')).not.toBeInTheDocument()
    expect(screen.getByText('CPF / CNPJ:')).toBeInTheDocument()
  })

  it('esvaziar o campo tira o filtro — não deixa condição vazia viajando', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    const campo = screen.getByLabelText('Nome completo')
    await user.type(campo, 'MARINA')
    expect(screen.getByText('Nome completo:')).toBeInTheDocument()

    await user.clear(campo)
    expect(screen.queryByText('Nome completo:')).not.toBeInTheDocument()
  })

  it('Limpar tudo zera a faixa de ativos', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComEstado />)

    await user.click(screen.getByRole('button', { name: /Identificação/ }))
    await user.type(screen.getByLabelText('Nome completo'), 'MARINA')
    await user.click(screen.getByRole('button', { name: 'Limpar tudo' }))

    expect(screen.queryByText('Nome completo:')).not.toBeInTheDocument()
  })
})

describe('ColunasPorModulo', () => {
  function ComColunas() {
    const [extras, setExtras] = useState<string[]>([])
    return <ColunasPorModulo entidade={profissional} extras={extras} onChange={setExtras} />
  }

  /** Só o mock tem mais de um módulo com lastro — ver o teste da faixa acima. */
  function ComColunasMock() {
    const [extras, setExtras] = useState<string[]>([])
    return <ColunasPorModulo entidade={colaborador} extras={extras} onChange={setExtras} />
  }

  /**
   * `col: true` é a identidade da linha na grade. Desmarcá-la produziria uma
   * listagem sem como distinguir um registro do outro — e o operador só
   * descobriria depois de fechar o seletor.
   */
  it('coluna fixa aparece marcada e NÃO desmarca', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComColunas />)
    await user.click(screen.getByRole('button', { name: 'Colunas' }))

    // O nome acessível inclui `fixa`: o controle está desabilitado, e quem
    // ouve precisa do motivo tanto quanto quem lê o rótulo ao lado.
    const fixa = screen.getByRole('checkbox', { name: 'Nome de apresentação fixa' })
    expect(fixa).toBeChecked()
    expect(fixa).toBeDisabled()

    await user.click(fixa)
    expect(fixa).toBeChecked()
  })

  it('coluna opcional liga e desliga', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComColunas />)
    await user.click(screen.getByRole('button', { name: 'Colunas' }))

    const opcional = screen.getByRole('checkbox', { name: 'E-mail' })
    expect(opcional).not.toBeChecked()

    await user.click(opcional)
    expect(opcional).toBeChecked()
    await user.click(opcional)
    expect(opcional).not.toBeChecked()
  })

  it('as caixas vêm agrupadas por módulo, com o nome do grupo', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ComColunasMock />)
    await user.click(screen.getByRole('button', { name: 'Colunas' }))

    // O agrupamento é o ponto do seletor: "que colunas existem sobre dados
    // trabalhistas" não se responde numa lista plana de quarenta caixas.
    expect(screen.getByRole('group', { name: /Identificação/ })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Dados trabalhistas/ })).toBeInTheDocument()
  })
})
