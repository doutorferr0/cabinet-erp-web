import { trilhaDaRota } from '@/app/appbar/trilha'
import { secoesVisiveis } from '@/app/navigation'
import { ModeToggle } from '@/components/cabinet/mode-toggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'

export { secaoDaRota, trilhaDaRota } from '@/app/appbar/trilha'

/** Onde mora a ajuda enquanto ela é uma tela só (o mapa de atalhos). */
const ROTA_DA_AJUDA = '/ajuda/atalhos'

/**
 * A MEDIDA das quatro ações globais, escrita uma vez.
 *
 * Elas são uma fileira, e fileira com dois tamanhos é o defeito que a régua de
 * separação existe para impedir — o `size="icon"` do botão dá 36px, a tecla da
 * 2.0 é 32. Quem manda é a appbar, porque é ela que enfileira.
 */
const TECLA_GLOBAL = 'size-8'

/**
 * A MIGALHA da appbar — o único texto da faixa.
 *
 * `n-500` nos degraus, separador `/`, último em tinta e peso 500: a hierarquia
 * do lugar sai da COR, nunca do tamanho (§Hierarquia — dentro de Inter, tamanho
 * não é hierarquia entre 12 e 13.5). É `<ol>` porque a ordem dos degraus É a
 * informação: quem ouve precisa saber que Estoque contém Ordem de Compra, e uma
 * pilha de `<span>` não diz isso.
 *
 * Não usa `@/components/ui/breadcrumb`, e o motivo é o ROTEADOR: aquela peça é
 * React Aria e navega por `href`, que numa SPA recarrega a página inteira. Ligá-la
 * aqui exigiria um `RouterProvider` da RAC no topo da árvore — decisão de
 * arquitetura que não é desta issue. Ela segue no repo, reafinada à régua 2.0,
 * para a migalha de dentro da página.
 */
/**
 * `text-…!` e `hover:…!`: as classes `.t-*` de `tokens-2.0.css` são regra SEM
 * `@layer`, e no cascade autor-sem-camada vence autor-em-camada — as utilities
 * do Tailwind v4 vivem em `@layer utilities`. Sem o `!`, `.t-ui { color: n-900 }`
 * apagaria a cor de cada degrau e a migalha inteira sairia em tinta cheia, que
 * é justamente a hierarquia que ela existe para mostrar. Falha SILENCIOSA: a
 * classe está lá, o teste que confere classe passa, e só a tela mostra.
 */
function MigalhaDaRota() {
  const { location } = useRouterState()
  const { tem } = useRecursosDaEmpresa()
  const degraus = trilhaDaRota(secoesVisiveis(tem), location.pathname)

  if (degraus.length === 0) return null

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol data-slot="appbar-trilha" className="flex min-w-0 items-center gap-1.5">
        {degraus.map((degrau, indice) => {
          const ultimo = indice === degraus.length - 1
          return (
            <li key={degrau.rotulo} className="flex min-w-0 items-center gap-1.5">
              {indice > 0 ? (
                <span aria-hidden="true" className="shrink-0 text-muted-foreground">
                  /
                </span>
              ) : null}
              {degrau.url && !ultimo ? (
                <Link
                  to={degrau.url}
                  className="t-ui shrink-0 rounded-control text-muted-foreground! outline-none hover:text-foreground! focus-visible:focus-ring"
                >
                  {degrau.rotulo}
                </Link>
              ) : (
                <span
                  {...(ultimo && { 'aria-current': 'page' as const })}
                  className={cn(
                    't-ui min-w-0 truncate',
                    ultimo ? 'text-foreground!' : 'text-muted-foreground!',
                  )}
                >
                  {degrau.rotulo}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Uma das quatro — a que navega. Mesma medida, mesmo hover e mesmo anel das
 * outras três, escritos aqui em vez de repetidos em cada uma.
 */
function TeclaDeLink({
  para,
  nome,
  children,
}: {
  /** Já estreitado pelo chamador: `exactOptionalPropertyTypes` recusa
   *  `undefined` dentro do atributo `to`. */
  para: string
  nome: string
  children: ReactNode
}) {
  return (
    <TooltipTrigger delay={200}>
      <Link
        to={para}
        aria-label={nome}
        className={cn(
          TECLA_GLOBAL,
          'grid place-content-center rounded-control text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:focus-ring aria-[current=page]:bg-muted aria-[current=page]:text-foreground',
        )}
      >
        {children}
      </Link>
      <Tooltip>{nome}</Tooltip>
    </TooltipTrigger>
  )
}

/**
 * APPBAR 2.0 (Reface 2.0 · D5) — 56px, faixa de bancada com hairline embaixo,
 * **migalha à esquerda e quatro ações globais à direita**. Nada mais.
 *
 * ## O que saiu, e por quê
 *
 * A appbar 1.x carregava marca, fileira de sete seções, busca central, seletor
 * de empresa e menu do operador; logo abaixo dela, uma SEGUNDA faixa de 52px
 * repetia o lugar ("Estoque / Ordem de Compra") ao lado do botão de colapso da
 * barra lateral. Duas faixas para dizer onde o operador está, e a de cima
 * também tentava ser navegação.
 *
 * Na 2.0 a navegação inteira mora na barra lateral (D4/D6) e o topo faz uma
 * coisa só: dizer o lugar e oferecer o que vale em TODA tela. A faixa de 52px
 * some junto — o botão de colapso é da barra, e voltou para ela.
 *
 * ## Quatro, e sempre as mesmas quatro
 *
 * Ajuda · Notificações · Configurações · Tema. Fixas em toda rota e na mesma
 * ordem: o canto direito da casca é memória muscular, e ação que aparece só em
 * algumas telas obriga a reler a fileira em cada tela. Ação de TELA não sobe
 * para cá — ela mora no `PageHeader`, junto do título que ela opera.
 *
 * ## Notificação vira PONTO, não número
 *
 * O contador dizia "7" sobre um sino de 16px, em mono de 10px — um dado que só
 * se lê de perto e que não muda decisão nenhuma: 7 ou 12, o operador vai abrir
 * do mesmo jeito. O ponto responde a única pergunta que a casca precisa fazer
 * ("há algo novo?"), e a contagem exata fica onde a lista está. O nome
 * acessível continua dizendo o número, porque quem ouve não vê o ponto.
 */
export function Appbar({
  naoLidas,
  aoAbrirNotificacoes,
}: {
  naoLidas: number
  /**
   * Abre a gaveta de notificações. Vira `<Link to="/inbox">` em D7, quando a
   * caixa de entrada tiver rota própria; a decisão de layout (gaveta que
   * empurra) mora no shell, não aqui.
   */
  aoAbrirNotificacoes: () => void
}) {
  const { tem } = useRecursosDaEmpresa()
  const config = secoesVisiveis(tem).find((secao) => secao.oculta)
  // Em const, e não lido dentro do JSX: `exactOptionalPropertyTypes` recusa
  // `to={config?.raiz}` porque a estreiteza se perde dentro do atributo.
  const raizDaConfig = config?.raiz

  return (
    <div
      data-slot="appbar"
      // `sticky` e não `fixed`: a faixa é irmã do conteúdo na mesma coluna, e
      // `fixed` a tiraria do fluxo — o topo da página passaria por baixo dela.
      // Hairline embaixo, e só ela: a fronteira entre casca e conteúdo é UMA
      // ferramenta de separação (§Hierarquia).
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-rule-hair border-b bg-surface-sunken px-4"
    >
      <MigalhaDaRota />

      {/* `ml-auto` no GRUPO: as quatro formam um bloco só no canto, com o mesmo
          respiro entre elas. */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <TeclaDeLink para={ROTA_DA_AJUDA} nome="Ajuda">
          <CircleHelp aria-hidden="true" className="size-4" />
        </TeclaDeLink>

        <TooltipTrigger delay={200}>
          <Button
            variant="ghost"
            size="icon"
            onClick={aoAbrirNotificacoes}
            aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
            className={cn(TECLA_GLOBAL, 'relative')}
          >
            <Bell className="size-4" />
            {naoLidas > 0 ? (
              <span
                aria-hidden="true"
                data-slot="ponto-de-notificacao"
                className="absolute top-1 right-1 size-2 rounded-full bg-[var(--bad)]"
              />
            ) : null}
          </Button>
          <Tooltip>Notificações</Tooltip>
        </TooltipTrigger>

        {config && raizDaConfig ? (
          <TeclaDeLink para={raizDaConfig} nome="Configurações">
            <config.icon aria-hidden="true" className="size-4" />
          </TeclaDeLink>
        ) : null}

        <ModeToggle className={TECLA_GLOBAL} />
      </div>
    </div>
  )
}
