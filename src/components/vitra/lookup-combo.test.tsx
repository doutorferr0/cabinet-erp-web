import { configurarApi } from '@/api/cliente'
import { LookupCombo } from '@/components/vitra/lookup-combo'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * As opções vêm do backend (ADR-011, endpoint `/api/catalog-lookups`).
 *
 * O teste intercepta o `fetch`, e não o SDK gerado, de propósito: assim ele
 * exercita o CLIENTE GERADO de verdade — se o codegen mudar a URL, o nome do
 * parâmetro ou a forma da resposta, isto quebra. Dublar o SDK esconderia
 * exatamente a fronteira que este teste existe para vigiar.
 */
const OPCOES = ['EVOLED', 'STELLA']

function respostaDaApi(nomes: readonly string[]) {
  return new Response(
    JSON.stringify({
      rows: nomes.map((name, i) => ({ id: `id-${i}`, kind: 'MARCA', name, active: true })),
      total: nomes.length,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function Harness({ kind = 'marca' as const }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div>
      <LookupCombo kind={kind} value={value} onChange={setValue} />
      <output data-testid="valor">{value ?? ''}</output>
    </div>
  )
}

let chamadas: string[] = []

beforeEach(() => {
  chamadas = []
  configurarApi('http://api.teste')
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: RequestInfo | URL) => {
      chamadas.push(String(entrada instanceof Request ? entrada.url : entrada))
      return Promise.resolve(respostaDaApi(OPCOES))
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LookupCombo', () => {
  it('pede ao backend o kind certo, dentro do teto do contrato', async () => {
    renderWithQuery(<Harness />)

    await waitFor(() => expect(chamadas).toHaveLength(1))

    const url = new URL(chamadas[0] as string)
    expect(url.pathname).toBe('/api/catalog-lookups')

    // O front nomeia em camelCase; o banco, em MAIÚSCULA_COM_UNDERSCORE.
    expect(url.searchParams.get('kind')).toBe('MARCA')

    // Teto do contrato de listagem. Lista de apoio maior que isso deixou de ser
    // lista de apoio — vira busca, e aí o componente é outro.
    expect(url.searchParams.get('pageSize')).toBe('100')
  })

  it('seleciona uma opção vinda do servidor', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))
    await user.click(await screen.findByRole('menuitem', { name: /STELLA/ }))

    expect(screen.getByTestId('valor')).toHaveTextContent('STELLA')
  })

  it('cadastra item novo sem sair da tela (botão "...")', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Cadastrar Marca' }))
    await user.type(screen.getByLabelText('Nome'), 'Marca Nova X')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    expect(screen.getByTestId('valor')).toHaveTextContent('MARCA NOVA X')
  })

  it('busca filtra as opções', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))
    await user.type(screen.getByPlaceholderText(/buscar marca/i), 'evo')

    expect(await screen.findByRole('menuitem', { name: /EVOLED/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /STELLA/ })).not.toBeInTheDocument()
  })

  // A busca do combo filtra só o que chegou. Com a lista cortada, o item
  // procurado pode nem estar ali — e sem aviso o operador cadastraria duplicado
  // pelo botão "...".
  it('avisa quando a lista veio cortada no teto do contrato', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              rows: OPCOES.map((name, i) => ({ id: `id-${i}`, kind: 'MARCA', name, active: true })),
              total: 240,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      ),
    )

    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    expect(await screen.findByText(/A lista é maior/)).toBeInTheDocument()
  })

  it('lista inteira NÃO exibe aviso de corte', async () => {
    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    await screen.findByRole('menuitem', { name: /STELLA/ })
    expect(screen.queryByText(/A lista é maior/)).not.toBeInTheDocument()
  })

  it('falha do servidor NÃO se disfarça de lista vazia', async () => {
    // Estados distintos importam: o operador precisa saber se deve esperar,
    // avisar alguém, ou se a lista está mesmo vazia.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 500 }))),
    )

    const { user } = renderWithQuery(<Harness />)
    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))

    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument()
  })
})
