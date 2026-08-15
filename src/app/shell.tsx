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

/** O ícone do item: o shape do módulo quando existe, o lucide quando não. */
function IconeDoItem({ item, ativo }: { item: NavItem; ativo: boolean }) {
  const shape = moduloDaRota(item.url) ?? item.aparencia?.shape
  if (!shape) return <item.icon className={ativo ? 'text-modulo-suave' : 'text-modulo'} />
  return <Ornamento shape={shape} tom={ativo ? 'modulo-suave' : 'modulo'} tamanho={18} />
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
          className="flex cursor-not-allowed items-center gap-2 border-2 border-transparent bg-muted px-2 py-1.5 text-sm"
        >
          <item.icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <span className="shrink-0 border-2 border-border px-1 font-mono text-[0.5625rem] uppercase tracking-[0.06em]">
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
          className="flex w-full items-center gap-2 border-2 border-transparent px-2 py-1.5 text-left font-medium text-sm outline-none hover:bg-modulo focus-visible:focus-ring"
        >
          <item.icon aria-hidden="true" className="size-4 shrink-0 text-modulo" />
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
            <IconeDoItem item={item} ativo={ativo} />
            <span>{item.title}</span>
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        ) : (
          <Link to={item.url}>
            <IconeDoItem item={item} ativo={ativo} />
            <span>{item.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * A BARRA LATERAL — contextual à seção aberta no topo (Nav-2).
 *
 * Ela deixou de listar o sistema inteiro: mostra só a seção em que o operador
 * está, no formato da referência aprovada pelo user — busca própria no topo,
 * grupos rotulados com o quadradinho do módulo dono, item colapsável com
 * filhas, tela futura apagada com selo.
 *
 * ## A busca daqui NÃO é a paleta
 *
 * Filtra os itens da SEÇÃO ATIVA, e só. A paleta `Ctrl+K` continua global e
 * intocada — são duas perguntas diferentes: "onde está aquela tela desta
 * seção" e "leve-me a qualquer lugar do sistema". Uma busca que fizesse as
 * duas coisas responderia mal às duas.
 *
 * A marca e o seletor de empresa SAÍRAM daqui para a appbar: o que não muda
 * (produto, escopo do dado) não pode morar dentro do que muda a cada seção.
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

  /**
   * O filtro casa o item OU alguma filha dele, e nunca esconde a filha que
   * casou: procurar "pedido" tem de achar `Pedido de Compra` dentro de
   * `Compras`, e mostrá-lo — não o pai fechado com o resultado escondido.
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
        <div className="flex flex-col gap-1 px-1 pt-1">
          {/* O nome da seção encabeça o painel: sem ele, seis conteúdos
              diferentes moram no mesmo lugar sem dizer qual é qual — o ícone
              aceso lá em cima está longe do olho de quem lê a lista. */}
          <span className="px-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {secao?.rotulo ?? ''}
          </span>
          <div className="flex items-center gap-2 border-2 border-input bg-card px-2">
            <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <label htmlFor={buscaId} className="sr-only">
              Filtrar telas de {secao?.rotulo ?? 'esta seção'}
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
        </div>
      </SidebarHeader>
      <SidebarContent>
        {grupos.length === 0 ? (
          // Busca sem resultado DIZ que não achou. Painel em branco faria o
          // operador achar que a seção está vazia.
          <p className="px-3 py-4 text-muted-foreground text-sm">
            Nenhuma tela desta seção casa com “{termo}”.
          </p>
        ) : (
          grupos.map((grupo) => (
            <SidebarGroup key={grupo.title}>
              <SidebarGroupLabel>
                {/* O quadradinho na cor do módulo DONO do grupo: numa lista de
                    seis rótulos, a cor diz de quem é o bloco antes de o olho
                    ler o nome. Grupo sem módulo sai no par neutro do `:root` —
                    nenhuma cor nova é inventada aqui. */}
                <span
                  aria-hidden="true"
                  {...(grupo.modulo && { 'data-modulo': grupo.modulo })}
                  className="mr-2 size-2 shrink-0 border-2 bg-modulo-cheia"
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
                    filtrando={termo !== ''}
                    aoAlternar={alternar}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
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

  /**
   * A SEÇÃO ABERTA na barra lateral.
   *
   * Nasce da ROTA — a barra mostra onde o operador está, sem ele escolher nada
   * — e a aba do topo pode sobrepor, para EXPLORAR outra seção sem sair da
   * tela. Explorar não navega: um clique de curiosidade não pode jogar fora um
   * formulário meio preenchido.
   *
   * A escolha se desfaz na próxima navegação (`key` do efeito é o caminho):
   * senão, quem espiasse Financeiro e depois abrisse um cliente ficaria com a
   * barra de Financeiro sobre a tela de Clientes.
   */
  const secoes = secoesVisiveis(tem)
  // A escolha guarda EM QUE ROTA foi feita, e vale só nela. Derivar assim
  // dispensa o efeito que zeraria o estado a cada navegação — efeito de
  // sincronizar é justamente o que se evita quando dá para calcular.
  const [escolha, setEscolha] = useState<{ id: string; em: string } | null>(null)
  const escolhida = escolha?.em === location.pathname ? escolha.id : null
  const secaoAtiva =
    secoes.find((secao) => secao.id === escolhida) ??
    secaoDaRota(secoes, location.pathname) ??
    secoes[0]

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
      <AppSidebar secao={secaoAtiva} />
      <SidebarInset>
        {/* APPBAR GLOBAL — acima do cabeçalho de página, em TODA rota
            (§@casca-global). Vive no shell: página nenhuma monta a própria. */}
        <Appbar
          naoLidas={naoLidas}
          secaoAtiva={secaoAtiva?.id}
          aoEscolherSecao={(id) => setEscolha({ id, em: location.pathname })}
          aoAbrirGaveta={() => setGavetaAberta(true)}
          aoAbrirPaleta={() => setPaletaAberta(true)}
        />

        {/* Header = 1 célula da grade (52px), régua preta 2px embaixo (mockup .header). */}
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b-2 bg-card px-4 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
          </div>
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
