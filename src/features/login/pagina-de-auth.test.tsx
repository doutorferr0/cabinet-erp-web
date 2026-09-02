import { PaginaDeAuth } from '@/features/login/pagina-de-auth'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('PaginaDeAuth', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('o título da tela é o ÚNICO h1 — a bancada não compete com a tarefa', () => {
    renderWithQuery(
      <PaginaDeAuth titulo="Entrar">
        <p>campos</p>
      </PaginaDeAuth>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Entrar')
    // O claim é h2: Gambarino grande, mas não é o assunto da página.
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('a nota de demonstração só existe onde a credencial única existe', () => {
    // Sem `VITE_DEMO_USER` a nota mentiria: em `app.cabinetonline.cc` quem
    // autentica é o backend, com credencial do banco de produção.
    const { unmount } = renderWithQuery(<PaginaDeAuth titulo="Entrar">campos</PaginaDeAuth>)
    expect(screen.queryByText(/ambiente de demonstração/i)).not.toBeInTheDocument()
    unmount()

    vi.stubEnv('VITE_DEMO_USER', 'demo@vertziluminacao.com.br')
    renderWithQuery(<PaginaDeAuth titulo="Entrar">campos</PaginaDeAuth>)
    expect(screen.getByText(/ambiente de demonstração/i)).toBeInTheDocument()
  })

  it('o subtítulo é opcional — só a tela que tem o que dizer o mostra', () => {
    const { unmount } = renderWithQuery(<PaginaDeAuth titulo="Entrar">campos</PaginaDeAuth>)
    expect(screen.queryByText('Use o e-mail da sua empresa.')).not.toBeInTheDocument()
    unmount()

    renderWithQuery(
      <PaginaDeAuth titulo="Entrar" subtitulo="Use o e-mail da sua empresa.">
        campos
      </PaginaDeAuth>,
    )
    expect(screen.getByText('Use o e-mail da sua empresa.')).toBeInTheDocument()
  })

  it('a hierarquia é de CLASSE, nunca de font-size literal (§Hierarquia)', () => {
    // A régua da rodada: título e claim saem dos degraus `t-*`. Um `text-2xl`
    // aqui passaria despercebido e a tela deixaria de acompanhar os tokens.
    renderWithQuery(
      <PaginaDeAuth titulo="Entrar" subtitulo="sub">
        campos
      </PaginaDeAuth>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('t-registro')
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('t-display')
    expect(screen.getByText('sub')).toHaveClass('t-meta')
  })

  it('a bancada é decoração — o ornamento não entra na árvore de acessibilidade', () => {
    const { container } = renderWithQuery(<PaginaDeAuth titulo="Entrar">campos</PaginaDeAuth>)
    const ornamento = container.querySelector('[data-slot="ornamento"]')
    expect(ornamento).toHaveAttribute('aria-hidden', 'true')
  })
})
