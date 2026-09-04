import type { SavedViewDto } from '@/api/gerado'
import {
  type ConsultaDaView,
  consultaDaView,
  corpoDaConsulta,
  useViewsDaTela,
} from '@/components/cabinet/listagem/views'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { instalarServidor, json } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A PERSISTÊNCIA das views na listagem — as quatro escritas do DoD e a
 * tradução entre o registro do servidor e o estado da tabela.
 *
 * A barra de abas em si é de D5/D9; o que se prova aqui é o que ela vai chamar.
 * Sem isto, o primeiro consumidor descobriria na tela que renomear apaga os
 * filtros — o defeito que o `PUT` inteiro cria e que só aparece na segunda vez
 * em que alguém abre a consulta salva.
 */

const VIEW: SavedViewDto = {
  id: 'v1',
  route: '/compras/ordens',
  name: 'Atrasadas',
  color: 'amber',
  filters: [{ field: 'status', operator: 'eq', value: 'late' }],
  joinOperator: 'or',
  sortBy: 'code',
  sortDesc: true,
  groupBy: 'supplierName',
  columns: ['code', 'supplierName'],
  mode: 'quadro',
  favorite: true,
  position: 0,
}

const CAMPOS: CampoFiltravel[] = [{ id: 'status', rotulo: 'Situação', variante: 'select' }]

describe('view ↔ estado da tabela', () => {
  it('a consulta volta com a variante que a TELA declara — ela não viaja no fio', () => {
    expect(consultaDaView(VIEW, CAMPOS).filtros[0]).toMatchObject({
      id: 'status',
      variante: 'select',
      operador: 'eq',
      valor: 'late',
    })
  })

  it('campo que a tela não conhece mais cai em texto, em vez de sumir', () => {
    // Sumir seria pior: o filtro continuaria valendo na consulta sem aparecer em
    // lugar nenhum, e o operador leria a lista curta como se fosse o total.
    expect(consultaDaView(VIEW, []).filtros[0]?.variante).toBe('text')
  })

  it('cada aplicação gera CHAVES DE LINHA novas — id gravado não colide com o da tela', () => {
    const primeira = consultaDaView(VIEW, CAMPOS).filtros[0]?.filtroId
    const segunda = consultaDaView(VIEW, CAMPOS).filtros[0]?.filtroId

    expect(primeira).toBeTruthy()
    expect(primeira).not.toBe(segunda)
  })

  it('a ida é o inverso exato da volta', () => {
    const consulta = consultaDaView(VIEW, CAMPOS)
    const corpo = corpoDaConsulta(VIEW.route, VIEW.name, consulta)

    expect(corpo).toMatchObject({
      route: '/compras/ordens',
      name: 'Atrasadas',
      joinOperator: 'or',
      sortBy: 'code',
      sortDesc: true,
      groupBy: 'supplierName',
      mode: 'quadro',
      columns: ['code', 'supplierName'],
    })
    expect(corpo.filters).toEqual([{ field: 'status', operator: 'eq', value: 'late' }])
  })

  it('view sem ordem não inventa uma — `null` é "não guardou"', () => {
    const semOrdem = consultaDaView({ ...VIEW, sortBy: null }, CAMPOS)
    expect(semOrdem.sort).toBeNull()
    expect(corpoDaConsulta(VIEW.route, 'X', semOrdem).sortBy).toBeNull()
  })
})

const CONSULTA_VAZIA: ConsultaDaView = {
  filtros: [],
  juncao: 'and',
  sort: null,
  visao: '',
  agruparPor: '',
  colunas: [],
}

/** Sonda: o hook não tem tela ainda (a barra de abas é D5), e as escritas têm. */
function Sonda() {
  const views = useViewsDaTela('/compras/ordens')
  const primeira = views.views[0]

  return (
    <div>
      <p>{views.views.map((v) => v.name).join(' · ') || 'sem view'}</p>
      <button type="button" onClick={() => views.salvar('Nova', CONSULTA_VAZIA)}>
        Salvar
      </button>
      {primeira ? (
        <>
          <button type="button" onClick={() => views.renomear(primeira, 'Outro nome')}>
            Renomear
          </button>
          <button type="button" onClick={() => views.favoritar(primeira)}>
            Favoritar
          </button>
          <button type="button" onClick={() => views.excluir(primeira)}>
            Excluir
          </button>
        </>
      ) : null}
    </div>
  )
}

function montar(iniciais: SavedViewDto[]) {
  let atuais = [...iniciais]
  const servidor = instalarServidor({
    '/api/me/views': (chamada) => {
      if (chamada.metodo !== 'POST') return json(atuais)
      const criada = { ...(chamada.corpo as SavedViewDto), id: 'v2' }
      atuais = [...atuais, criada]
      return json(criada, 201)
    },
    '/api/me/views/v1': (chamada) => {
      if (chamada.metodo === 'DELETE') {
        atuais = atuais.filter((v) => v.id !== 'v1')
        return new Response(null, { status: 204 })
      }
      const atualizada = { ...(chamada.corpo as SavedViewDto), id: 'v1' }
      atuais = atuais.map((v) => (v.id === 'v1' ? atualizada : v))
      return json(atualizada)
    },
  })

  return { servidor, ...renderWithQuery(<Sonda />) }
}

afterEach(() => vi.unstubAllGlobals())

describe('as escritas da tela', () => {
  it('só mostra as views DESTA tela', async () => {
    montar([VIEW, { ...VIEW, id: 'v9', route: '/vendas/orcamentos', name: 'De outra tela' }])

    expect(await screen.findByText('Atrasadas')).toBeInTheDocument()
  })

  it('salvar manda a consulta da tela e a lista redesenha', async () => {
    const { user, servidor } = montar([])

    await user.click(await screen.findByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.getByText('Nova')).toBeInTheDocument())
    // Filtra o POST: a última chamada ao caminho é o GET da invalidação, e o
    // corpo dele é `null` — foi o que este teste pegou primeiro.
    const post = servidor.em('/api/me/views').find((c) => c.metodo === 'POST')
    expect(post?.corpo).toMatchObject({
      route: '/compras/ordens',
      name: 'Nova',
      favorite: false,
    })
  })

  it('renomear NÃO apaga filtros nem a estrela — o PUT leva o registro inteiro', async () => {
    const { user, servidor } = montar([VIEW])

    await user.click(await screen.findByRole('button', { name: 'Renomear' }))

    await waitFor(() => expect(servidor.em('/api/me/views/v1')).toHaveLength(1))
    expect(servidor.em('/api/me/views/v1')[0]?.corpo).toMatchObject({
      name: 'Outro nome',
      color: 'amber',
      favorite: true,
      joinOperator: 'or',
      sortBy: 'code',
      mode: 'quadro',
    })
  })

  it('favoritar alterna a estrela, e só ela', async () => {
    const { user, servidor } = montar([VIEW])

    await user.click(await screen.findByRole('button', { name: 'Favoritar' }))

    await waitFor(() => expect(servidor.em('/api/me/views/v1')).toHaveLength(1))
    expect(servidor.em('/api/me/views/v1')[0]?.corpo).toMatchObject({
      favorite: false,
      name: 'Atrasadas',
    })
  })

  it('excluir some com a view da lista', async () => {
    const { user, servidor } = montar([VIEW])

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.getByText('sem view')).toBeInTheDocument())
    expect(servidor.em('/api/me/views/v1')[0]?.metodo).toBe('DELETE')
  })
})
