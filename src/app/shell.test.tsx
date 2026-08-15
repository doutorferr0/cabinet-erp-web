import { instalarServidor } from '@/test/servidor'
import { type FetchStub, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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
let fetchStub: FetchStub

beforeEach(() => {
  empresaAtiva = EMPRESAS[0]?.tenantId ?? null
  const servidor = instalarServidor({
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
  fetchStub = servidor.fetch
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setup(initialUrl = '/') {
  return renderRoute(initialUrl, fetchStub)
}

describe('AppShell', () => {
  /**
   * As SEIS seções vivem no topo, só com ícone — o nome existe em `aria-label`
   * e no tooltip. Buscar por texto acharia o rótulo do grupo da barra lateral e
   * passaria sem provar que a aba está lá; por PAPEL + NOME ACESSÍVEL, não.
   */
  it('as seis seções estão no topo, alcançáveis por nome', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    })

    const secoes = within(screen.getByRole('navigation', { name: 'Seções' }))
    for (const rotulo of ['Início', 'Comercial', 'Estoque', 'Financeiro', 'Pessoas', 'Catálogo']) {
      expect(secoes.getByRole('button', { name: rotulo })).toBeInTheDocument()
    }
    // Configurações é a SÉTIMA, oculta: fora da fileira, atrás da engrenagem.
    expect(secoes.queryByRole('button', { name: 'Configurações' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configurações' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
  })

  /**
   * A barra lateral é CONTEXTUAL: mostra a seção da rota, não o sistema
   * inteiro. Na raiz é Início — e Compras (de Estoque) não pode estar ali.
   */
  it('a barra mostra só a seção da rota', async () => {
    setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    })
    expect(barra().getByText('Hoje')).toBeInTheDocument()
    expect(barra().queryByText('Compras')).not.toBeInTheDocument()
    expect(barra().queryByRole('link', { name: 'Orçamentos' })).not.toBeInTheDocument()
  })

  it('a busca da barra filtra a seção, e diz quando não acha', async () => {
    setup('/compras/ordens')
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByText('Movimentação')).toBeInTheDocument()
    })

    // Filtra pela FILHA e mostra o pai com ela dentro — esconder o resultado
    // dentro de um pai fechado seria achar e não mostrar.
    await user.type(barra().getByRole('textbox'), 'pedido')
    await waitFor(() => {
      expect(barra().queryByText('Movimentação')).not.toBeInTheDocument()
    })
    expect(barra().getByRole('link', { name: 'Pedido de Compra' })).toBeInTheDocument()

    await user.clear(barra().getByRole('textbox'))
    await user.type(barra().getByRole('textbox'), 'zzz')
    expect(await barra().findByText(/Nenhuma tela desta seção/)).toBeInTheDocument()
  })

  /** Tela futura: visível, apagada NO FUNDO (regra Visual-1), com selo, e não navega. */
  it('tela futura aparece apagada, com selo, e não é link', async () => {
    setup('/estoque/movimentacao')
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByText('Reserva Técnica')).toBeInTheDocument()
    })
    expect(barra().queryByRole('link', { name: 'Reserva Técnica' })).not.toBeInTheDocument()

    const futuro = barra().getByText('Reserva Técnica').closest('[aria-disabled="true"]')
    expect(futuro).not.toBeNull()
    expect(futuro).toHaveTextContent('futuro')
    // Apagado no FUNDO, nunca na tinta: o item continua legível.
    expect(futuro?.className).toContain('bg-muted')
  })

  it('o item colapsável abre as filhas, e o estado fica lembrado', async () => {
    setup('/estoque/movimentacao')
    const user = userEvent.setup()
    // A barra só existe depois do primeiro render — esperar por ela antes de
    // estreitar o escopo, senão o `querySelector` devolve `null`. Pelo SLOT, e
    // não por texto: `Movimentação` é o nome da tela E do item, e aparece duas
    // vezes no documento.
    await waitFor(() => {
      expect(document.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
    })
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    const pai = await barra().findByRole('button', { name: /Compras/ })
    expect(pai).toHaveAttribute('aria-expanded', 'false')
    expect(barra().queryByRole('link', { name: 'Ordem de Compra' })).not.toBeInTheDocument()

    await user.click(pai)
    expect(await barra().findByRole('link', { name: 'Ordem de Compra' })).toBeInTheDocument()
    expect(barra().getByRole('button', { name: /Compras/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    // Lembrado por SESSÃO: quem abriu de manhã não reabre a cada tela.
    expect(sessionStorage.getItem('cabinet.nav.abertos.v1')).toContain('Compras')
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

  it('tela sem módulo próprio empresta a cor do vizinho e leva desenho seu', async () => {
    // Dashboard, Planner e Colaboradores estão fora da tabela de shape×cor
    // travada pelo user. Antes saíam em lucide cinza no meio de uma fileira
    // colorida; `mockup-dashboard-cores.html` resolveu sem inventar cor nova.
    setup()
    await waitFor(() => {
      expect(screen.getByText('Planner')).toBeInTheDocument()
    })

    // Busca pela URL, não pelo texto: `Dashboard` nomeia o GRUPO e o item, e
    // `getByText` acharia os dois. Colaboradores não entra aqui porque a
    // empresa padrão do teste não opera o recurso — a atribuição dele está
    // travada em `navigation.test.ts`, sobre o dado.
    const esperado: Array<[string, string, string]> = [
      ['/dashboard', 'boletim', 'dashboard'],
      ['/planner', 'boletim', 'planner'],
    ]

    for (const [url, modulo, shape] of esperado) {
      const item = document.querySelector(`a[href="${url}"]`)?.closest('[data-sidebar="menu-item"]')
      // A cor emprestada vale para o ITEM e para no item: `moduloDaRota`
      // continua sem conhecer essas rotas, senão a folha inteira seria tingida.
      expect(item).toHaveAttribute('data-modulo', modulo)
      expect(item?.querySelector('[data-slot="ornamento"]')).toHaveAttribute('data-shape', shape)
    }

    // Quem empresta a cor mantém o PRÓPRIO desenho: três shapes iguais em
    // coral fariam a fileira deixar de ser mapa. O Boletim também prova que a
    // entrada solta no topo entrou na fileira colorida — ela ficava de fora do
    // laço dos grupos e caía num lucide cinza.
    const boletim = document.querySelector('a[href="/"]')?.closest('[data-sidebar="menu-item"]')
    expect(boletim).toHaveAttribute('data-modulo', 'boletim')
    expect(boletim?.querySelector('[data-slot="ornamento"]')).toHaveAttribute(
      'data-shape',
      'boletim',
    )
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

    // A marca e a empresa DESCERAM para a appbar (Nav-2): a barra lateral
    // virou contextual, e o que não muda — produto, escopo do dado — não pode
    // morar dentro do que muda a cada seção.
    const topo = document.querySelector('[data-slot="appbar"]')
    expect(topo).toBeInTheDocument()
    // O rodapé deixou de existir: não sobrou nada para pousar lá.
    expect(document.querySelector('[data-slot="sidebar-footer"]')).toBeNull()

    // Marca do produto em cima, escopo do dado embaixo — nesta ordem. Desde
    // 2026-08-13 a marca é o símbolo do user (`<Marca>`), não mais um shape do
    // acervo: o topo tem UM ornamento só, o da empresa.
    const marca = topo?.querySelector('[data-slot="marca"]')
    expect(marca).toHaveAttribute('data-variante', 'assinatura')
    // O nome do produto é DESENHO, não texto — quem o anuncia é o rótulo.
    expect(marca).toHaveAttribute('aria-label', 'Cabinet')
    const ornamentos = topo?.querySelectorAll('[data-slot="ornamento"]') ?? []
    expect(ornamentos).toHaveLength(1)
    expect(ornamentos[0]).toHaveAttribute('data-shape', 'empresa')
    expect(topo).toHaveTextContent('VERTZ ILUMINAÇÃO')

    // Linhas distintas: só a empresa mora dentro do botão que abre a gaveta.
    expect(marca?.closest('[data-sidebar="menu-button"]')).toBeNull()
    expect(ornamentos[0]?.closest('[data-sidebar="menu-button"]')).not.toBeNull()
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
  /**
   * Os três cadastros com recurso vivem em seções diferentes desde a Nav-2:
   * Profissional Externo e Colaboradores em Pessoas, Fornecedores em Catálogo.
   * A barra é contextual, então a asserção acontece DENTRO da seção de cada um
   * — e é isso que prova que a regra é do dado, não do desenho da barra.
   */
  it('cadastros da empresa somem ao trocar para a empresa que não os opera', async () => {
    setup('/cadastros/clientes')
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Profissional Externo' })).toBeInTheDocument()
    })
    expect(barra().getByRole('link', { name: 'Colaboradores' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /vertz iluminação/i }))
    await user.click(await screen.findByRole('button', { name: /via hf/i }))
    // Escolher na gaveta PROPÕE; quem troca é o alerta.
    await user.click(await screen.findByRole('button', { name: /^trocar empresa$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Profissional Externo' })).not.toBeInTheDocument()
    })
    for (const item of GATED) {
      expect(screen.queryByRole('link', { name: item })).not.toBeInTheDocument()
    }
    // O que não depende de recurso continua: a seção não sumiu junto.
    expect(barra().getByRole('link', { name: 'Clientes' })).toBeInTheDocument()
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

  /**
   * O mapa de tabelas é arquivo estático (`public/mapeamento-tabelas.html`),
   * não tela do roteador. Se sair como `<Link>`, o clique vira navegação
   * client-side para uma rota que não existe: 404 dentro da SPA, com o arquivo
   * servido pelo mesmo domínio ali do lado.
   */
  it('o item de referência sai da SPA por âncora, e em aba nova', async () => {
    // Mora em Configurações desde a Nav-2 — fora do caminho de operação. A
    // barra dele só existe numa rota da seção.
    setup('/crm/funis')
    const item = await screen.findByRole('link', { name: /Mapeamento de Tabelas/ })

    expect(item).toHaveAttribute('href', '/mapeamento-tabelas.html')
    expect(item).toHaveAttribute('target', '_blank')
    expect(item).toHaveAttribute('rel', 'noreferrer')
    // Quem lê a barra com os olhos tem o cartão de hover; para leitor de tela o
    // cartão não existe, e a aba nova precisa ser anunciada em algum lugar.
    expect(item).toHaveTextContent('(abre em nova aba)')
  })

  // APPBAR GLOBAL (§@casca-global): vive no LAYOUT, não na página — o mesmo
  // teste em duas rotas sem módulo em comum é o que prova isso, em vez de só
  // conferir numa tela só.
  describe('appbar global', () => {
    it('aparece em toda rota, com paleta, engrenagem e sino', async () => {
      for (const rota of ['/', '/cadastros/clientes']) {
        const { unmount } = setup(rota)
        await waitFor(() => {
          expect(document.querySelector('[data-slot="appbar"]')).toBeInTheDocument()
        })
        expect(
          screen.getByRole('button', { name: 'Abrir a paleta de comandos' }),
        ).toBeInTheDocument()
        // A engrenagem deixou de ser o botão apagado que dizia "ainda não
        // existe": Configurações EXISTE agora, e é a sétima seção.
        expect(screen.getByRole('button', { name: 'Configurações' })).toBeEnabled()
        expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument()
        unmount()
      }
    })

    // O campo de busca da appbar era CHROME: aceitava digitação e não fazia
    // nada. Virou o caminho por CLIQUE da paleta — a decisão de interface do
    // CLAUDE.md não admite função que só exista por tecla.
    it('o campo de busca abre a PALETA, e não é mais um input mudo', async () => {
      setup()
      const user = userEvent.setup()
      const gatilho = await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

      // Botão com cara de campo: input abriria diálogo ao digitar, mentindo
      // sobre o que a tecla vai fazer.
      expect(gatilho.tagName).toBe('BUTTON')
      expect(gatilho).toHaveAttribute('aria-keyshortcuts', 'Control+K')

      await user.click(gatilho)

      expect(
        await screen.findByPlaceholderText(/Ir para uma tela ou incluir um registro/),
      ).toBeInTheDocument()
    })

    it('Ctrl+K abre a paleta de qualquer lugar — conveniência, não requisito', async () => {
      setup()
      const user = userEvent.setup()
      await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

      await user.keyboard('{Control>}k{/Control}')

      expect(
        await screen.findByPlaceholderText(/Ir para uma tela ou incluir um registro/),
      ).toBeInTheDocument()
    })

    it('a paleta navega, e o comando da tela atual vem primeiro', async () => {
      const { router } = setup('/cadastros/clientes')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Abrir a paleta de comandos' }))

      await screen.findByPlaceholderText(/Ir para uma tela ou incluir um registro/)
      expect(screen.getByText('Nesta tela')).toBeInTheDocument()

      await user.click(await screen.findByRole('menuitem', { name: /Novo cliente/ }))

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/cadastros/clientes/novo')
      })
    })

    /**
     * O comando do mapa de tabelas é o único que NÃO navega. `navigate({ to })`
     * ali seria rota inexistente — o operador pediria o mapa e receberia o 404
     * do roteador, com o arquivo servido pelo mesmo domínio ali do lado.
     *
     * O teste vale pela ROTA que não muda tanto quanto pelo `window.open`: sem
     * ele, o desvio pode sumir da paleta sem nada acusar, porque a marca no
     * item e a marca no comando continuariam certas.
     */
    it('destino externo abre em aba nova, e a rota atual não muda', async () => {
      const abrir = vi.fn()
      vi.stubGlobal('open', abrir)

      const { router } = setup('/cadastros/clientes')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Abrir a paleta de comandos' }))
      await screen.findByPlaceholderText(/Ir para uma tela ou incluir um registro/)

      await user.click(await screen.findByRole('menuitem', { name: /Mapeamento de Tabelas/ }))

      expect(abrir).toHaveBeenCalledWith('/mapeamento-tabelas.html', '_blank', 'noreferrer')
      expect(router.state.location.pathname).toBe('/cadastros/clientes')
    })

    it('o sino abre a gaveta, que EMPURRA — sem fixed, sem véu', async () => {
      setup()
      const user = userEvent.setup()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument()
      })

      const gaveta = () => document.querySelector('[data-slot="gaveta-notificacoes"]')
      expect(gaveta()).toHaveAttribute('data-aberta', 'false')

      await user.click(screen.getByRole('button', { name: /Notificações/ }))

      expect(gaveta()).toHaveAttribute('data-aberta', 'true')
      // Coluna flex de verdade, não overlay: nunca `fixed`.
      expect(getComputedStyle(gaveta() as Element).position).not.toBe('fixed')
      expect(await screen.findByText('Notificações')).toBeInTheDocument()

      // X fecha.
      await user.click(screen.getByRole('button', { name: 'Fechar notificações' }))
      expect(gaveta()).toHaveAttribute('data-aberta', 'false')
    })

    it('Esc fecha a gaveta', async () => {
      setup()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: /Notificações/ }))
      expect(document.querySelector('[data-slot="gaveta-notificacoes"]')).toHaveAttribute(
        'data-aberta',
        'true',
      )

      await user.keyboard('{Escape}')

      expect(document.querySelector('[data-slot="gaveta-notificacoes"]')).toHaveAttribute(
        'data-aberta',
        'false',
      )
    })

    it('o badge conta as não lidas, e marcar como lida abate o contador', async () => {
      setup()
      const user = userEvent.setup()
      // Dado de mock (`src/mocks/notificacoes.ts`): 3 de 4 nascem não lidas.
      expect(
        await screen.findByRole('button', { name: 'Notificações, 3 não lidas' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Notificações/ }))
      const primeiraNaoLida = screen.getAllByRole('button', { name: 'Marcar como lida' })[0]
      await user.click(primeiraNaoLida as HTMLElement)

      expect(
        await screen.findByRole('button', { name: 'Notificações, 2 não lidas' }),
      ).toBeInTheDocument()
    })
  })
})
