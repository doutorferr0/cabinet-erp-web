import { configurarApi } from '@/api/cliente'
import { LookupCombo } from '@/components/cabinet/lookup-combo'
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

  it('escolhe pelo ID e mostra o NOME (issue #94)', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(screen.getByRole('button', { name: /Selecione marca/i }))
    await user.click(await screen.findByRole('menuitem', { name: /STELLA/ }))

    // O que vai para o formulário é o id — antes ia o nome, e o submit tinha de
    // traduzir de volta. É a mudança inteira da issue, em uma asserção.
    expect(screen.getByTestId('valor')).toHaveTextContent('id-1')
    // E o botão continua mostrando o nome: o operador nunca vê a chave.
    expect(screen.getByRole('button', { name: /STELLA/ })).toBeInTheDocument()
  })

  it('id fora da lista exibe o rótulo que o registro trouxe', async () => {
    // Item desativado depois de gravado, ou lista cortada no teto de 100. Sem o
    // rótulo de reserva o campo abriria em branco — e gravar de novo apagaria
    // um valor que ninguém pediu para apagar.
    renderWithQuery(
      <LookupCombo
        kind="marca"
        value="id-de-marca-aposentada"
        rotulo="MARCA ANTIGA"
        onChange={() => {}}
      />,
    )

    expect(await screen.findByRole('button', { name: /MARCA ANTIGA/ })).toBeInTheDocument()
  })

  it('sem rótulo de reserva, id desconhecido não vira texto cru na tela', async () => {
    renderWithQuery(<LookupCombo kind="marca" value="id-orfao" onChange={() => {}} />)

    // Mostrar o uuid seria pior que o placeholder: o operador leria uma chave
    // achando que é o valor. Aqui ele vê que não há escolha feita.
    expect(await screen.findByRole('button', { name: /Selecione marca/i })).toBeInTheDocument()
  })

  it('cadastra item novo sem sair da tela (botão "...")', async () => {
    const { user } = renderWithQuery(<Harness />)
    await waitFor(() => expect(chamadas).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Cadastrar Marca' }))
    await user.type(screen.getByLabelText('Nome'), 'Marca Nova X')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // O cadastro rápido é LOCAL (mock): o id carrega prefixo `novo:` para não
    // ser confundido com um que veio do servidor. O operador vê o nome.
    expect(screen.getByTestId('valor')).toHaveTextContent('novo:marca:MARCA NOVA X')
    expect(screen.getByRole('button', { name: /MARCA NOVA X/ })).toBeInTheDocument()
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
