import { useContadoresNav } from '@/app/nav/contadores'
import {
  MAXIMO_DE_RECENTES,
  idadeRelativa,
  useBarraColapsada,
  useFavoritos,
  useGruposAbertos,
  useRecentes,
} from '@/app/nav/estado'
import {
  GRUPOS_NAV,
  GRUPO_CONFIG,
  ITENS_DO_MENU_DO_OPERADOR,
  type NavGroup,
  type NavItem,
  grupoDaRota,
} from '@/app/nav/grupos'
import '@/app/nav/nav.css'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
import { Marca } from '@/components/cabinet/marca'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { type RecursoDaEmpresa, useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { useLogout, useSessao } from '@/data/sessao'
import { SHORTCUTS, bindShortcut, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Clock, PanelLeftClose, PanelLeftOpen, Search, Star } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Button as ButtonAria } from 'react-aria-components'

/**
 * A BARRA LATERAL — a navegação INTEIRA do Cabinet, numa lista só.
 *
 * Modelo A da auditoria §6 (Shopify admin, Stripe, Ramp, Linear). Substitui o
 * par "fileira de sete ícones na appbar + barra que mostra uma seção" do 1.x:
 * ver `src/app/nav/grupos.ts` para o porquê.
 *
 * ## Quatro coisas moram aqui e em nenhum outro lugar
 *
 * 1. **A marca**, no topo — ela desceu da appbar junto com a navegação, e os
 *    dois deixaram de disputar o canto superior esquerdo.
 * 2. **O seletor de empresa e a busca `Ctrl+K`**, em slots logo abaixo: são o
 *    ESCOPO do que a lista mostra e o atalho para furar a lista. A D6 desenha
 *    os dois; aqui eles ganham o lugar.
 * 3. **A lista**, em grupos de ordem fixa, com o grupo da rota aberto.
 * 4. **O rodapé** — Configurações e o operador. O que se ajusta e quem ajusta,
 *    fora do caminho de operação.
 *
 * ## O que NÃO mora aqui
 *
 * A busca "Filtrar telas" do 1.x morreu. Ela existia porque a barra mostrava
 * uma seção por vez e achar algo fora dela exigia trocar de seção primeiro;
 * com a lista inteira presente, filtrar telas é o trabalho da paleta `Ctrl+K`,
 * que já alcança tela E registro. Dois campos de busca a dois centímetros um
 * do outro seriam a mesma pergunta feita duas vezes.
 *
 * ## A cor vem do `nav.css`, não de utility
 *
 * As utilities do repo ainda resolvem para os tokens 1.x até a D1 (#469)
 * mapeá-los. Cada peça daqui carrega um `data-*` que o `nav.css` pinta com os
 * nomes de `src/styles/tokens-2.0.css` — é o que faz a barra ser 2.0 hoje sem
 * tocar em `index.css`, que é zona exclusiva da D1.
 */

/** O item (ou o pai dele) responde por este caminho? */
export function ativoEm(url: string, pathname: string): boolean {
  // `/` é prefixo de tudo: casamento EXATO, nunca prefixo, senão o Início
  // acenderia em toda tela do sistema.
  if (url === '/') return pathname === '/'
  return pathname === url || pathname.startsWith(`${url}/`)
}

/** O item (e o grupo) sobrevive ao que a EMPRESA ATIVA opera? */
function comRecurso(grupo: NavGroup, tem: (recurso: RecursoDaEmpresa) => boolean): NavGroup {
  return { ...grupo, items: grupo.items.filter((item) => !item.recurso || tem(item.recurso)) }
}

/**
 * O REGISTRO que este caminho abre — `undefined` quando o caminho é uma
 * listagem, uma inclusão ou qualquer coisa que não seja ficha.
 *
 * É o que alimenta RECENTES, e a distinção é o ponto: a lista de clientes é
 * sempre o mesmo lugar e já está na barra; o cliente `9a1f` é onde o operador
 * estava trabalhando. `novo` fica de fora porque um rascunho que não foi
 * gravado não é registro nenhum — a url dele não abre nada amanhã.
 */
export function registroDoCaminho(
  pathname: string,
  itens: readonly NavItem[],
): { url: string; rotulo: string } | undefined {
  for (const item of itens) {
    if (item.url === '/' || !pathname.startsWith(`${item.url}/`)) continue
    const resto = pathname.slice(item.url.length + 1)
    if (resto === '' || resto === 'novo' || resto.includes('/')) continue
    // O id inteiro é um uuid de 36 caracteres e não cabe em 236px ao lado do
    // nome da tela. Oito bastam para distinguir dois registros abertos no mesmo
    // dia, que é o alcance desta lista.
    return { url: pathname, rotulo: `${item.title} · ${resto.slice(0, 8)}` }
  }
  return undefined
}

/**
 * Uma linha da lista: tela, tela futura ou registro recente.
 *
 * ## O ícone só no PRIMEIRO item do grupo
 *
 * É a ressalva escrita da auditoria §6 sobre o Shopify (*"não entra: ícone em
 * todo item — só no primeiro de cada grupo; sub-itens são texto"*). Com ícone
 * em tudo, a coluna de glifos vira uma segunda leitura vertical competindo com
 * os nomes; com um só, ele marca a ABERTURA do bloco e o resto se lê como
 * lista. Colapsada a regra se inverte por necessidade — sem texto, o ícone é a
 * única coisa que resta, e todos voltam.
 */
function ItemDaBarra({
  item,
  pathname,
  colapsada,
  comIcone,
  contador,
  favorito,
  aoFavoritar,
}: {
  item: NavItem
  pathname: string
  colapsada: boolean
  comIcone: boolean
  contador: number | undefined
  favorito: boolean
  aoFavoritar: (url: string) => void
}) {
  const ativo = ativoEm(item.url, pathname)
  const Icone = item.icon
  const mostraIcone = comIcone || colapsada

  const miolo = (
    <>
      {mostraIcone ? (
        <Icone aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        // O recuo que o ícone ocupava, para os nomes ficarem alinhados na
        // mesma coluna. Sem ele, o primeiro item do grupo teria o texto 24px
        // à direita dos irmãos e a lista pareceria quebrada.
        <span aria-hidden="true" className="size-4 shrink-0" />
      )}
      {colapsada ? null : <span className="t-ui min-w-0 flex-1 truncate">{item.title}</span>}
      {!colapsada && item.futuro ? (
        <span data-etiqueta className="t-dado-meta shrink-0">
          futuro
        </span>
      ) : null}
      {!colapsada && contador !== undefined ? (
        <span className="t-dado-meta shrink-0">{contador}</span>
      ) : null}
    </>
  )

  const classe = cn(
    'relative flex w-full items-center text-left outline-none',
    colapsada ? 'justify-center' : 'gap-[var(--s-2)]',
  )
  const espaco = { padding: 'calc(var(--s-1) + 3px) var(--s-3)' }

  if (item.futuro) {
    return (
      <li>
        {/* Apagado no TRAÇO, nunca em cima de fundo claro com texto claro: o
            item existe justamente para ser LIDO. `aria-disabled` em vez de
            `disabled` para ele seguir alcançável por leitor de tela — quem
            navega por teclado tem o direito de saber que a tela vai existir. */}
        <div
          data-item
          data-futuro="true"
          aria-disabled="true"
          title={colapsada ? `${item.title} (ainda não existe)` : undefined}
          className={classe}
          style={espaco}
        >
          {miolo}
        </div>
      </li>
    )
  }

  const comum = {
    'data-item': true,
    'data-ativo': ativo,
    title: colapsada ? item.title : undefined,
    className: classe,
    style: espaco,
  }

  const conteudo = item.externo ? (
    // Item EXTERNO é `<a href>`, não navegação do roteador: o alvo é um arquivo
    // estático servido ao lado da SPA, e `<Link to>` o mandaria para o roteador
    // — 404 com o arquivo ali do lado.
    <a href={item.url} target="_blank" rel="noreferrer" {...comum}>
      {miolo}
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  ) : (
    <Link to={item.url} aria-current={ativo ? 'page' : undefined} {...comum}>
      {miolo}
    </Link>
  )

  return (
    <li data-item-linha className="relative">
      {conteudo}
      {/* A ★ aparece no HOVER e no FOCO — quem chega de Tab tem o mesmo alcance
          que quem chega de mouse. Item já marcado a mostra sempre: esconder a
          marca faria o operador perder de vista o que ele mesmo escolheu.
          A D13 liga isto ao endpoint; aqui é gesto e memória local. */}
      {colapsada ? null : (
        <button
          type="button"
          data-estrela
          data-marcado={favorito}
          onClick={() => aoFavoritar(item.url)}
          aria-pressed={favorito}
          aria-label={favorito ? `Desmarcar ${item.title}` : `Marcar ${item.title}`}
          className="-translate-y-1/2 absolute top-1/2 right-1 grid size-5 place-content-center rounded-item outline-none"
        >
          <Star aria-hidden="true" className={cn('size-3.5', favorito && 'fill-current')} />
        </button>
      )}
    </li>
  )
}

/** Um grupo colapsável: rótulo, quadradinho do módulo, chevron e os itens. */
function GrupoDaBarra({
  grupo,
  aberto,
  aoAlternar,
  pathname,
  colapsada,
  contadores,
  favoritos,
  aoFavoritar,
}: {
  grupo: NavGroup
  aberto: boolean
  aoAlternar: (id: string) => void
  pathname: string
  colapsada: boolean
  contadores: ReturnType<typeof useContadoresNav>
  favoritos: string[]
  aoFavoritar: (url: string) => void
}) {
  if (grupo.items.length === 0) return null

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 'var(--s-1)',
        // O matiz do módulo entra por VARIÁVEL e não por classe: o quadradinho
        // lê `--cor-do-modulo`, e quem não tem dono cai no neutro do `nav.css`.
        ...(grupo.matiz && { '--cor-do-modulo': `var(--mod-${grupo.matiz})` }),
      }}
    >
      {/* COLAPSADA a barra não tem onde escrever o rótulo, e um chevron sem
          texto seria um botão mudo. O grupo vira uma hairline entre blocos de
          ícones — a mesma fronteira, na ferramenta mais barata que a resolve. */}
      {colapsada ? (
        <hr data-divisor className="mx-2 my-1" />
      ) : (
        <button
          type="button"
          onClick={() => aoAlternar(grupo.id)}
          aria-expanded={aberto}
          className="flex w-full items-center rounded-control text-left outline-none"
          style={{ gap: 'var(--s-2)', padding: 'var(--s-1) var(--s-3)' }}
        >
          <span aria-hidden="true" data-quadradinho className="shrink-0" />
          <span className="t-rotulo min-w-0 flex-1 truncate">{grupo.title}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn('size-3.5 shrink-0 transition-transform', !aberto && '-rotate-90')}
          />
        </button>
      )}
      {aberto || colapsada ? (
        <ul aria-label={grupo.title} className="flex flex-col" style={{ gap: '2px' }}>
          {grupo.items.map((item, indice) => (
            <ItemDaBarra
              key={item.url}
              item={item}
              pathname={pathname}
              colapsada={colapsada}
              comIcone={indice === 0}
              contador={item.contador ? contadores[item.contador] : undefined}
              favorito={favoritos.includes(item.url)}
              aoFavoritar={aoFavoritar}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SidebarNav({ aoAbrirPaleta }: { aoAbrirPaleta: () => void }) {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()
  const { tem } = useRecursosDaEmpresa()
  const logout = useLogout()
  const contadores = useContadoresNav()

  /**
   * A GAVETA do operador — o estado da barra é dele, não do navegador. Sessão
   * ainda carregando (ou site público, que não tem sessão) usa `anonimo`, que
   * é uma gaveta legítima e não um erro.
   */
  const usuario = sessao?.employeeId ?? 'anonimo'

  const grupos = useMemo(() => GRUPOS_NAV.map((g) => comRecurso(g, tem)), [tem])
  const config = useMemo(() => comRecurso(GRUPO_CONFIG, tem), [tem])

  /** Todo item navegável — alimenta os RECENTES e o grupo FAVORITOS. */
  const todosOsItens = useMemo(
    () => [...grupos, config].flatMap((g) => g.items).filter((item) => !item.futuro),
    [grupos, config],
  )

  const daRota = grupoDaRota(pathname, grupos)
  const { abertos, alternar } = useGruposAbertos(usuario, daRota)
  const { colapsada, alternar: alternarColapso } = useBarraColapsada(usuario)
  const { favoritos, alternar: alternarFavorito } = useFavoritos(usuario)
  const { recentes, registrar } = useRecentes(usuario)

  /**
   * `[` colapsa e reabre a barra.
   *
   * É atalho NOVO, e o CLAUDE.md manda não criar atalho customizado — a exceção
   * está pedida por escrito na issue e, mais importante, ela não fere a regra
   * que aquele veto protege: o colapso tem botão próprio, visível, no rodapé da
   * barra. Nenhum fluxo passa a depender da tecla; ela é conveniência, como o
   * `Ctrl+K`. A linha correspondente está em `MAPA_DE_ATALHOS` e a página
   * `/ajuda/atalhos` a publica.
   */
  useEffect(() => bindShortcut(SHORTCUTS.barraLateral, alternarColapso), [alternarColapso])

  /**
   * RECENTES se alimenta da ROTA, e não de cada tela de ficha.
   *
   * A alternativa seria cada `features/<tela>/ficha` avisar ao abrir — N
   * chamadas para manter, e a primeira que alguém esquecesse deixaria um módulo
   * inteiro fora da lista, em silêncio. Aqui é uma regra só, no lugar que já
   * conhece o mapa de rotas: caminho que é ficha de registro entra; listagem e
   * inclusão não.
   */
  useEffect(() => {
    const registro = registroDoCaminho(pathname, todosOsItens)
    if (registro) registrar({ ...registro, em: Date.now() })
  }, [pathname, todosOsItens, registrar])

  const itensFavoritos = todosOsItens.filter((item) => favoritos.includes(item.url))
  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <nav
      aria-label="Navegação principal"
      data-slot="sidebar-nav"
      data-colapsada={colapsada}
      className="cabinet-nav flex shrink-0 flex-col overflow-hidden"
      style={{
        width: colapsada ? 'var(--nav-largura-colapsada)' : 'var(--nav-largura)',
        transition: 'width var(--dur-2, 200ms) var(--ease, ease)',
      }}
    >
      {/* TOPO — marca, escopo e busca. Os dois últimos são slots da D6. */}
      <div
        data-faixa
        className="flex shrink-0 flex-col border-b"
        style={{ gap: 'var(--s-2)', padding: 'var(--s-3)' }}
      >
        <Link
          to="/"
          aria-label="Cabinet — início"
          className="flex items-center justify-center rounded-control outline-none"
        >
          <Marca variante={colapsada ? 'simbolo' : 'assinatura'} tamanho={colapsada ? 24 : 30} />
        </Link>
        {/* SLOT do seletor de empresa (D6). Colapsada, ele sai: o nome da
            empresa não cabe em 56px, e um ícone anônimo de empresa diria menos
            que nada sobre QUAL empresa está ativa. */}
        {colapsada ? null : <CompanySwitcher />}
        {/* SLOT do ⌘K (D6). Botão com cara de campo — o que parece campo e
            responde abrindo diálogo mentiria como `<input>`. */}
        <button
          type="button"
          data-caixa
          onClick={aoAbrirPaleta}
          aria-label="Abrir a busca"
          aria-keyshortcuts="Control+K"
          title={colapsada ? 'Buscar' : undefined}
          className={cn(
            'flex h-8 items-center text-left outline-none',
            colapsada ? 'justify-center' : 'gap-[var(--s-2)]',
          )}
          style={{ paddingInline: 'var(--s-2)' }}
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          {colapsada ? null : (
            <>
              <span className="t-ui min-w-0 flex-1 truncate">Buscar…</span>
              <span data-etiqueta className="t-dado-meta shrink-0">
                {shortcutLabel(SHORTCUTS.busca)}
              </span>
            </>
          )}
        </button>
      </div>

      {/* A LISTA — o único lugar que rola. Rodapé e topo ficam fixos. */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ gap: 'var(--s-5)', padding: 'var(--s-3)' }}
      >
        <GrupoDaBarra
          grupo={grupos[0] as NavGroup}
          aberto={abertos.includes('hoje')}
          aoAlternar={alternar}
          pathname={pathname}
          colapsada={colapsada}
          contadores={contadores}
          favoritos={favoritos}
          aoFavoritar={alternarFavorito}
        />

        {/* FAVORITOS vem em SEGUNDO, e some quando está vazio: rótulo sem
            conteúdo é ruído, e um grupo vazio permanente ensinaria o operador
            a pular aquela altura da barra para sempre. */}
        <GrupoDaBarra
          grupo={{ id: 'favoritos', title: 'Favoritos', items: itensFavoritos }}
          aberto={abertos.includes('favoritos')}
          aoAlternar={alternar}
          pathname={pathname}
          colapsada={colapsada}
          contadores={contadores}
          favoritos={favoritos}
          aoFavoritar={alternarFavorito}
        />

        {grupos.slice(1).map((grupo) => (
          <GrupoDaBarra
            key={grupo.id}
            grupo={grupo}
            aberto={abertos.includes(grupo.id)}
            aoAlternar={alternar}
            pathname={pathname}
            colapsada={colapsada}
            contadores={contadores}
            favoritos={favoritos}
            aoFavoritar={alternarFavorito}
          />
        ))}

        {/* RECENTES — os últimos registros abertos, não as últimas telas. */}
        {recentes.length > 0 && !colapsada ? (
          <div className="flex flex-col" style={{ gap: 'var(--s-1)' }}>
            <div
              className="flex items-center"
              style={{ gap: 'var(--s-2)', padding: 'var(--s-1) var(--s-3)' }}
            >
              <Clock aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="t-rotulo min-w-0 flex-1 truncate">Recentes</span>
            </div>
            <ul aria-label="Recentes" className="flex flex-col" style={{ gap: '2px' }}>
              {recentes.slice(0, MAXIMO_DE_RECENTES).map((recente) => (
                <li key={recente.url}>
                  <Link
                    to={recente.url}
                    data-item
                    data-ativo={pathname === recente.url}
                    className="relative flex w-full items-center outline-none"
                    style={{
                      gap: 'var(--s-2)',
                      padding: 'calc(var(--s-1) + 1px) var(--s-3)',
                    }}
                  >
                    <span className="t-ui min-w-0 flex-1 truncate">{recente.rotulo}</span>
                    <span className="t-dado-meta shrink-0">{idadeRelativa(recente.em)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* RODAPÉ — o que se AJUSTA e quem ajusta, fora da rolagem. */}
      <div
        data-faixa
        className="flex shrink-0 flex-col border-t"
        style={{ gap: 'var(--s-1)', padding: 'var(--s-2)' }}
      >
        <ul className="flex flex-col" style={{ gap: '2px' }}>
          {config.items.map((item) => (
            <ItemDaBarra
              key={item.url}
              item={item}
              pathname={pathname}
              colapsada={colapsada}
              comIcone
              contador={undefined}
              favorito={favoritos.includes(item.url)}
              aoFavoritar={alternarFavorito}
            />
          ))}
        </ul>

        <DropdownMenuTrigger>
          {/* `Button` do react-aria, e não `<button>` cru: o `MenuTrigger`
              entrega os gestos ao filho por `PressResponder`, e elemento DOM
              puro não os recebe — o menu não abriria e o `Sair` ficaria
              inalcançável pelo mouse. */}
          <ButtonAria
            data-item
            aria-label={`Operador: ${nome}`}
            className={cn(
              'flex items-center outline-none',
              colapsada ? 'justify-center' : 'gap-[var(--s-2)]',
            )}
            style={{ padding: 'var(--s-1)' }}
          >
            <span className="t-dado-meta grid size-7 shrink-0 place-content-center rounded-item border">
              {iniciaisDoNome(nome)}
            </span>
            {colapsada ? null : (
              <>
                <span className="grid min-w-0 flex-1 text-left">
                  <span className="t-ui truncate">{nome}</span>
                  {/* O contrato NÃO publica e-mail na sessão (`SessaoAtual` tem
                      `displayName`, não `email`), e o §Regra da fase manda o que
                      o servidor não guarda ficar VISÍVEL como ausente em vez de
                      ser preenchido com mock. No lugar dele, o PAPEL na empresa
                      ativa — que o contrato publica e que diz mais sobre o que
                      esta pessoa pode fazer aqui. */}
                  {ativa ? <span className="t-meta truncate">{papelLabel(ativa.role)}</span> : null}
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
              </>
            )}
          </ButtonAria>
          <DropdownMenu placement="top start">
            <DropdownMenuLabel>{nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ITENS_DO_MENU_DO_OPERADOR.map((item) => (
              <DropdownMenuItem key={item.url} textValue={item.title} href={item.url}>
                <item.icon aria-hidden="true" />
                {item.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onAction={() => logout.mutate()} isDisabled={logout.isPending}>
              {logout.isPending ? 'Saindo…' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>

        <button
          type="button"
          data-item
          onClick={alternarColapso}
          aria-label={colapsada ? 'Expandir a navegação' : 'Recolher a navegação'}
          aria-keyshortcuts="["
          aria-expanded={!colapsada}
          className={cn(
            'flex items-center outline-none',
            colapsada ? 'justify-center' : 'gap-[var(--s-2)]',
          )}
          style={{ padding: 'calc(var(--s-1) + 3px) var(--s-3)' }}
        >
          {colapsada ? (
            <PanelLeftOpen aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4 shrink-0" />
          )}
          {colapsada ? null : (
            <>
              <span className="t-ui min-w-0 flex-1 text-left">Recolher</span>
              <span data-etiqueta className="t-dado-meta shrink-0">
                {shortcutLabel(SHORTCUTS.barraLateral)}
              </span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}

/** Duas iniciais — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}
