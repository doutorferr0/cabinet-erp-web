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
   * A CASCA 2.0 — barra à esquerda com a navegação inteira, appbar reduzida ao
   * que é global e não é navegação.
   *
   * A auditoria §6 nomeia o defeito que morre aqui: "navegação duplicada —
   * ícones no topo + sidebar com os mesmos destinos". O teste é INVERTIDO de
   * propósito: ele confere que a fileira NÃO voltou, e que o que desceu para a
   * barra não ficou nos dois lugares. Sem ele, restaurar a fileira (já
   * aconteceu duas vezes neste repo, em 15/08 e 22/08) não deixaria nada
   * vermelho.
   */
  it('a fileira de sete ícones morreu, e nada dela ficou na appbar', async () => {
    setup()
    await waitFor(() => {
      expect(document.querySelector('[data-slot="sidebar-nav"]')).toBeInTheDocument()
    })

    expect(screen.queryByRole('navigation', { name: 'Seções' })).not.toBeInTheDocument()
    const topo = within(document.querySelector('[data-slot="appbar"]') as HTMLElement)
    // Merge D4+D5+D6 (2026-09-03): o que desceu para a barra não fica também
    // aqui — marca, seletor de empresa, menu do operador e a BUSCA (⌘K).
    expect(
      topo.queryByRole('button', { name: /Henrique|Usuário|Operador/i }),
    ).not.toBeInTheDocument()
    expect(topo.queryByRole('button', { name: 'Abrir a busca' })).not.toBeInTheDocument()
    const barra = within(document.querySelector('[data-slot="sidebar-nav"]') as HTMLElement)
    expect(barra.getByRole('button', { name: 'Abrir a busca' })).toBeInTheDocument()
    // O que fica na appbar (D5): trilha, sino e tema — ações globais que não são navegação.
    expect(topo.getByRole('navigation', { name: 'Trilha de navegação' })).toBeInTheDocument()
    expect(topo.getByRole('button', { name: /Notificações/ })).toBeInTheDocument()
    expect(topo.getByRole('button', { name: /alternar para o tema/i })).toBeInTheDocument()
  })

  /**
   * O rastro diz onde se ESTÁ, e lê a mesma lista que a barra desenha. O
   * modelo antigo tinha `secaoDaRota` de um lado e a barra do outro, e a
   * `espiada` existia para remendar a divergência entre os dois.
   */
  it('a barra é a navegação, e ela está em toda rota', async () => {
    for (const rota of ['/', '/cadastros/clientes']) {
      const { unmount } = setup(rota)
      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
      })
      unmount()
    }
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
    // 30s e não os 15s do padrão: a gaveta são TRÊS interações de `userEvent`
    // com o shell inteiro montado, e o `asyncWrapper` do RTL espera o React
    // assentar em cada uma. Medido nesta máquina com o resto do repo rodando
    // em paralelo, o caso leva ~18s — o que reprovava era o relógio, não o
    // comportamento (`fireEvent` no mesmo botão abre a gaveta na hora).
  }, 30000)

  // O MENU É DA EMPRESA ATIVA. Trocar de empresa não muda só o rótulo do
  // rodapé: os cadastros que a empresa não opera saem da barra. Asserção nos
  // dois sentidos de propósito — some o que é da empresa, FICA o que é de toda
  // empresa (Clientes, Produtos); um filtro largo demais passaria no primeiro.
  /**
   * Os três cadastros com recurso moram em grupos diferentes na 2.0:
   * Fornecedores em COMPRAS, Profissional Externo em VENDAS, Colaboradores em
   * PESSOAS. A rota é de Clientes, então só VENDAS vem aberto — e a asserção
   * usa o grupo aberto para o presente e a lista inteira para a ausência, que
   * é o que se pode afirmar sem abrir grupo a grupo.
   */
  it('cadastros da empresa somem ao trocar para a empresa que não os opera', async () => {
    setup('/cadastros/clientes')
    const user = userEvent.setup()
    const barra = () => within(document.querySelector('[data-slot="sidebar-nav"]') as HTMLElement)

    await waitFor(() => {
      expect(barra().getByRole('link', { name: 'Profissional Externo' })).toBeInTheDocument()
    })

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
    // O que não depende de recurso continua: o grupo não sumiu junto.
    expect(barra().getByRole('link', { name: 'Clientes' })).toBeInTheDocument()
  }, 30000)

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
      expect(screen.getByRole('button', { name: /alternar para o tema/i })).toBeInTheDocument()
    })
    const toggle = screen.getByRole('button', { name: /alternar para o tema/i })
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

  describe('appbar global', () => {
    it('aparece em toda rota, com trilha, sino e tema', async () => {
      for (const rota of ['/', '/cadastros/clientes']) {
        const { unmount } = setup(rota)
        await waitFor(() => {
          expect(document.querySelector('[data-slot="appbar"]')).toBeInTheDocument()
        })
        const topo = within(document.querySelector('[data-slot="appbar"]') as HTMLElement)
        expect(topo.getByRole('navigation', { name: 'Trilha de navegação' })).toBeInTheDocument()
        expect(topo.getByRole('button', { name: /Notificações/ })).toBeInTheDocument()
        expect(topo.getByRole('button', { name: /alternar para o tema/i })).toBeInTheDocument()
        // A busca (⌘K) mora na barra, não na appbar (D4/D6).
        expect(screen.getByRole('button', { name: 'Abrir a busca' })).toBeInTheDocument()
        unmount()
      }
    })

    // O campo de busca da appbar era CHROME: aceitava digitação e não fazia
    // nada. Virou o caminho por CLIQUE da paleta — a decisão de interface do
    // CLAUDE.md não admite função que só exista por tecla.
    it('o campo de busca abre a PALETA, e não é mais um input mudo', async () => {
      setup()
      const user = userEvent.setup()
      const gatilho = await screen.findByRole('button', { name: 'Abrir a busca' })

      // Botão com cara de campo: input abriria diálogo ao digitar, mentindo
      // sobre o que a tecla vai fazer.
      expect(gatilho.tagName).toBe('BUTTON')

      await user.click(gatilho)

      expect(await screen.findByPlaceholderText(/nome\/número de um registro/)).toBeInTheDocument()
    })

    it('Ctrl+K abre a paleta de qualquer lugar — conveniência, não requisito', async () => {
      setup()
      const user = userEvent.setup()
      await screen.findByRole('button', { name: 'Abrir a busca' })

      await user.keyboard('{Control>}k{/Control}')

      expect(await screen.findByPlaceholderText(/nome\/número de um registro/)).toBeInTheDocument()
    })

    it('a paleta navega, e o comando da tela atual vem primeiro', async () => {
      const { router } = setup('/cadastros/clientes')
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Abrir a busca' }))

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
      await user.click(await screen.findByRole('button', { name: 'Abrir a busca' }))
      await screen.findByPlaceholderText(/nome\/número de um registro/)

      await user.click(await screen.findByRole('menuitem', { name: /Mapeamento de Tabelas/ }))

      expect(abrir).toHaveBeenCalledWith('/mapeamento-tabelas.html', '_blank', 'noreferrer')
      expect(router.state.location.pathname).toBe('/cadastros/clientes')
    })

    it('o sino leva à caixa de entrada (D7): rota, não gaveta', async () => {
      const { router } = setup()
      const user = userEvent.setup()
      const sino = await screen.findByRole('button', { name: /Notificações/ })
      await user.click(sino)
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/inbox')
      })
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
  /**
   * A GUARDA DO CONTRASTE da navegação — herdeira da #140, remedida para a 2.0.
   *
   * A regressão histórica deste repo é sempre a mesma: a cor CHEIA do módulo
   * (neon) volta a carregar texto, ícone ou sinal de estado, e some no tema
   * claro. A 2.0 fecha essa porta por desenho — o item ativo deixou de ser
   * pintado pelo módulo e passou a ser chartreuse-pálido para todo mundo
   * (decisão do user, 2026-09-02) —, e este bloco confere que ela continua
   * fechada.
   *
   * Os NÚMEROS de contraste não se medem aqui: `jsdom` não resolve
   * `color-mix()` nem cascata de tema, e um teste que "medisse" cor no DOM
   * estaria medindo a string do CSS. Quem mede é `docs/design/medir-contraste.py`
   * sobre os tokens, e o resultado está no relato da issue.
   */
  describe('contraste da navegação (#140 → 2.0)', () => {
    async function itemDaBarra(url: string): Promise<HTMLElement> {
      return await waitFor(() => {
        const alvo = document.querySelector(`[data-slot="sidebar-nav"] a[href="${url}"]`)
        expect(alvo).toBeInTheDocument()
        return alvo as HTMLElement
      })
    }

    it('a cor do módulo não pinta fundo de texto nem sinal de estado na barra', async () => {
      setup()
      await itemDaBarra('/')

      const barra = document.querySelector('[data-slot="sidebar-nav"]') as HTMLElement
      // O ÚNICO uso do matiz do módulo na barra é o quadradinho de 7px do
      // grupo: `aria-hidden`, vazio, sem nada pousado em cima.
      const quadradinhos = [...barra.querySelectorAll('[data-quadradinho]')]
      expect(quadradinhos.length).toBeGreaterThan(0)
      for (const peca of quadradinhos) {
        expect(peca).toHaveAttribute('aria-hidden', 'true')
        expect(peca.textContent).toBe('')
        expect(peca.children).toHaveLength(0)
      }
      // Nenhuma utility de módulo sobrou: elas resolvem para os tokens 1.x, e
      // a barra 2.0 pinta pelo `nav.css` com os nomes da fundação.
      expect(barra.querySelector('.bg-modulo, .bg-modulo-cheia, .text-modulo')).toBeNull()
    })

    it('o item ativo é chartreuse para todo módulo, não o matiz de cada um', async () => {
      setup('/compras/ordens')
      const ativo = await itemDaBarra('/compras/ordens')

      // A marca de estado é um atributo, e o `nav.css` a pinta com
      // `--main-soft` + `--ink` + a faixa `--main`. Um `data-modulo` aqui seria
      // a volta do desenho antigo, em que a marca de "onde estou" mudava de cor
      // conforme a tela — nove marcas para uma informação.
      expect(ativo).toHaveAttribute('data-ativo', 'true')
      expect(ativo).not.toHaveAttribute('data-modulo')
      expect(ativo.className).not.toContain('modulo')
    })

    it('a tela futura é apagada no traço, e o rótulo continua legível', async () => {
      setup()
      await itemDaBarra('/')
      const futuro = screen.getByText('Caixa de entrada').closest('[data-item]') as HTMLElement

      // `--disabled` (n-400) sobre a bancada (n-100) é o par que a fundação
      // reserva para o desabilitado. O que NÃO pode acontecer é o item ganhar
      // fundo claro E texto claro ao mesmo tempo, que foi a regressão de 2026-08.
      expect(futuro).toHaveAttribute('data-futuro', 'true')
      expect(futuro.className).not.toContain('bg-')
    })
  })
})
