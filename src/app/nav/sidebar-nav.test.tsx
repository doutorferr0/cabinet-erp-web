import { instalarServidor } from '@/test/servidor'
import { type FetchStub, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A BARRA 2.0, no comportamento — o que o operador faz com ela.
 *
 * O alcance (toda rota tem lugar) é medido em `alcance.test.ts`, sem montar
 * nada: é regra de DADO. Aqui é o contrário — o que só existe montado: o grupo
 * que abre, o que colapsa, o que fica gravado, o que sai da tela.
 */

const EMPRESAS = [
  {
    tenantId: 'aaaa-1111',
    name: 'VERTZ ILUMINAÇÃO',
    role: 'owner',
    features: ['suppliers', 'professionals', 'employees'],
  },
]

let fetchStub: FetchStub

beforeEach(() => {
  localStorage.clear()
  const servidor = instalarServidor({
    '/auth/tenants': () => EMPRESAS,
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: EMPRESAS[0]?.tenantId ?? null,
      expiresAt: '2099-01-01T00:00:00Z',
    }),
  })
  fetchStub = servidor.fetch
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function setup(url = '/') {
  return renderRoute(url, fetchStub)
}

function barra() {
  return document.querySelector('[data-slot="sidebar-nav"]') as HTMLElement
}

async function esperarBarra() {
  await waitFor(() => {
    expect(barra()).toBeInTheDocument()
  })
  return barra()
}

describe('SidebarNav', () => {
  it('desenha os grupos na ordem fixa da 2.0, com Configurações no rodapé', async () => {
    setup()
    await esperarBarra()

    const rotulos = [...barra().querySelectorAll('.t-rotulo')].map((n) => n.textContent)
    // FAVORITOS e RECENTES não aparecem vazios — e é isso que sobra aqui,
    // porque o operador desta sessão nunca marcou nem abriu nada.
    expect(rotulos).toEqual(['Hoje', 'Compras', 'Estoque', 'Vendas', 'CRM', 'Pessoas'])

    // Configurações é rodapé e não é grupo: não tem rótulo em caixa alta nem
    // colapsa — o que se AJUSTA não disputa espaço com o que se OPERA.
    const config = within(barra()).getByRole('link', { name: 'Configurações' })
    expect(config).toHaveAttribute('href', '/config')
  })

  /**
   * O padrão é "só o grupo da rota abre". Os outros não estão FECHADOS por
   * capricho: com nove módulos abertos ao mesmo tempo a barra viraria uma
   * lista de quarenta linhas onde ninguém acha nada, que é o problema que o
   * modelo A resolve mantendo o mapa presente mas dobrado.
   */
  it('só o grupo da rota vem aberto; os outros ficam dobrados', async () => {
    setup('/compras/ordens')
    await esperarBarra()

    const grupo = (nome: string) => within(barra()).getByRole('button', { name: new RegExp(nome) })
    await waitFor(() => {
      expect(grupo('Compras')).toHaveAttribute('aria-expanded', 'true')
    })
    expect(grupo('Vendas')).toHaveAttribute('aria-expanded', 'false')

    // Dobrado quer dizer FORA do documento, não escondido por CSS: item que o
    // leitor de tela anuncia mas o olho não vê é pior que item ausente.
    expect(within(barra()).getByRole('link', { name: /Ordem de Compra/ })).toBeInTheDocument()
    expect(within(barra()).queryByRole('link', { name: 'Orçamentos' })).not.toBeInTheDocument()
  })

  it('abrir um grupo fica gravado por operador, e sobrevive à navegação', async () => {
    setup('/compras/ordens')
    const user = userEvent.setup()
    await esperarBarra()

    await user.click(within(barra()).getByRole('button', { name: /Vendas/ }))

    expect(within(barra()).getByRole('link', { name: 'Orçamentos' })).toBeInTheDocument()
    // A gaveta é do OPERADOR dentro da chave, e não a chave inteira: no balcão
    // onde dois usam a mesma máquina, um não herda o mapa do outro.
    const gravado = JSON.parse(localStorage.getItem('cabinet.nav.grupos') ?? '{}')
    expect(gravado['emp-1']).toContain('vendas')
    expect(gravado['emp-1']).toContain('compras')
  })

  it('o item da rota é o único ativo, e diz isso ao leitor de tela', async () => {
    setup('/compras/ordens')
    await esperarBarra()

    const ativo = await waitFor(() => {
      const alvo = barra().querySelector('[data-ativo="true"]')
      expect(alvo).toBeInTheDocument()
      return alvo as HTMLElement
    })
    expect(ativo).toHaveAttribute('href', '/compras/ordens')
    expect(ativo).toHaveAttribute('aria-current', 'page')
    expect(barra().querySelectorAll('[data-ativo="true"]')).toHaveLength(1)
  })

  /**
   * A ficha de um registro mantém a listagem acesa. Sem isso, abrir uma ordem
   * apagaria a única marca de "onde eu estou" da tela inteira.
   */
  it('a ficha de um registro mantém a listagem acesa', async () => {
    setup('/compras/ordens/9a1f')
    await esperarBarra()

    await waitFor(() => {
      expect(barra().querySelector('[data-ativo="true"]')).toHaveAttribute(
        'href',
        '/compras/ordens',
      )
    })
  })

  it('a ★ cria o grupo Favoritos, que não existia vazio', async () => {
    setup()
    const user = userEvent.setup()
    await esperarBarra()

    expect(within(barra()).queryByText('Favoritos')).not.toBeInTheDocument()

    await user.click(within(barra()).getByRole('button', { name: 'Marcar Dashboard' }))

    expect(within(barra()).getByText('Favoritos')).toBeInTheDocument()
    const favoritos = JSON.parse(localStorage.getItem('cabinet.nav.favoritos') ?? '{}')
    expect(favoritos['emp-1']).toEqual(['/dashboard'])
  })

  it('colapsa a 56px pelo botão e pela tecla, e o estado fica gravado', async () => {
    setup()
    const user = userEvent.setup()
    await esperarBarra()

    expect(barra()).toHaveAttribute('data-colapsada', 'false')

    await user.click(within(barra()).getByRole('button', { name: 'Recolher a navegação' }))

    expect(barra()).toHaveAttribute('data-colapsada', 'true')
    expect(barra().style.width).toBe('var(--nav-largura-colapsada)')
    // Colapsada, o nome some e o ícone fica com a dica — texto que não cabe em
    // 56px não é "truncado", é ilegível.
    expect(within(barra()).queryByText('Dashboard')).not.toBeInTheDocument()
    expect(within(barra()).getByTitle('Dashboard')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('cabinet.nav.colapsada') ?? '{}')['emp-1']).toBe(true)

    // `[` reabre — conveniência, e o botão continua sendo o caminho por clique.
    // `[[` e não `[`: no `user-event` o colchete abre um descritor de tecla
    // (`[KeyA]`), e o literal se escreve dobrado.
    await user.keyboard('[[')
    expect(barra()).toHaveAttribute('data-colapsada', 'false')
  })

  /**
   * A busca "Filtrar telas" existia para achar o que a barra por seção
   * ESCONDIA. Com a lista inteira presente ela virou uma segunda caixa de busca
   * a dois centímetros da primeira — a mesma pergunta feita duas vezes.
   */
  it('não há mais campo de filtrar telas na barra; a busca abre a paleta', async () => {
    setup()
    await esperarBarra()

    expect(barra().querySelector('input')).toBeNull()
    expect(screen.queryByLabelText('Filtrar telas')).not.toBeInTheDocument()
    expect(within(barra()).getByRole('button', { name: 'Abrir a busca' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+K',
    )
  })

  it('tela futura fica legível, com etiqueta, e não navega', async () => {
    setup()
    await esperarBarra()

    const futuro = within(barra()).getByText('Caixa de entrada').closest('[data-item]')
    expect(futuro).toHaveAttribute('data-futuro', 'true')
    expect(futuro).toHaveAttribute('aria-disabled', 'true')
    expect(futuro?.tagName).not.toBe('A')
    expect(futuro).toHaveTextContent('futuro')
  })

  /**
   * Auditoria §6, ressalva escrita sobre o Shopify: *"não entra: ícone em todo
   * item — só no primeiro de cada grupo; sub-itens são texto"*.
   */
  it('o ícone aparece só no primeiro item do grupo', async () => {
    setup()
    await esperarBarra()

    const hoje = within(barra()).getByRole('list', { name: 'Hoje' })
    const linhas = [...hoje.querySelectorAll('[data-item]')]
    expect(linhas.length).toBeGreaterThan(3)
    expect(linhas[0]?.querySelector('svg')).toBeInTheDocument()
    for (const linha of linhas.slice(1)) {
      expect(linha.querySelector('svg')).toBeNull()
    }
  })

  /** A marca e o seletor de empresa DESCERAM da appbar para o topo da barra. */
  it('marca, seletor de empresa e busca moram no topo da barra', async () => {
    setup()
    await esperarBarra()

    expect(barra().querySelector('[data-slot="marca"]')).toHaveAttribute(
      'data-variante',
      'assinatura',
    )
    await waitFor(() => {
      expect(within(barra()).getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    })
    // E não sobram na appbar: duplicata de identidade é o defeito que a §6
    // nomeia, na outra escala.
    const topo = document.querySelector('[data-slot="appbar"]') as HTMLElement
    expect(topo.querySelector('[data-slot="marca"]')).toBeNull()
    expect(topo).not.toHaveTextContent('VERTZ ILUMINAÇÃO')
  })

  it('o rodapé publica o operador, o papel dele e a saída', async () => {
    setup()
    const user = userEvent.setup()
    await esperarBarra()

    const avatar = await within(barra()).findByRole('button', { name: /Operador:/ })
    await user.click(avatar)

    expect(await screen.findByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Atalhos do teclado' })).toBeInTheDocument()
  })

  /**
   * RECENTES é de REGISTRO, não de tela: a listagem já está na barra, e repetir
   * "Clientes" ali não diria onde o operador estava.
   */
  it('abrir uma ficha alimenta Recentes; abrir a listagem não', async () => {
    const { unmount } = setup('/cadastros/clientes')
    await esperarBarra()
    await waitFor(() => {
      expect(barra().querySelector('[data-ativo="true"]')).toBeInTheDocument()
    })
    expect(localStorage.getItem('cabinet.nav.recentes')).toBeNull()
    unmount()

    setup('/cadastros/clientes/9a1f2b3c-0000')
    await esperarBarra()

    await waitFor(() => {
      expect(within(barra()).getByText('Recentes')).toBeInTheDocument()
    })
    const recentes = JSON.parse(localStorage.getItem('cabinet.nav.recentes') ?? '{}')
    expect(recentes['emp-1']?.[0]?.url).toBe('/cadastros/clientes/9a1f2b3c-0000')
    expect(recentes['emp-1']?.[0]?.rotulo).toBe('Clientes · 9a1f2b3c')
  })
})
