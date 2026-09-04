import { type NavSecao, destinoDaSecao, secoesVisiveis } from '@/app/navigation'
import { ATALHO_DA_PALETA } from '@/app/paleta-de-comandos'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
import { Marca } from '@/components/cabinet/marca'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { useLogout, useSessao } from '@/data/sessao'
import { cn } from '@/lib/utils'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell, ChevronDown, Search } from 'lucide-react'
import { Button as ButtonAria } from 'react-aria-components'

/** Duas primeiras iniciais do nome — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/**
 * A seção dona desta rota — é ela que fica acesa e vem aberta na barra lateral.
 *
 * A `raiz` é conferida ANTES dos itens porque a seção-página (Configurações)
 * não tem item que case `/config`: o hub é a própria seção. Sem esta primeira
 * volta, `/config` cairia no `?? secoes[0]` do shell e o cabeçalho anunciaria
 * `Início` com Configurações na tela.
 */
export function secaoDaRota(secoes: NavSecao[], pathname: string): NavSecao | undefined {
  const naRaiz = secoes.find(
    (secao) => secao.raiz && (pathname === secao.raiz || pathname.startsWith(`${secao.raiz}/`)),
  )
  if (naRaiz) return naRaiz
  return secoes.find((secao) =>
    secao.grupos.some((grupo) =>
      grupo.items
        .flatMap((item) => item.filhas ?? [item])
        .some((item) => pathname === item.url || pathname.startsWith(`${item.url}/`)),
    ),
  )
}

/**
 * O que vai DENTRO do ícone da seção: o desenho e, no ativo, o fio.
 *
 * Componente de topo, e não um fragmento montado dentro do `.map`: função
 * declarada por render é um TIPO novo a cada render, e o React desmonta e
 * remonta a subárvore inteira em vez de atualizá-la. Também resolve o `key`
 * que o Biome cobra de filho solto de `<>…</>` dentro de iterável — e resolve
 * pela estrutura, não pondo `key` em peça que não é lista.
 */
function MioloDoIcone({ secao, ativa }: { secao: NavSecao; ativa: boolean }) {
  return (
    <>
      <secao.icon aria-hidden="true" className="size-5" />
      {ativa ? (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-foreground" />
      ) : null}
    </>
  )
}

/**
 * A FILEIRA DE SEÇÕES — só ÍCONE, o nome no hover (v7, `mockup-nav-shell.html`).
 *
 * ## O ícone sozinho, e o que paga por ele
 *
 * Ícone sem palavra é rápido para quem já sabe e mudo para quem não sabe. O
 * preço se paga em três lugares, e nenhum é opcional: `aria-label` com o nome
 * (é o nome que o leitor de tela anuncia), a dica no hover E NO FOCO — quem
 * chega de Tab lê o mesmo rótulo que quem chega de mouse —, e a paleta
 * `Ctrl+K`, que continua global e alcança toda tela por nome escrito.
 *
 * ## A dica é CSS, e não o `Tooltip` do design system — com número
 *
 * Sete `TooltipTrigger` do react-aria montam em TODA rota, porque a topbar
 * está em toda rota. Medido em `src/routes/` (24 testes): **33,49s na `main`,
 * 33,19s com a fileira sem dica, 36,30s com as sete dicas do react-aria** —
 * +8,4%, e foi o que empurrou `atividades-no-orcamento` por cima do timeout na
 * suíte cheia. Não é o teste que está frouxo: é custo de render que o operador
 * também paga, sete assinaturas de overlay por tela.
 *
 * A dica sai então em `::after` com `content: attr(...)`, que é o mecanismo do
 * próprio mockup (`.tab::after`) e custa zero em render. As classes copiam a
 * aparência do `Tooltip`: tinta sólida, texto no fundo, mono em caixa alta.
 * O que se perde é a seta — e ela existe para desambiguar overlay em PORTAL,
 * que flutua longe do gatilho; esta nasce ancorada no próprio ícone, centrada
 * nele, e não tem como falar de outro.
 *
 * O texto vem de `data-rotulo` e não de `aria-label` de propósito: conteúdo
 * gerado por CSS não entra no nome acessível, e ler o rótulo de lá deixaria a
 * dica calada se alguém trocasse o rótulo por `aria-labelledby`.
 *
 * ## `<Link>` quando a seção tem tela; `<button>` quando não tem
 *
 * Clicar numa seção LEVA à primeira tela dela — é o que o mockup faz e o que
 * Odoo e HubSpot fazem ao trocar de app. Como é rota de verdade, é `<Link>`:
 * quem quiser abre Estoque em outra aba pelo próprio navegador, o que um
 * `<button>` não permitiria.
 *
 * `Financeiro` é a exceção que prova a regra: só tem tela futura, e
 * `destinoDaSecao` devolve `undefined`. Ali o ícone é `<button>` e só ABRE o
 * menu da seção, sem navegar — inventar um `/financeiro` daria 404. As duas
 * metades levam ao mesmo lugar visível: a barra passa a mostrar a seção.
 *
 * **As DUAS avisam `aoEscolher`, e o `<Link>` não é exceção.** A escolha do
 * operador é o mesmo fato nos dois casos; só o `<button>` avisar deixava a
 * escolha ANTERIOR de pé quando o clique não mudava a rota — clicar em Estoque
 * já estando em `/estoque/movimentacao` não navega, então `secaoDaRota` não
 * tinha o que reavaliar e a barra continuava em Financeiro, com o fio aceso na
 * seção errada. Avisar sempre custa uma linha e apaga a classe inteira do
 * defeito, em vez do caso que alguém lembrou.
 *
 * ## O fio é TINTA, o pastel é do módulo
 *
 * O mockup pinta o fio de 3px na CHEIA /01 do módulo. Ela mede 1,36–2,63:1
 * contra o fundo da barra no tema claro, contra o piso de 3:1 da WCAG 1.4.11
 * (§tabela:nav-estados) — foi o defeito que a #243 corrigiu na barra lateral,
 * e repeti-lo aqui seria reintroduzi-lo. O fio sai em tinta; a cor do módulo
 * entra pela SUPERFÍCIE, na pastel /02, que é o papel dela.
 *
 * Hover e ativo compartilham a pastel, como no mockup (`.tab:hover` e
 * `.tab.ativo` têm o mesmo `background`). Quem separa os dois é o fio.
 */
function SecoesNoTopo({
  secoes,
  secaoAtiva,
  aoEscolher,
}: {
  secoes: NavSecao[]
  secaoAtiva: string | undefined
  aoEscolher: (id: string) => void
}) {
  return (
    <nav aria-label="Seções" className="flex shrink-0 items-stretch gap-0.5 self-stretch">
      {secoes.map((secao) => {
        const ativa = secao.id === secaoAtiva
        const destino = destinoDaSecao(secao)
        const comum = {
          'aria-label': secao.rotulo,
          'aria-current': ativa ? ('page' as const) : undefined,
          ...(secao.modulo && { 'data-modulo': secao.modulo }),
          'data-rotulo': secao.rotulo,
          className: cn(
            'relative grid w-11 shrink-0 place-content-center outline-none hover:bg-modulo focus-visible:focus-ring',
            // A DICA: aparece no hover e no foco de teclado, some sem os dois.
            'after:-translate-x-1/2 after:pointer-events-none after:absolute after:top-[calc(100%+6px)] after:left-1/2 after:z-50 after:whitespace-nowrap after:rounded-control after:bg-foreground after:px-2.5 after:py-1 after:font-mono after:font-semibold after:text-background after:text-xs after:uppercase after:tracking-[0.05em] after:opacity-0 after:transition-opacity after:content-[attr(data-rotulo)]',
            'hover:after:opacity-100 focus-visible:after:opacity-100',
            ativa && 'bg-modulo',
          ),
        }
        return destino ? (
          <Link key={secao.id} to={destino} onClick={() => aoEscolher(secao.id)} {...comum}>
            <MioloDoIcone secao={secao} ativa={ativa} />
          </Link>
        ) : (
          <button key={secao.id} type="button" onClick={() => aoEscolher(secao.id)} {...comum}>
            <MioloDoIcone secao={secao} ativa={ativa} />
          </button>
        )
      })}
    </nav>
  )
}

/**
 * TOPBAR — faixa fina com a marca à esquerda, a FILEIRA DE SEÇÕES ao lado
 * dela, a busca no centro e os globais à direita. Tipografia, cor e superfície
 * continuam as do Polaris (2026-08-17); o que voltou para cá é só a
 * NAVEGAÇÃO DE SEÇÃO.
 *
 * ## Por que a fileira voltou
 *
 * Ela existiu em 15/08 (#145), foi descartada em 17/08 pelo Polaris
 * sidebar-first (#195) e o user a restaurou em 22/08, escolhendo o desenho v7
 * do `mockup-nav-shell.html` e mandando manter os tokens do Polaris. As duas
 * decisões não brigam: a v7 diz ONDE se troca de seção, o Polaris diz COM QUE
 * COR se desenha. A barra lateral perdeu o acordeão de seções e passou a
 * mostrar só a seção escolhida — duas listas da mesma taxonomia, uma em cima
 * e outra do lado, seria a mesma escolha oferecida em dois lugares.
 *
 * ## Busca — abre a paleta
 *
 * Botão com cara de campo (mesma peça do Supabase Studio): o que parece campo
 * e responde abrindo diálogo mentiria como `<input>`. `Ctrl+K` escrito no
 * próprio botão. No Polaris a busca é central e larga — aqui também.
 *
 * ## Engrenagem — a PÁGINA de Configurações
 *
 * Navega para `/config`, e não abre bloco nenhum na barra: configuração fica
 * fora do caminho de operação (Odoo CogMenu, HubSpot settings). É `<Link>`
 * porque é rota de verdade — quem quiser abre em outra aba pelo próprio
 * navegador, o que um `<button>` não permitiria.
 *
 * ## Configurações também no menu do operador
 *
 * A engrenagem é ícone sem palavra: quem não a associa a "configurações" não
 * tem como saber que ela é o caminho. O menu do avatar repete o destino POR
 * ESCRITO — é onde o hábito manda procurar ajuste de conta, e o custo de um
 * segundo caminho é uma linha, não uma tela.
 *
 * ## Sino — abre a gaveta que EMPURRA
 *
 * `aoAbrirGaveta` é do AppShell: a gaveta é coluna irmã do `<main>`, e o
 * estado mora lá — a topbar só avisa a intenção.
 */
export function Appbar({
  naoLidas,
  secaoAtiva,
  aoEscolherSecao,
  aoAbrirGaveta,
  aoAbrirPaleta,
}: {
  naoLidas: number
  /** Id da seção em foco — quem a resolve é o `AppShell`. */
  secaoAtiva: string | undefined
  /** Clique num ícone da fileira: escolhe a seção SEM navegar. */
  aoEscolherSecao: (id: string) => void
  aoAbrirGaveta: () => void
  aoAbrirPaleta: () => void
}) {
  const navigate = useNavigate()
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()
  const logout = useLogout()
  const { tem } = useRecursosDaEmpresa()

  const secoes = secoesVisiveis(tem)
  const config = secoes.find((secao) => secao.oculta)
  /** A fileira desenha o que se OPERA: a seção-página fica atrás da engrenagem. */
  const daBarra = secoes.filter((secao) => !secao.oculta)
  // Em const, e não lido de dentro do JSX: `exactOptionalPropertyTypes` recusa
  // `navigate({ to: config?.raiz })` porque a estreiteza se perde no callback.
  const raizDaConfig = config?.raiz

  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <div
      data-slot="appbar"
      className="flex h-12 shrink-0 items-center gap-3 border-rule-strong border-b-2 bg-card/75 px-4 backdrop-blur-md"
    >
      {/* A MARCA à esquerda da topbar — posição Polaris (o logo do admin
          Shopify). Ela subiu da barra lateral quando a navegação desceu:
          os dois não disputam mais o mesmo canto. */}
      <div className="flex shrink-0 items-center">
        <Marca variante="assinatura" tamanho={34} />
      </div>

      <SecoesNoTopo secoes={daBarra} secaoAtiva={secaoAtiva} aoEscolher={aoEscolherSecao} />

      {/* BUSCA CENTRAL — a âncora da topbar no Polaris.
          O `min-w` não é enfeite: a fileira de seções come 320px da faixa, e
          medido no par local a busca caía para **150px**, onde o rótulo sai
          como "Pes…". Botão que não diz o que faz não é atalho, é enigma. O
          piso é dela, e quem cede espaço é o seletor de empresa, que trunca o
          nome sem perder a função. */}
      <div className="flex min-w-56 flex-1 justify-center">
        <button
          type="button"
          onClick={aoAbrirPaleta}
          aria-label="Abrir a paleta de comandos"
          aria-keyshortcuts="Control+K"
          className="flex h-8 w-full max-w-xl items-center gap-2 rounded-control border-2 border-input bg-background px-2.5 text-left text-muted-foreground text-sm outline-none hover:bg-muted focus-visible:focus-ring"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Pesquisar…</span>
          {/* O atalho fica ESCRITO no botão: quem prefere teclado aprende sem
              documentação, e quem não prefere continua clicando. */}
          <span className="shrink-0 rounded-data border-2 border-border px-1 font-mono text-[10px] uppercase tracking-[0.06em]">
            {ATALHO_DA_PALETA}
          </span>
        </button>
      </div>

      <div className="flex min-w-0 shrink items-center gap-2">
        {config && raizDaConfig ? (
          <TooltipTrigger delay={200}>
            <Link
              to={raizDaConfig}
              aria-label="Configurações"
              aria-current={secaoAtiva === config.id ? 'page' : undefined}
              className="grid size-8 place-content-center rounded-control outline-none hover:bg-muted focus-visible:focus-ring aria-[current=page]:bg-muted"
            >
              <config.icon aria-hidden="true" className="size-4" />
            </Link>
            <Tooltip>Configurações</Tooltip>
          </TooltipTrigger>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          onClick={aoAbrirGaveta}
          aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
          className="relative"
        >
          <Bell />
          {naoLidas > 0 ? (
            <span
              aria-hidden="true"
              className="-top-1 -right-1 absolute grid size-4 place-content-center rounded-full bg-destructive font-mono text-[0.625rem] font-bold text-destructive-foreground tabular-nums"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          ) : null}
        </Button>

        {/* EMPRESA + OPERADOR juntos no canto direito — o par que o admin
            Shopify usa (nome da loja ao lado do avatar): escopo do dado e
            quem opera, lado a lado. */}
        {/* Encolhe quando a faixa aperta — é o único bloco da direita que
            pode: engrenagem, sino e avatar já estão no tamanho do alvo de
            toque, e o nome da empresa trunca sem deixar de ser clicável. */}
        <div className="w-64 min-w-0 shrink">
          <CompanySwitcher />
        </div>

        <DropdownMenuTrigger>
          {/* `Button` do react-aria, e não `<button>` cru: o `MenuTrigger`
              entrega os gestos ao filho por `PressResponder`, e elemento DOM
              puro não os recebe — o menu do operador não abria, e o `Sair`
              dentro dele era inalcançável pelo mouse. */}
          <ButtonAria className="flex items-center gap-2 rounded-control py-1 pr-2 pl-1 font-semibold text-sm outline-none hover:bg-muted focus-visible:focus-ring">
            <span className="grid size-7 shrink-0 place-content-center rounded-item bg-accent font-mono text-xs">
              {iniciaisDoNome(nome)}
            </span>
            <span className="hidden text-left leading-tight lg:grid">
              <span className="truncate">{nome}</span>
              {ativa ? (
                <span className="truncate font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
                  {papelLabel(ativa.role)}
                </span>
              ) : null}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </ButtonAria>
          <DropdownMenu placement="bottom end">
            <DropdownMenuLabel>{nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {config && raizDaConfig ? (
              // `onAction` e não `href`: o menu do react-aria não conhece o
              // roteador do TanStack, e uma âncora aqui recarregaria a SPA
              // inteira — sessão em memória, dado em cache, tudo do zero.
              <DropdownMenuItem
                textValue="Configurações"
                onAction={() => void navigate({ to: raizDaConfig })}
              >
                <config.icon aria-hidden="true" />
                Configurações
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onAction={() => logout.mutate()} isDisabled={logout.isPending}>
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>
    </div>
  )
}
