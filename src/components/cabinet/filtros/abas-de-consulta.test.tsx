import {
  ABA_TODOS,
  AbasDeConsulta,
  consultaBate,
  corDaVisao,
} from '@/components/cabinet/filtros/abas-de-consulta'
import type { ConsultaSalva, FavoritoDeConsulta } from '@/lib/favoritos-de-consulta'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * A tira de abas é o que tirou a consulta salva (#92) de dentro de um popover.
 * O que se trava aqui é a honestidade dela: a aba acesa descreve o que ESTÁ na
 * tela, e `Todos` é o chão para onde se volta.
 */

const VAZIA: ConsultaSalva = {
  filtros: [],
  juncao: 'and',
  sort: null,
  visao: 'lista',
  agruparPor: '',
  densidade: 'padrao',
}

const SO_STELLA: ConsultaSalva = {
  ...VAZIA,
  filtros: [{ filtroId: 'f1', id: 'name', variante: 'text', operador: 'iLike', valor: 'STELLA' }],
}

function favorito(over: Partial<FavoritoDeConsulta> = {}): FavoritoDeConsulta {
  return {
    id: 'fav-1',
    nome: 'Só Stella',
    filtros: SO_STELLA.filtros,
    juncao: 'and',
    sort: null,
    visao: '',
    agruparPor: '',
    densidade: '',
    padrao: false,
    ...over,
  }
}

function montar(over: Partial<React.ComponentProps<typeof AbasDeConsulta>> = {}) {
  const props = {
    favoritos: [] as readonly FavoritoDeConsulta[],
    atual: VAZIA,
    temConsulta: false,
    onAplicar: vi.fn(),
    onLimpar: vi.fn(),
    onSalvar: vi.fn(),
    onRenomear: vi.fn(),
    onExcluir: vi.fn(),
    onTornarPadrao: vi.fn(),
    ...over,
  }
  return { ...renderWithQuery(<AbasDeConsulta {...props} />), props }
}

describe('consultaBate', () => {
  it('campo vazio no favorito é CURINGA, não "volte ao padrão"', () => {
    // Favorito gravado antes dos view modes não fala de visão — e não pode
    // deixar de bater com a própria consulta por causa disso.
    expect(consultaBate(favorito({ visao: '' }), { ...SO_STELLA, visao: 'quadro' })).toBe(true)
  })

  it('visão declarada precisa bater', () => {
    expect(consultaBate(favorito({ visao: 'quadro' }), { ...SO_STELLA, visao: 'lista' })).toBe(
      false,
    )
  })

  it('valor diferente no mesmo campo não é a mesma consulta', () => {
    const outro = {
      ...SO_STELLA,
      filtros: [
        { filtroId: 'f2', id: 'name', variante: 'text', operador: 'iLike', valor: 'LUMINA' },
      ],
    } as ConsultaSalva
    expect(consultaBate(favorito(), outro)).toBe(false)
  })

  it('a ordenação conta — mesma lista, ordem diferente, pergunta diferente', () => {
    expect(consultaBate(favorito(), { ...SO_STELLA, sort: { id: 'name', desc: true } })).toBe(false)
  })
})

describe('AbasDeConsulta', () => {
  it('sem consulta montada, `Todos` é a aba acesa', () => {
    montar()
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('a consulta salva vira ABA, e a que bate com a tela é a acesa', () => {
    montar({ favoritos: [favorito()], atual: SO_STELLA, temConsulta: true })

    expect(screen.getByRole('tab', { name: 'Só Stella' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'false')
  })

  it('consulta montada e sem nome acende a aba `Não salva`', () => {
    // Nenhuma aba acesa se lê como defeito; "esta pergunta ainda não tem nome"
    // é o que está acontecendo.
    montar({
      favoritos: [favorito()],
      atual: { ...SO_STELLA, sort: { id: 'name', desc: false } },
      temConsulta: true,
    })

    expect(screen.getByRole('tab', { name: 'Não salva' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clicar na aba de uma consulta salva a aplica', async () => {
    const { user, props } = montar({ favoritos: [favorito()], atual: VAZIA, temConsulta: false })

    await user.click(screen.getByRole('tab', { name: 'Só Stella' }))

    expect(props.onAplicar).toHaveBeenCalledWith(expect.objectContaining({ id: 'fav-1' }))
  })

  it('`Todos` volta à listagem crua', async () => {
    const { user, props } = montar({ atual: SO_STELLA, temConsulta: true })

    await user.click(screen.getByRole('tab', { name: 'Todos' }))

    expect(props.onLimpar).toHaveBeenCalled()
  })

  it('sem nada montado não há o que salvar', () => {
    montar()
    expect(screen.getByRole('button', { name: /Salvar consulta/ })).toBeDisabled()
  })

  it('consulta que já é aba não se salva de novo', () => {
    montar({ favoritos: [favorito()], atual: SO_STELLA, temConsulta: true })
    expect(screen.getByRole('button', { name: /Salvar consulta/ })).toBeDisabled()
  })

  it('salvar pede o nome e devolve o que foi digitado', async () => {
    const { user, props } = montar({ atual: SO_STELLA, temConsulta: true })

    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(await screen.findByLabelText('Nome'), 'Vencendo')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(props.onSalvar).toHaveBeenCalledWith('Vencendo')
  })

  it('o menu da aba ativa renomeia, marca padrão e exclui', async () => {
    const { user, props } = montar({
      favoritos: [favorito()],
      atual: SO_STELLA,
      temConsulta: true,
    })

    await user.click(screen.getByRole('button', { name: /Ações da visão/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Abrir por padrão' }))
    expect(props.onTornarPadrao).toHaveBeenCalledWith('fav-1')

    await user.click(screen.getByRole('button', { name: /Ações da visão/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir visão' }))
    expect(props.onExcluir).toHaveBeenCalledWith('fav-1')
  })

  it('renomear abre com o nome atual e devolve o novo', async () => {
    const { user, props } = montar({
      favoritos: [favorito()],
      atual: SO_STELLA,
      temConsulta: true,
    })

    await user.click(screen.getByRole('button', { name: /Ações da visão/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Renomear…' }))

    const campo = await screen.findByLabelText('Nome')
    expect(campo).toHaveValue('Só Stella')
    await user.clear(campo)
    await user.type(campo, 'Stella nova')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(props.onRenomear).toHaveBeenCalledWith('fav-1', 'Stella nova')
  })

  it('a aba que abre por padrão diz isso na própria tira', () => {
    // Sem a marca, "por que esta tela abriu filtrada?" só se responde abrindo
    // um menu — que é a pergunta que a estrela existe para evitar.
    montar({ favoritos: [favorito({ padrao: true })], atual: SO_STELLA, temConsulta: true })
    expect(screen.getByLabelText('Abre por padrão')).toBeInTheDocument()
  })

  it('`Todos` não tem menu — não se apaga a listagem crua', async () => {
    montar({ favoritos: [favorito()], atual: VAZIA, temConsulta: false })
    expect(screen.queryByRole('button', { name: /Ações da visão/ })).not.toBeInTheDocument()
  })
})

describe('cor e contagem da visão (Reface 2.0)', () => {
  it('a mesma visão tem sempre a mesma cor', () => {
    expect(corDaVisao('fav-1')).toBe(corDaVisao('fav-1'))
  })

  it('`Todos` é a tinta, não uma cor no meio das outras', () => {
    expect(corDaVisao(ABA_TODOS)).toBe('var(--n-900)')
    expect(corDaVisao('fav-1')).not.toBe('var(--n-900)')
  })

  it('nenhuma visão nasce chartreuse — o primário não é cor de visão', () => {
    const cores = Array.from({ length: 40 }, (_, i) => corDaVisao(`fav-${i}`))
    expect(cores.some((cor) => cor.includes('lime'))).toBe(false)
  })

  it('a contagem entra na tira e no rótulo assistivo', () => {
    montar({
      favoritos: [favorito()],
      atual: VAZIA,
      temConsulta: false,
      contagens: new Map([
        [ABA_TODOS, 14],
        ['fav-1', 6],
      ]),
    })

    expect(screen.getByRole('tab', { name: /Todos — 14 registro/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Só Stella — 6 registro/ })).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('sem o mapa, a tira não inventa número nenhum', () => {
    montar({ favoritos: [favorito()], atual: VAZIA, temConsulta: false })
    expect(screen.getByRole('tab', { name: 'Só Stella' })).toBeInTheDocument()
  })

  it('o `+` cria visão do que está montado, e morre quando não há o que salvar', async () => {
    const semNada = montar()
    expect(screen.getByRole('button', { name: 'Nova visão' })).toBeDisabled()
    semNada.unmount()

    const { user, props } = montar({ atual: SO_STELLA, temConsulta: true })
    await user.click(screen.getByRole('button', { name: 'Nova visão' }))
    await user.type(await screen.findByLabelText('Nome'), 'Atrasadas')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(props.onSalvar).toHaveBeenCalledWith('Atrasadas')
  })
})
