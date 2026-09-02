import { gruposDoModulo } from '@/components/cabinet/listagem/colunas-por-modulo'
import { FiltroPorModulo } from '@/components/cabinet/listagem/filtro-por-modulo'
import { MenuDeColunas } from '@/components/cabinet/listagem/menu-de-colunas'
import {
  ativosDoModulo,
  filtroDoCampo,
  idDoFiltro,
  modulosFiltraveis,
} from '@/components/cabinet/listagem/modulos-da-consulta'
import { colaborador, profissional } from '@/features/cadastro/modulos'
import type { EntidadeCadastro } from '@/features/cadastro/modulos/tipos'
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

/**
 * A ENTIDADE `mock` DE MENTIRA — e ela existe porque não sobrou nenhuma de
 * verdade.
 *
 * `colaborador` era o último recurso de cadastro servido por fixture, e em
 * 2026-08-25 migrou para `GET /api/employees`: as quatro entidades do schema são
 * `http` hoje. As regras do lado `mock` continuam no código (`idDoFiltro`
 * devolve `campo`, `temLastroDeConsulta` dispensa a whitelist) e passariam a não
 * ter NENHUM caso — verde eterno sobre caminho que ninguém exercita.
 *
 * Fabricada aqui, e não devolvida ao schema: entidade `mock` de verdade seria
 * uma tela lendo ficção, que é justamente o que a migração desfez. É o mesmo
 * argumento de `montarRelatorio` em `rotas-do-backend.ts` — a guarda recebe o
 * caso em vez de lê-lo das constantes, para poder ficar vermelha.
 */
const entidadeMock: EntidadeCadastro = {
  id: 'ficticia',
  nome: 'Fictícia',
  plural: 'Fictícias',
  fonte: 'mock',
  modulos: [
    {
      id: 'identificacao',
      titulo: 'Identificação',
      resumo: 'O módulo obrigatório da entidade de mentira',
      obrigatorio: true,
      campos: [
        { k: 'nome', r: 'Nome', req: true, col: true, fil: 'texto', campo: 'nome' },
        { k: 'ativo', r: 'Ativo', t: 'check', fil: 'bool', campo: 'ativo' },
      ],
    },
    {
      id: 'trabalhistas',
      titulo: 'Dados trabalhistas',
      resumo: 'O segundo módulo filtrável — é dele que sai a troca de painel',
      campos: [
        { k: 'admissao', r: 'Data de admissão', t: 'data', fil: 'data', campo: 'dataAdmissao' },
      ],
    },
    {
      id: 'semFiltro',
      titulo: 'Sem filtro',
      resumo: 'Módulo sem campo filtrável — não vira chip',
      campos: [{ k: 'obs', r: 'Observação', campo: 'observacao' }],
    },
  ],
}

/** Casca controlada: o componente é controlado, e o teste precisa do estado. */
function ComEstado({ inicial = [] as FiltroDaTabela[] }) {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>(inicial)
  return <FiltroPorModulo entidade={profissional} filtros={filtros} onChange={setFiltros} />
}

/** A entidade de mentira tem DOIS módulos filtráveis — é nela que a troca de painel se vê. */
function ComEstadoMock() {
  const [filtros, setFiltros] = useState<FiltroDaTabela[]>([])
  return <FiltroPorModulo entidade={entidadeMock} filtros={filtros} onChange={setFiltros} />
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

    const nomeMock = entidadeMock.modulos[0]?.campos.find((c) => c.k === 'nome')
    expect(entidadeMock.fonte).toBe('mock')
    expect(idDoFiltro(entidadeMock, nomeMock as never)).toBe('nome')

    // E o colaborador, que era o exemplo `mock` deste caso até 25/08, hoje prova
    // o outro lado: migrou para `http` e passou a viajar o `dto`.
    const nomeColab = colaborador.modulos[0]?.campos.find((c) => c.k === 'nome')
    expect(colaborador.fonte).toBe('http')
    expect(idDoFiltro(colaborador, nomeColab as never)).toBe('name')
  })

  it('período e faixa viram isBetween com os dois extremos', () => {
    // A entidade de mentira é `mock`, e é onde há campo de data COM lastro: nas
    // quatro entidades `http` a data existe no mockup e o contrato não a publica
    // na whitelist — inclusive no colaborador, cuja admissão só vem na FICHA.
    const admissao = entidadeMock.modulos
      .flatMap((m) => m.campos)
      .find((c) => c.fil === 'data') as never
    const filtro = filtroDoCampo(entidadeMock, admissao, ['2026-01-01', '2026-12-31'])

    expect(filtro?.variante).toBe('date')
    expect(filtro?.operador).toBe('isBetween')
    expect(filtro?.valor).toEqual(['2026-01-01', '2026-12-31'])
  })

  /** Módulo sem campo filtrável não vira chip: painel vazio não responde nada. */
  it('só entra na faixa o módulo que tem o que filtrar', () => {
    for (const entidade of [profissional, entidadeMock]) {
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
   * primeiro clique. Na entidade `mock` quem resolve é o provider, pelo `campo`,
   * e por isso os dois módulos com `fil` entram.
   */
  it('http oferece só o que o contrato publica; mock oferece o que o schema guarda', () => {
    expect(modulosFiltraveis(profissional).map((m) => m.modulo.id)).toEqual(['identificacao'])
    expect(modulosFiltraveis(entidadeMock).map((m) => m.modulo.id).length).toBeGreaterThan(1)
  })

  /**
   * O TERCEIRO estado, que não existia até 25/08: recurso `http` cujo servidor
   * recusa o parâmetro `filters` inteiro. Não é "o contrato publica pouco" — é
   * "o contrato não publica nada", e a faixa tem de sair da tela por completo.
   */
  it('http sem `filters` no contrato não oferece módulo nenhum', () => {
    expect(colaborador.whitelistDeFiltro).toEqual([])
    expect(modulosFiltraveis(colaborador)).toEqual([])
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

    // O segundo módulo da entidade de mentira. Era `Documentos`, do colaborador,
    // até 25/08 — o nome mudou junto com a entidade, a regra não.
    await user.click(screen.getByRole('button', { name: /Dados trabalhistas/ }))
    expect(screen.queryByText('Filtros de Identificação')).not.toBeInTheDocument()
    expect(screen.getByText(/Filtros de Dados trabalhistas/)).toBeInTheDocument()
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

/**
 * As colunas por módulo deixaram de ter painel próprio na Reface 2.0: elas são
 * os GRUPOS do menu `Colunas` da barra. O que se afirma continua sendo o mesmo —
 * agrupado por origem, fixa não desmarca, opcional liga e desliga —, porque é
 * disso que a #104 trata; o que mudou foi onde o operador clica.
 */
describe('colunas por módulo, dentro do menu Colunas', () => {
  function ComColunas() {
    const [extras, setExtras] = useState<string[]>([])
    return (
      <MenuDeColunas
        colunas={[]}
        onAlternar={() => undefined}
        onReordenar={() => undefined}
        opcionais={gruposDoModulo(profissional, extras)}
        onAlternarOpcional={(id) =>
          setExtras((atuais) =>
            atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
          )
        }
      />
    )
  }

  /** Só o mock tem mais de um módulo com lastro — ver o teste da faixa acima. */
  function ComColunasMock() {
    const [extras, setExtras] = useState<string[]>([])
    return (
      <MenuDeColunas
        colunas={[]}
        onAlternar={() => undefined}
        onReordenar={() => undefined}
        opcionais={gruposDoModulo(entidadeMock, extras)}
        onAlternarOpcional={(id) =>
          setExtras((atuais) =>
            atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
          )
        }
      />
    )
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
