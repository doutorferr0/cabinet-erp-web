import { Providers } from '@/app/providers'
import { routeTree } from '@/routeTree.gen'
import { instalarServidor } from '@/test/servidor'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O RODAPÉ da sidebar mostra a empresa ATIVA da sessão, que vem do backend.
 * Sem servidor falso, o shell abriria em "Empresas indisponíveis". O contrato
 * dessa fronteira é exercitado em `company-switcher.test.tsx`; aqui ele só
 * precisa responder.
 */
/**
 * As duas empresas diferem no que OPERAM (`features`, campo do contrato), não
 * só no nome: a VERTZ compra e emprega, a VIA HF só vende. É o par que prova
 * que o menu é da empresa ativa e não do sistema.
 */
const EMPRESAS = [
  {
    tenantId: 'aaaa-1111',
    name: 'VERTZ ILUMINAÇÃO',
    role: 'owner',
    features: ['suppliers', 'professionals', 'employees'],
  },
  { tenantId: 'bbbb-2222', name: 'VIA HF', role: 'operator-sales', features: [] },
]

/** Os itens de Cadastros que dependem de recurso da empresa. */
const GATED = ['Fornecedores', 'Profissional Externo', 'Colaboradores']

let empresaAtiva: string | null = EMPRESAS[0]?.tenantId ?? null

beforeEach(() => {
  empresaAtiva = EMPRESAS[0]?.tenantId ?? null
  instalarServidor({
    '/auth/tenants': () => EMPRESAS,
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: empresaAtiva,
      expiresAt: '2026-08-01T00:00:00Z',
    }),
    '/auth/active-tenant': ({ corpo }) => {
      empresaAtiva = (corpo as { tenantId: string }).tenantId
      return new Response(null, { status: 204 })
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setup(initialUrl = '/') {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
    defaultPreload: 'intent',
  })
  const view = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, ...view }
}

describe('AppShell', () => {
  it('renders sidebar modules and header controls', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
      expect(screen.getByText('Cadastros')).toBeInTheDocument()
    })
    for (const moduleName of ['Estoque', 'Vendas', 'Compras']) {
      expect(screen.getByText(moduleName)).toBeInTheDocument()
    }
  })

  // `data-active={false}` vira `data-active="false"` no DOM — React não omite
  // `false` em `data-*` — e a variante do Tailwind casa por PRESENÇA. Com o
  // atributo sempre escrito, os nove itens se pintavam de ativo e a sidebar
  // inteira ficava acesa. CONTAR é o que pega: asserção sobre o item certo
  // passaria igual com todos ligados.
  it('só o módulo da rota fica aceso na sidebar', async () => {
    setup('/cadastros/fornecedores')
    await waitFor(() => {
      expect(screen.getByText('Fornecedores')).toBeInTheDocument()
    })
    const acesos = document.querySelectorAll('[data-sidebar="menu-button"][data-active]')
    expect(acesos).toHaveLength(1)
    expect(acesos[0]).toHaveTextContent('Fornecedores')
  })

  // Marca e empresa ativa agora dividem o CABEÇALHO, em linhas distintas
  // (decisão do user, 2026-08-07 — revoga o rodapé). O teto de densidade segue
  // valendo: o que ele proíbe é dois ornamentos disputando a mesma leitura, não
  // dois em linhas separadas. O que este teste trava é a separação — o selo do
  // produto NÃO pode ser absorvido pelo botão que abre a gaveta de empresa.
  it('marca e empresa ativa no topo, em linhas distintas', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    })

    const topo = document.querySelector('[data-slot="sidebar-header"]')
    expect(topo).toBeInTheDocument()
    // O rodapé deixou de existir: não sobrou nada para pousar lá.
    expect(document.querySelector('[data-slot="sidebar-footer"]')).toBeNull()

    // Selo do sistema em cima, escopo do dado embaixo — nesta ordem. O emblema
    // (shape-185) é o selo; `marca` (shape-182) é a composição do login.
    const ornamentos = topo?.querySelectorAll('[data-slot="ornamento"]') ?? []
    expect(ornamentos).toHaveLength(2)
    expect(ornamentos[0]).toHaveAttribute('data-shape', 'emblema')
    expect(ornamentos[1]).toHaveAttribute('data-shape', 'empresa')
    expect(topo).toHaveTextContent('Cabinet')
    expect(topo).toHaveTextContent('VERTZ ILUMINAÇÃO')

    // Linhas distintas: só a empresa mora dentro do botão que abre a gaveta.
    expect(ornamentos[0]?.closest('[data-sidebar="menu-button"]')).toBeNull()
    expect(ornamentos[1]?.closest('[data-sidebar="menu-button"]')).not.toBeNull()
  })

  it('switches active company via drawer', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vertz iluminação/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /vertz iluminação/i }))
    // Gaveta, não menu suspenso: trocar de empresa muda o escopo de tudo que
    // está aberto, e a escolha é um botão de alvo grande dentro dela.
    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    // E a escolha não é a troca: o alerta é onde o operador responde "sim".
    await user.click(await screen.findByRole('button', { name: /^trocar empresa$/i }))
    expect(screen.getByText('VIA HF')).toBeInTheDocument()
  })

  // O MENU É DA EMPRESA ATIVA. Trocar de empresa não muda só o rótulo do
  // rodapé: os cadastros que a empresa não opera saem da barra. Asserção nos
  // dois sentidos de propósito — some o que é da empresa, FICA o que é de toda
  // empresa (Clientes, Produtos); um filtro largo demais passaria no primeiro.
  it('cadastros da empresa somem ao trocar para a empresa que não os opera', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vertz iluminação/i })).toBeInTheDocument()
    })
    // `Clientes` aparece na barra E no boletim — a presença se afere DENTRO da
    // barra; a ausência, no documento inteiro, porque as duas listas seguem a
    // mesma regra e nenhuma pode oferecer o que a empresa não opera.
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)
    for (const item of GATED) {
      expect(barra().getByRole('link', { name: item })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: /vertz iluminação/i }))
    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    // Escolher na gaveta PROPÕE; quem troca é o alerta.
    await user.click(await screen.findByRole('button', { name: /^trocar empresa$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Fornecedores' })).not.toBeInTheDocument()
    })
    for (const item of GATED) {
      expect(screen.queryByRole('link', { name: item })).not.toBeInTheDocument()
    }
    expect(barra().getByRole('link', { name: 'Clientes' })).toBeInTheDocument()
    expect(barra().getByRole('link', { name: 'Produtos' })).toBeInTheDocument()
  })

  // Esconder o item da barra não fecha a porta: o endereço continua digitável
  // (link salvo da outra empresa). A tela precisa DIZER que é da empresa, e não
  // abrir uma listagem vazia — "não opera" e "não tem cadastro" não podem virar
  // a mesma imagem.
  it('URL direta de cadastro que a empresa não opera avisa em vez de listar', async () => {
    empresaAtiva = EMPRESAS[1]?.tenantId ?? null
    setup('/cadastros/fornecedores')

    expect(await screen.findByText('Fornecedores não faz parte desta empresa')).toBeInTheDocument()
    expect(screen.getByText(/VIA HF não opera este cadastro/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Incluir' })).not.toBeInTheDocument()
  })

  it('toggles theme and updates document class', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
    })
    const toggle = screen.getByRole('button', { name: /alternar tema/i })
    expect(document.documentElement.classList.contains('light')).toBe(true)
    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(toggle)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  // A rota `/` deixou de ser o menu vazio e virou o Boletim (PRODUCT.md
  // nomeia a entrada atual como buraco: "no lugar do menu vazio atual").
  it('displays dashboard content on home route', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    })
  })

  it('wraps route content in the page-frame folha (Regra da Folha)', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    })
    const frame = document.querySelector('[data-slot="page-frame"]')
    expect(frame).toBeInTheDocument()
    expect(frame).toContainElement(screen.getByRole('heading', { name: 'Boletim' }))
  })
})
