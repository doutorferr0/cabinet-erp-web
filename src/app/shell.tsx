import { Appbar, secaoDaRota } from '@/app/appbar'
import { GavetaDeNotificacoes } from '@/app/gaveta-notificacoes'
import { moduloDaRota } from '@/app/modulo'
import { type NavItem, type NavSecao, secoesVisiveis } from '@/app/navigation'
import { PageFrame } from '@/app/page-frame'
import { PaletaDeComandos } from '@/app/paleta-de-comandos'
import { RequireRecurso } from '@/app/require-recurso'
import { ModeToggle } from '@/components/cabinet/mode-toggle'
import { Ornamento } from '@/components/cabinet/ornamento'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { normalize } from '@/data/provider'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { cn } from '@/lib/utils'
import { NOTIFICACOES_MOCK } from '@/mocks/notificacoes'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Search } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * O conteúdo do cartão de hover de UM item: só a linha que diz o que a tela FAZ
 * (§Regra da explicação no hover no DESIGN.md).
 *
 * **Sem o nome, de propósito.** O nome está no próprio item que disparou o
 * cartão — imprimi-lo aqui repetiria o que o olho acabou de ler. Já foi o
 * cartão do GRUPO, listando as telas irmãs, e essa duplicata foi recusada duas
 * vezes: o cartão só ganha o direito de existir pelo que ACRESCENTA.
 */
function ExplicacaoDaTela({ tela }: { tela: NavItem }) {
  return <p className="text-sm leading-snug">{tela.descricao}</p>
}

/**
 * Estado de colapso dos itens com filhas, LEMBRADO POR SESSÃO.
 *
 * `sessionStorage` e não `localStorage`: é preferência de sessão de trabalho,
 * não de conta (a issue pede "lembrado por sessão"). Quem abre o Cabinet
 * amanhã começa do padrão, e quem navegou a manhã inteira não reabre `Compras`
 * a cada tela. Leitura tolerante — chave corrompida abre no padrão em vez de
 * derrubar a barra.
 */
const CHAVE_COLAPSO = 'cabinet.nav.abertos.v1'

function lerAbertos(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE_COLAPSO)
    if (!bruto) return []
    const lido: unknown = JSON.parse(bruto)
    return Array.isArray(lido) ? lido.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function gravarAbertos(abertos: string[]): void {
  try {
    sessionStorage.setItem(CHAVE_COLAPSO, JSON.stringify(abertos))
  } catch {
    // Cota estourada ou armazenamento bloqueado: o colapso segue em memória.
    // Falhar a gravação não pode fechar o que o operador acabou de abrir.
  }
}

/** Casa o termo digitado com o título, ignorando acento e caixa. */
function casa(titulo: string, termo: string): boolean {
  return normalize(titulo).includes(normalize(termo))
}

/**
 * O ícone do item: o shape do módulo quando existe, o lucide quando não.
 *
 * ## A cor NÃO acompanha mais o estado
 *
 * Ela acompanhava — ativo na `/02`, inativo na `/01` — e o preenchimento do
 * item acompanhava junto, na ordem INVERSA. Ícone e fundo trocavam de lugar no
 * mesmo par: `/01` sobre `/02` no hover, `/02` sobre `/01` no ativo. O par mede
 * **1,39–2,40:1 no tema claro** nos nove módulos (§tabela:nav-estados), contra
 * o piso de 3:1 da WCAG 1.4.11 — o ícone sumia dentro do próprio realce.
 *
 * Em tinta ele passa nos três estados, porque acompanha o rótulo que já passa:
 * 18,76:1 em repouso e 16,88–18,81:1 sobre a `/02` do hover e do ativo.
 *
 * É o que o tom `icone` do `Ornamento` já previa por escrito — *"um ícone
 * acompanha o texto ao lado em hover, ativo e desabilitado; com token fixo,
 * cada um desses estados precisaria de uma SEGUNDA regra de cor só para o
 * ornamento"*. Ele existia sem consumidor; agora tem.
 *
 * **A cor do módulo não sai da barra**: continua na superfície do item (hover e
 * ativo em `/02`) e no quadradinho do grupo. E no ícone quem diz o módulo passa
 * a ser o SHAPE, que já era a informação dele — o desenho de Produtos não é o
 * de Clientes esteja ele em ciano ou em tinta.
 */
function IconeDoItem({ item }: { item: NavItem }) {
  const shape = moduloDaRota(item.url) ?? item.aparencia?.shape
  if (!shape) return <item.icon />
  return <Ornamento shape={shape} tom="icone" tamanho={18} />
}

/**
 * Uma linha da barra: tela, tela FUTURA ou pai colapsável.
 *
 * As três são visualmente irmãs de propósito — o operador vê o mapa inteiro do
 * que o sistema tem e do para onde ele cresce, e é isso que a issue pede com
 * "tela futura: visível, apagada NO FUNDO".
 */
function ItemDaBarra({
  item,
  pathname,
  abertos,
  filtrando,
  aoAlternar,
}: {
  item: NavItem
  pathname: string
  abertos: string[]
  /** Há termo digitado na busca? Filtrando, o pai abre — ver abaixo. */
  filtrando: boolean
  aoAlternar: (titulo: string) => void
}) {
  const ativo = pathname === item.url || pathname.startsWith(`${item.url}/`)

  if (item.futuro) {
    return (
      <SidebarMenuItem>
        {/* Apagado no FUNDO, nunca na tinta (regra Visual-1): texto claro sobre
            folha clara reprova contraste, e o item precisa continuar legível —
            ele existe justamente para ser LIDO. `aria-disabled` em vez de
            `disabled` para o item seguir alcançável por leitor de tela: quem
            navega por teclado tem o direito de saber que a tela vai existir. */}
        <div
          aria-disabled="true"
          // FUSÃO v5 r4: sobre o carvão, "apagado no fundo" é fundo MAIS escuro
          // com tinta rebaixada — a caixa clara de antes virava holofote.
          className="flex cursor-not-allowed items-center gap-2 rounded-control border-2 border-transparent bg-sidebar-accent/60 px-2 py-1.5 text-sidebar-foreground/60 text-sm"
        >
          <item.icon aria-hidden="true" className="size-4 shrink-0 opacity-60" />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <span className="shrink-0 rounded-item border border-sidebar-border px-1 font-mono text-[0.5625rem] uppercase tracking-[0.06em]">
            futuro
          </span>
        </div>
      </SidebarMenuItem>
    )
  }

  if (item.filhas) {
    /**
     * Filtrando, o pai abre SEMPRE. Respeitar o colapso durante a busca faria a
     * barra achar `Pedido de Compra` e escondê-lo dentro de `Compras` fechado —
     * achar e não mostrar é o mesmo que não achar.
     */
    const aberto = filtrando || abertos.includes(item.title)
    // O pai acende quando UMA FILHA está no ar: sem isso, entrar em Ordem de
    // Compra fecharia o grupo visualmente e o operador perderia onde está.
    const algumaAtiva = item.filhas.some(
      (filha) => pathname === filha.url || pathname.startsWith(`${filha.url}/`),
    )
    return (
      <SidebarMenuItem>
        <button
          type="button"
          onClick={() => aoAlternar(item.title)}
          aria-expanded={aberto}
          className="flex w-full items-center gap-2 border-2 border-transparent px-2 py-1.5 text-left font-medium text-sm outline-none hover:bg-modulo hover:text-foreground focus-visible:focus-ring"
        >
          <item.icon
            aria-hidden="true"
            className="size-4 shrink-0 fill-[hsl(var(--modulo-02)/0.5)] text-modulo"
          />
          <span className={cn('min-w-0 flex-1 truncate', algumaAtiva && 'font-bold')}>
            {item.title}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn('size-3.5 shrink-0 text-muted-foreground', aberto && 'rotate-180')}
          />
        </button>
        {aberto ? (
          <SidebarMenu className="ml-3 border-rule-hair border-l-2 pl-1">
            {item.filhas.map((filha) => (
              <ItemDaBarra
                key={filha.url}
                item={filha}
                pathname={pathname}
                abertos={abertos}
                filtrando={filtrando}
                aoAlternar={aoAlternar}
              />
            ))}
          </SidebarMenu>
        ) : null}
      </SidebarMenuItem>
    )
  }

  const modulo = moduloDaRota(item.url) ?? item.aparencia?.modulo
  return (
    <SidebarMenuItem {...(modulo && { 'data-modulo': modulo })}>
      <SidebarMenuButton asChild isActive={ativo} hoverCard={<ExplicacaoDaTela tela={item} />}>
        {/* Item EXTERNO é `<a href>`, não navegação do roteador: o alvo é um
            arquivo estático servido ao lado da SPA, e `<Link to>` o mandaria
            para o roteador — 404 com o arquivo ali do lado. */}
        {item.externo ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            <IconeDoItem item={item} />
            <span>{item.title}</span>
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        ) : (
          <Link to={item.url}>
            <IconeDoItem item={item} />
            <span>{item.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * A BARRA LATERAL — o MAPA INTEIRO do sistema, com rótulo (POLARIS,
 * sidebar-first, decisão do user 2026-08-17). A fileira de seis ícones
 * anônimos do topo morreu: as seções moram aqui, como no admin Shopify —
 * item de seção com nome, expansível, e a seção da rota vem aberta.
 *
 * ## A busca daqui NÃO é a paleta
 *
 * ## Ela mostra UMA seção — a escolhida na fileira do topo
 *
 * O acordeão de sete blocos saiu daqui em 22/08, quando a fileira de ícones
 * voltou ao topo (v7). Não é perda de alcance: a fileira troca de seção num
 * clique, e manter os dois seria oferecer a MESMA escolha em dois lugares —
 * dois controles para um estado é o par que um dia diverge.
 *
 * ## A busca filtra ESTA seção, e é decisão, não limitação
 *
 * Ela já varreu o sistema inteiro, abrindo a seção onde o resultado morava.
 * Com a barra contextual isso voltaria a montar seção que o operador não
 * escolheu — a fileira do topo diz onde ele está, e a barra que a contradiz
 * apaga a resposta dela. Quem procura no sistema inteiro tem a paleta
 * `Ctrl+K`, que continua **global e intocada** e alcança tela por nome.
 *
 * ## Configurações NÃO mora aqui
 *
 * Ela é página (`/config`), alcançada pela engrenagem da topbar: a barra
 * lista o que se OPERA, e um bloco de visita rara no pé cobrava espaço
 * permanente por isso.
 */
function AppSidebar({ secao }: { secao: NavSecao | undefined }) {
  const { location } = useRouterState()
  const pathname = location.pathname

  const [termo, setTermo] = useState('')
  const [abertos, setAbertos] = useState<string[]>(lerAbertos)
  const buscaId = useId()

  function alternar(titulo: string) {
    setAbertos((atual) => {
      const proximo = atual.includes(titulo)
        ? atual.filter((t) => t !== titulo)
        : [...atual, titulo]
      gravarAbertos(proximo)
      return proximo
    })
  }

  const filtrando = termo !== ''

  /**
   * O filtro casa o item OU alguma filha, nunca esconde a filha que casou, e
   * o grupo sem nenhum resultado sai da lista — sobrar rótulo vazio é ruído
   * na resposta.
   */
  const grupos = (secao?.grupos ?? [])
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.flatMap((item) => {
        if (!termo) return [item]
        if (casa(item.title, termo)) return [item]
        const filhas = item.filhas?.filter((filha) => casa(filha.title, termo)) ?? []
        return filhas.length > 0 ? [{ ...item, filhas }] : []
      }),
    }))
    .filter((grupo) => grupo.items.length > 0)

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 rounded-control border-2 border-input bg-card px-2">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <label htmlFor={buscaId} className="sr-only">
            Filtrar telas
          </label>
          <input
            id={buscaId}
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Filtrar…"
            className="h-8 w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {grupos.length === 0 ? (
          // Busca sem resultado DIZ que não achou. Painel em branco faria o
          // operador achar que o sistema está vazio — e uma seção que só tem
          // tela futura precisa dizer isso com todas as letras, senão parece
          // barra quebrada.
          <p className="px-3 py-4 text-muted-foreground text-sm">
            {filtrando
              ? `Nenhuma tela de ${secao?.rotulo ?? 'nesta seção'} casa com “${termo}”.`
              : 'Esta seção ainda não tem tela.'}
          </p>
        ) : (
          <nav
            aria-label={secao ? `Telas de ${secao.rotulo}` : 'Telas'}
            // O `data-modulo` da SEÇÃO escopa as utilities `bg-modulo*` de tudo
            // que a barra montar dentro dele. O quadradinho de cada grupo
            // redeclara o seu quando o grupo tem dono próprio; grupo sem dono
            // (Financeiro, Sistema) herda daqui, e é o que se quer.
            {...(secao?.modulo && { 'data-modulo': secao.modulo })}
            className="flex flex-1 flex-col"
          >
            {grupos.map((grupo) => (
              <SidebarGroup key={grupo.title} className="py-0">
                <SidebarGroupLabel>
                  {/* O quadradinho na cor do módulo DONO do grupo:
                      a cor diz de quem é o bloco antes do nome. */}
                  <span
                    aria-hidden="true"
                    {...(grupo.modulo && { 'data-modulo': grupo.modulo })}
                    className="mr-2 size-2 shrink-0 rounded-data bg-modulo-cheia"
                  />
                  {grupo.title}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {grupo.items.map((item) => (
                    <ItemDaBarra
                      key={item.url}
                      item={item}
                      pathname={pathname}
                      abertos={abertos}
                      filtrando={filtrando}
                      aoAlternar={alternar}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </nav>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  const { tem } = useRecursosDaEmpresa()

  const secoes = secoesVisiveis(tem)
  /** A fileira desenha o que se OPERA: a seção-página fica de fora. */
  const daBarra = secoes.filter((secao) => !secao.oculta)
  const daRota = secaoDaRota(secoes, location.pathname) ?? daBarra[0]

  /**
   * A SEÇÃO ESPIADA — a seção SEM TELA que o operador abriu no topo.
   *
   * Só existe para `Financeiro`, hoje a única seção cujos itens são todos
   * futuros: `destinoDaSecao` devolve `undefined`, o ícone dela é `<button>`
   * em vez de `<Link>`, e clicar abre o menu sem navegar. Toda seção com tela
   * navega, e aí quem responde é a rota — sem estado nenhum.
   *
   * O caminho em que a escolha foi feita viaja JUNTO com ela, e é a chave que
   * a expira: mudou de rota, a escolha caducou e quem manda volta a ser
   * `secaoDaRota`. Sem `useEffect`, sem sincronizar dois estados — o derivado
   * não tem como sobreviver ao fato que o contradiz.
   *
   * Espiar seção que a empresa perdeu (recurso revogado entre um clique e o
   * outro) resolve para `undefined` no `find` e cai na rota também.
   */
  const [espiada, setEspiada] = useState<{ id: string; em: string } | null>(null)
  const secaoEspiada =
    espiada?.em === location.pathname ? daBarra.find((secao) => secao.id === espiada.id) : undefined
  const secaoAtiva = secaoEspiada ?? daRota

  /**
   * A seção que a BARRA desenha — sempre uma das operáveis.
   *
   * `secaoAtiva` pode ser a seção-página (`/config`), porque é ela que o
   * rastro do header anuncia e a engrenagem acende. A barra não a recebe:
   * **Configurações é página, não barra** (#204), e a tela de `/config` já
   * lista os mesmos grupos — repeti-los do lado seria a mesma escolha em dois
   * lugares. Dentro dela a barra segue mostrando operação, que é o caminho de
   * volta, e é o que a `main` já fazia antes da fileira voltar.
   */
  const secaoDaBarra = secaoAtiva?.oculta ? daBarra[0] : secaoAtiva
  /** A TELA da rota, para o rastro do header — busca nas folhas da seção. */
  const telaAtiva = daRota?.grupos
    .flatMap((grupo) => grupo.items.flatMap((item) => item.filhas ?? [item]))
    .find((item) => location.pathname === item.url || location.pathname.startsWith(`${item.url}/`))

  // Notificação é CASCA nesta fatia — dado de mock local, sem `src/data/` por
  // trás (não há `/api/notifications` no contrato — §@casca-global). Estado
  // vive no shell porque é ele que também guarda se a gaveta está aberta; as
  // duas coisas nascem e morrem juntas com a navegação da sessão.
  const [notificacoes, setNotificacoes] = useState(NOTIFICACOES_MOCK)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  // A paleta é do SHELL, não da appbar: ela está em toda rota e o `Ctrl+K`
  // precisa valer com o foco em qualquer lugar. Montá-la dentro da appbar a
  // amarraria ao botão que a abre — e o botão é só um dos dois caminhos.
  const [paletaAberta, setPaletaAberta] = useState(false)
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  return (
    <SidebarProvider>
      <AppSidebar secao={secaoDaBarra} />
      <SidebarInset>
        {/* APPBAR GLOBAL — acima do cabeçalho de página, em TODA rota
            (§@casca-global). Vive no shell: página nenhuma monta a própria. */}
        <Appbar
          naoLidas={naoLidas}
          secaoAtiva={secaoAtiva?.id}
          aoEscolherSecao={(id) => setEspiada({ id, em: location.pathname })}
          aoAbrirGaveta={() => setGavetaAberta(true)}
          aoAbrirPaleta={() => setPaletaAberta(true)}
        />

        {/* Header = 1 célula da grade (52px), régua preta 2px embaixo (mockup .header). */}
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b-2 bg-card px-4 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
          </div>
          {/* ONDE ESTOU, por extenso — o Polaris põe o contexto no topo da
              página e o Odoo crava o nome do app na barra. Seção em negrito,
              tela depois; some quando a rota não pertence a seção nenhuma. */}
          {/* O rastro conta a ROTA, e só ela — `secaoAtiva` pode ser a seção
              que o operador abriu no topo sem sair do lugar (`espiada`), e um
              "Você está em" que anuncia onde ele NÃO está é pior que ausente.
              Quem diz qual menu está aberto é o ícone aceso lá em cima. */}
          {daRota ? (
            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="shrink-0 font-bold">{daRota.rotulo}</span>
              {telaAtiva ? (
                <>
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                  <span className="truncate text-muted-foreground">{telaAtiva.title}</span>
                </>
              ) : null}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        {/* A área de conteúdo é Papel COM a grade de 52px; a folha (PageFrame)
            pousa opaca por cima (Regra da Grade de Fundo).
            `data-modulo` é declarado UMA vez, aqui: tudo que a tela montar
            dentro dele lê o par de cor do módulo pelas utilities `bg-modulo*`
            sem precisar saber em que módulo está. Rota sem cor atribuída não
            escreve o atributo — o par padrão do `:root` é o que vale. */}
        <main
          {...(modulo && { 'data-modulo': modulo })}
          className="bg-paper-grid flex flex-1 flex-col p-5"
        >
          {/* `key` por CAMINHO: trocar de tela remonta a folha e a entrada
              anima; paginar e ordenar mexem em search params, não no caminho,
              e por isso não remontam nem animam. */}
          <PageFrame key={location.pathname}>
            {/* A guarda mora DENTRO da folha: quem chega por URL a uma tela que
                a empresa não opera continua vendo o sistema inteiro em volta —
                barra, empresa ativa, saída — em vez de uma tela nua. */}
            <RequireRecurso>{children}</RequireRecurso>
          </PageFrame>
        </main>
      </SidebarInset>

      {/* Coluna IRMÃ do `<SidebarInset>` (que já é `flex-1`), dentro do mesmo
          wrapper flex do `SidebarProvider` — é isso que faz a gaveta EMPURRAR
          o conteúdo ao abrir, em vez de flutuar por cima dele (decisão do
          user, §@casca-global: "não quero que sobreponha, e sim empurre"). */}
      <PaletaDeComandos aberta={paletaAberta} onOpenChange={setPaletaAberta} />
      <GavetaDeNotificacoes
        aberta={gavetaAberta}
        onOpenChange={setGavetaAberta}
        notificacoes={notificacoes}
        aoMarcarLida={(id) =>
          setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: !n.lida } : n)))
        }
      />
    </SidebarProvider>
  )
}
