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

/** A fileira de seções da topbar — escopo pelo `aria-label`, que é o contrato. */
function fileira() {
  return within(
    document.querySelector('[data-slot="appbar"] nav[aria-label="Seções"]') as HTMLElement,
  )
}

describe('AppShell', () => {
  /**
   * POLARIS (sidebar-first, 2026-08-17): as seções moram na BARRA LATERAL,
   * com rótulo visível — a fileira de ícones anônimos do topo morreu.
   *
   * A barra lista o que se OPERA, e só isso: Configurações saiu dela e virou
   * página (`/config`), alcançada pela engrenagem da topbar. Um bloco de
   * visita rara cobrava espaço permanente no caminho de todo dia.
   */
  it('as sete seções de operação estão na barra; Configurações não', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    })

    const secoes = within(screen.getByRole('navigation', { name: 'Seções' }))
    // Seção com tela é `<Link>` — o destino é rota de verdade e abre em outra
    // aba pelo navegador. `Financeiro`, que só tem tela futura, é `<button>`:
    // não há para onde apontar, e um href inventado daria 404.
    for (const rotulo of ['Início', 'Comercial', 'CRM', 'Estoque', 'Pessoas', 'Catálogo']) {
      expect(secoes.getByRole('link', { name: rotulo })).toHaveAttribute('href')
    }
    expect(secoes.getByRole('button', { name: 'Financeiro' })).not.toHaveAttribute('href')
    expect(secoes.queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument()
    // O único caminho até ela: a engrenagem da topbar, que NAVEGA.
    const topo = within(document.querySelector('[data-slot="appbar"]') as HTMLElement)
    expect(topo.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/config')
    expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
  })

  /**
   * DOIS caminhos até Configurações, e é de propósito: a engrenagem é ícone
   * sem palavra, e quem não a associa ao destino precisa achá-lo escrito.
   */
  it('o menu do operador leva a Configurações, por escrito', async () => {
    setup()
    const user = userEvent.setup()

    const avatar = await screen.findByRole('button', { name: /Henrique|Usuário/i })
    await user.click(avatar)

    const item = await screen.findByRole('menuitem', { name: 'Configurações' })
    await user.click(item)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    })
  })

  /**
   * O CRM inteiro numa seção própria (decisão do user, 2026-08-17): o quadro
   * e o que o monta, lado a lado. Antes o quadro estava em Comercial e a
   * configuração dele em Configurações — duas casas para o mesmo assunto.
   */
  it('a seção CRM abre com o quadro e os cadastros dele', async () => {
    setup('/crm/funil')
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Oportunidades' })).toBeInTheDocument()
    })
    expect(barra().getByRole('link', { name: 'Funis' })).toBeInTheDocument()
    expect(barra().getByRole('link', { name: 'Motivos de Perda' })).toBeInTheDocument()
  })

  /**
   * A divisão do trabalho no shell v7: a FILEIRA do topo é o mapa das seções e
   * a BARRA é o detalhe de UMA delas. Na raiz, Início expõe o Dashboard e o
   * conteúdo das outras seções (Compras, Orçamentos) não está no documento —
   * não é "fechado", é outro lugar.
   */
  it('a fileira lista as seções e a barra mostra só a escolhida', async () => {
    setup()
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    })
    expect(fileira().getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    expect(fileira().getByRole('link', { name: 'Estoque' })).not.toHaveAttribute('aria-current')
    // Configurações não está na fileira — é página, atrás da engrenagem.
    expect(fileira().queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument()

    expect(barra().getByText('Hoje')).toBeInTheDocument()
    expect(barra().queryByText('Compras')).not.toBeInTheDocument()
    expect(barra().queryByRole('link', { name: 'Orçamentos' })).not.toBeInTheDocument()

    // Escolher Estoque LEVA à primeira tela dela, e a barra troca junto.
    await user.click(fileira().getByRole('link', { name: 'Estoque' }))
    // 'Compras' existe duas vezes de propósito — rótulo do grupo e item pai
    // colapsável; a asserção mira o item, que é o que o operador clica.
    expect(await barra().findByRole('button', { name: 'Compras' })).toBeInTheDocument()
    expect(barra().queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fileira().getByRole('link', { name: 'Estoque' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })
  })

  /**
   * Ícone é mudo — e o preço se paga em três lugares. Este teste cobra os três
   * que vivem no DOM: nome acessível em TODOS os ícones (é o que o leitor de
   * tela anuncia), o `data-rotulo` de onde a dica em CSS tira o texto, e
   * alcance por teclado.
   */
  it('todo ícone da fileira tem nome acessível, dica e alcance por teclado', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(fileira().getByRole('link', { name: 'Início' })).toBeInTheDocument()
    })

    // Direto no `nav`, e não pelos filhos: o `TooltipTrigger` do react-aria
    // não põe wrapper no DOM (a dica sai em portal), então o filho JÁ é o
    // gatilho — um `querySelector` dentro dele devolvia `null`.
    const icones = [
      ...(
        document.querySelector('[data-slot="appbar"] nav[aria-label="Seções"]') as HTMLElement
      ).querySelectorAll<HTMLElement>('a,button'),
    ]
    // As sete seções operáveis — o teto subiu de seis para sete quando CRM
    // virou seção (#204), e é o mesmo número que `navigation.test.ts` trava.
    expect(icones).toHaveLength(7)
    for (const icone of icones) {
      const rotulo = icone.getAttribute('aria-label')?.trim()
      expect(rotulo).toBeTruthy()
      // Nome no rótulo, nunca no texto: o ícone é `aria-hidden`, e sobra `''`.
      expect(icone.textContent).toBe('')
      // A dica em CSS lê `data-rotulo`; sem ele o `content: attr(...)` sai
      // vazio e o ícone fica mudo para quem usa mouse — falha SILENCIOSA, que
      // é a razão de a guarda ser aqui e não no olho.
      expect(icone.getAttribute('data-rotulo')).toBe(rotulo)
      expect(icone.className).toContain('after:content-[attr(data-rotulo)]')
      // Hover NÃO basta: quem chega de Tab lê o mesmo rótulo.
      expect(icone.className).toContain('focus-visible:after:opacity-100')
    }

    const primeiro = icones[0] as HTMLElement
    primeiro.focus()
    expect(primeiro).toHaveFocus()
    await user.tab()
    expect(icones[1]).toHaveFocus()
  })

  /**
   * `Financeiro` só publica tela futura: `destinoDaSecao` devolve `undefined`,
   * o ícone é `<button>` e clicar ABRE o menu sem navegar. É a metade da
   * fileira que não pode virar 404.
   */
  it('seção só com tela futura abre o menu sem navegar', async () => {
    setup()
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)
    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    })

    await user.click(fileira().getByRole('button', { name: 'Financeiro' }))

    expect(await barra().findByText('Contas a Receber')).toBeInTheDocument()
    expect(barra().queryByRole('link', { name: 'Contas a Receber' })).not.toBeInTheDocument()
    // O rastro conta a ROTA, que não mudou — o menu abriu, o operador não saiu.
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toHaveTextContent('Início')
  })

  /**
   * REGRESSÃO: voltar para a seção da PRÓPRIA rota depois de espiar outra.
   *
   * O ícone de seção é `<Link>`, e clicar no de Estoque estando em
   * `/estoque/movimentacao` não muda o caminho — não há navegação para
   * `secaoDaRota` reavaliar. Enquanto só o `<button>` avisava a escolha, a
   * escolha ANTERIOR (Financeiro) sobrevivia ao clique: a barra continuava
   * listando Contas a Receber e o fio ficava aceso na seção errada.
   *
   * A asserção mira o DESTAQUE (`bg-modulo`, que é o que o `ativa` liga) e o
   * conteúdo da barra, não `aria-current`: o `<Link>` do router marca
   * `aria-current` sozinho quando a rota casa, então Estoque já o tinha
   * enquanto o operador via Financeiro na tela. Foi por isso que o defeito
   * passou por baixo dos testes que existiam.
   */
  it('voltar para a seção da rota depois de espiar outra', async () => {
    setup('/estoque/movimentacao')
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar"]') as HTMLElement)
    // `classList`, e não `className.includes`: o ícone também carrega
    // `hover:bg-modulo`, e uma busca por substring dava verde em todos.
    const destacado = (nome: string) =>
      (
        (
          document.querySelector('[data-slot="appbar"] nav[aria-label="Seções"]') as HTMLElement
        ).querySelector(`[aria-label="${nome}"]`) as HTMLElement
      ).classList.contains('bg-modulo')

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Movimentação' })).toBeInTheDocument()
    })
    expect(destacado('Estoque')).toBe(true)

    await user.click(fileira().getByRole('button', { name: 'Financeiro' }))
    expect(await barra().findByText('Contas a Receber')).toBeInTheDocument()
    expect(destacado('Financeiro')).toBe(true)

    // O mesmo destino da rota atual: o clique não navega, e mesmo assim manda.
    await user.click(fileira().getByRole('link', { name: 'Estoque' }))
    expect(await barra().findByRole('link', { name: 'Movimentação' })).toBeInTheDocument()
    expect(barra().queryByText('Contas a Receber')).not.toBeInTheDocument()
    expect(destacado('Estoque')).toBe(true)
    expect(destacado('Financeiro')).toBe(false)
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
    // A recusa NOMEIA a seção: a busca é contextual, e "não achei" sem dizer
    // onde procurou faria o operador concluir que a tela não existe.
    expect(await barra().findByText(/Nenhuma tela de Estoque casa/)).toBeInTheDocument()
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
    // Apagado no FUNDO, nunca na tinta — e desde a fusão v5 r4 o fundo apagado
    // da sidebar escura é o accent dela rebaixado, não o muted claro (que
    // virava holofote sobre o carvão).
    expect(futuro?.className).toContain('bg-sidebar-accent/60')
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
      // 'Fornecedores' também aparece no rastro do header (Seção / Tela) —
      // a espera mira o LINK da sidebar, que é o que o teste conta depois.
      expect(screen.getByRole('link', { name: 'Fornecedores' })).toBeInTheDocument()
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

  // POLARIS (2026-08-17): a MARCA mora na topbar, à esquerda — a posição do
  // logo no admin Shopify — e a EMPRESA segue nos globais da direita, ao lado
  // do operador. A navegação desceu pra sidebar; marca e navegação não
  // disputam mais o mesmo painel.
  it('marca na topbar, empresa nos globais', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    })

    const topo = document.querySelector('[data-slot="appbar"]')
    expect(topo).toBeInTheDocument()
    // O rodapé segue extinto: não sobrou nada para pousar lá.
    expect(document.querySelector('[data-slot="sidebar-footer"]')).toBeNull()

    // A marca mora na TOPBAR, e só lá.
    const marca = topo?.querySelector('[data-slot="marca"]')
    expect(marca).toHaveAttribute('data-variante', 'assinatura')
    // O nome do produto é DESENHO, não texto — quem o anuncia é o rótulo.
    expect(marca).toHaveAttribute('aria-label', 'Cabinet')
    expect(document.querySelector('[data-slot="sidebar-header"] [data-slot="marca"]')).toBeNull()

    // A empresa mora na appbar: um ornamento só, o dela.
    const ornamentos = topo?.querySelectorAll('[data-slot="ornamento"]') ?? []
    expect(ornamentos).toHaveLength(1)
    expect(ornamentos[0]).toHaveAttribute('data-shape', 'empresa')
    expect(topo).toHaveTextContent('VERTZ ILUMINAÇÃO')

    // E dentro do botão que abre a gaveta — a marca nunca é absorvida por ele.
    expect(ornamentos[0]?.closest('button')).not.toBeNull()
    expect(marca?.closest('button')).toBeNull()
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
    // Mora na PÁGINA de Configurações desde 2026-08-17 — fora do caminho de
    // operação, e fora da barra lateral também.
    setup('/config')
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
        // existe": Configurações é PÁGINA, e a engrenagem leva até ela.
        expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
          'href',
          '/config',
        )
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

      expect(await screen.findByPlaceholderText(/nome\/número de um registro/)).toBeInTheDocument()
    })

    it('Ctrl+K abre a paleta de qualquer lugar — conveniência, não requisito', async () => {
      setup()
      const user = userEvent.setup()
      await screen.findByRole('button', { name: 'Abrir a paleta de comandos' })

      await user.keyboard('{Control>}k{/Control}')

      expect(await screen.findByPlaceholderText(/nome\/número de um registro/)).toBeInTheDocument()
    })

    it('a paleta navega, e o comando da tela atual vem primeiro', async () => {
      const { router } = setup('/cadastros/clientes')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Abrir a paleta de comandos' }))

      await screen.findByPlaceholderText(/nome\/número de um registro/)
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
      await screen.findByPlaceholderText(/nome\/número de um registro/)

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
  /**
   * A GUARDA DO CONTRASTE — issue #140, último item da DoD.
   *
   * A cheia `/01` do módulo é neon: ela mede 1,36–2,63:1 contra o fundo da
   * barra no tema claro e 1,39–2,40:1 contra a própria `/02`
   * (§tabela:nav-estados do `DESIGN.md`), as duas abaixo do piso de 3:1 da
   * WCAG 1.4.11. Enquanto ela foi o preenchimento do item ativo, o fio da
   * seção ativa e um dos lados do par do ícone, três sinais da navegação eram
   * invisíveis no tema claro — e o rótulo do item ativo reprovava AA no escuro
   * (2,45:1, §tabela:estados-fundo).
   *
   * O teste é INVERTIDO de propósito: ele não confere que a barra está bonita,
   * confere que a `/01` não voltou a carregar texto, ícone ou sinal de estado.
   * Sem ele, a próxima mão que achasse o pastel apagado devolveria o neon e
   * nada ficaria vermelho.
   */
  describe('contraste da navegação (#140)', () => {
    /**
     * Tudo aqui se mede na RAIZ, e não numa rota de módulo, porque só a seção
     * da rota vem aberta: entrar em `/produtos` deixaria os itens de Catálogo
     * montados e os das outras seis fora do DOM. Na raiz, Início está aberta e
     * o Boletim (`/`) é o item ATIVO — o par ativo × inativo que a guarda
     * precisa cabe dentro de uma seção só.
     */
    async function itemDaBarra(url: string): Promise<HTMLElement> {
      return await waitFor(() => {
        const alvo = document.querySelector(`[data-slot="sidebar"] a[href="${url}"]`)
        expect(alvo).toBeInTheDocument()
        return alvo as HTMLElement
      })
    }

    it('a /01 do módulo não pinta fundo de texto nem sinal de estado na barra', async () => {
      setup()
      await itemDaBarra('/')

      const barra = document.querySelector('[data-slot="sidebar"]')
      // O ÚNICO uso legítimo da /01 na barra é o quadradinho do grupo: 8px,
      // `aria-hidden`, sem nada pousado em cima. Qualquer outro é regressão.
      const cheias = [...(barra?.querySelectorAll('.bg-modulo-cheia') ?? [])]
      expect(cheias.length).toBeGreaterThan(0)
      for (const peca of cheias) {
        expect(peca).toHaveClass('size-2')
        expect(peca).toHaveAttribute('aria-hidden', 'true')
        expect(peca.textContent).toBe('')
        expect(peca.children).toHaveLength(0)
      }
    })

    it('o item ativo é distinguido por barra e negrito, não pela cheia /01', async () => {
      setup()
      const item = await itemDaBarra('/')

      expect(item).toHaveAttribute('data-active', 'true')
      // As duas marcas que sobrevivem à troca de fundo, e que já existiam.
      expect(item.className).toContain('data-active:border-l-foreground')
      expect(item.className).toContain('data-active:font-bold')
      // A superfície do ativo é a MESMA /02 do hover — tinta × /02 mede
      // 16,88:1 no claro e 9,32:1 no escuro.
      expect(item.className).toContain('data-active:bg-modulo ')
      expect(item.className).not.toContain('data-active:bg-modulo-cheia')
    })

    it('o ícone do item não troca de tom com o estado — herda a tinta do rótulo', async () => {
      setup()
      const ativo = (await itemDaBarra('/')).querySelector('[data-slot="ornamento"]')
      const inativo = (await itemDaBarra('/dashboard')).querySelector('[data-slot="ornamento"]')
      expect(ativo).toBeInTheDocument()
      expect(inativo).toBeInTheDocument()

      // O par que reprovava era o ícone contra o PRÓPRIO fundo, e ele nascia
      // de o ícone e a superfície trocarem de tom juntos, em sentidos opostos.
      // Sem tom de módulo no ícone, o par deixa de existir nos dois estados.
      for (const icone of [ativo, inativo]) {
        expect(icone).not.toHaveClass('text-modulo')
        expect(icone).not.toHaveClass('text-modulo-suave')
      }
      // O módulo continua sendo dito pelo SHAPE — é isso que sobra no ícone.
      expect(ativo).toHaveAttribute('data-shape', 'boletim')
      expect(inativo).toHaveAttribute('data-shape', 'dashboard')
    })

    /**
     * O fio de 3px mudou de lugar em 22/08 — saiu da borda esquerda do bloco
     * da barra e foi para baixo do ícone, na fileira do topo (v7). O que NÃO
     * mudou é de que cor ele é: o mockup o pinta na cheia /01 do módulo, que
     * mede 1,36–2,63:1 contra o fundo da barra no tema claro, contra o piso de
     * 3:1 da WCAG 1.4.11. Esta guarda é invertida — ela não confere que a
     * fileira está bonita, confere que a /01 não voltou a carregar o sinal.
     */
    it('o fio da seção ativa é tinta, e seção inativa não desenha fio', async () => {
      setup()
      await itemDaBarra('/')

      const acesa = document.querySelectorAll(
        '[data-slot="appbar"] nav[aria-label="Seções"] [aria-current="page"]',
      )
      // Uma seção acesa, e uma só: duas fariam o operador ler dois lugares.
      expect(acesa).toHaveLength(1)
      const icone = acesa[0] as HTMLElement
      expect(icone).toHaveAttribute('aria-label', 'Início')

      const fio = icone.querySelector('span[aria-hidden="true"]')
      expect(fio).toHaveClass('bg-foreground')
      expect(fio).not.toHaveClass('bg-modulo-cheia')
      // A cor do módulo entra pela SUPERFÍCIE, na pastel /02 — sobre ela a
      // tinta mede 16,88:1 no claro e 9,32:1 no escuro.
      expect(icone.className).toContain('bg-modulo')
      expect(icone.className).not.toContain('bg-modulo-cheia')

      // Seção inativa não desenha fio nenhum — o estado é do ícone aceso.
      const inativa = fileira().getByRole('button', { name: 'Financeiro' })
      expect(inativa).not.toHaveAttribute('aria-current')
      expect(inativa.querySelector('span[aria-hidden="true"]')).toBeNull()
    })
  })
})
