import { type NavSecao, secoesVisiveis } from '@/app/navigation'
import { ATALHO_DA_PALETA } from '@/app/paleta-de-comandos'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
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
import { Bell, ChevronDown, Search } from 'lucide-react'

/** Duas primeiras iniciais do nome — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/** A primeira tela navegável da seção — o destino do ícone. */
export function primeiraTelaDaSecao(secao: NavSecao): string | undefined {
  for (const grupo of secao.grupos) {
    for (const item of grupo.items) {
      if (item.futuro) continue
      if (item.filhas) {
        const filha = item.filhas.find((f) => !f.futuro)
        if (filha) return filha.url
        continue
      }
      return item.url
    }
  }
  return undefined
}

/** A seção dona desta rota — é ela que fica acesa e desenha a barra lateral. */
export function secaoDaRota(secoes: NavSecao[], pathname: string): NavSecao | undefined {
  return secoes.find((secao) =>
    secao.grupos.some((grupo) =>
      grupo.items
        .flatMap((item) => item.filhas ?? [item])
        .some((item) => pathname === item.url || pathname.startsWith(`${item.url}/`)),
    ),
  )
}

/**
 * A aba de uma seção: ÍCONE GRANDE, nome só no hover.
 *
 * Decisão fechada do user (v7): o rótulo escrito ao lado de seis ícones comeria
 * a faixa inteira e empurraria empresa e avatar para fora em tela de 1366. O
 * nome existe — em tooltip para quem vê, e em `aria-label` para quem ouve, que
 * é o que impede o ícone de ser um enigma para leitor de tela.
 *
 * ## Botão, e não link — e a razão não é preguiça
 *
 * A aba ABRE UMA SEÇÃO na barra lateral; ela não é um endereço. Fazer dela um
 * `<Link>` para a primeira tela obrigaria toda seção a ter uma tela navegável —
 * e **Financeiro não tem nenhuma ainda**. A aba sumiria justamente da seção
 * cujo propósito hoje é mostrar para onde o sistema cresce.
 *
 * A troca de seção não navega: quem navega é o item que o operador escolher na
 * barra. Isso também é o que evita que um clique de exploração jogue fora um
 * formulário meio preenchido.
 */
function AbaDeSecao({
  secao,
  ativa,
  aoEscolher,
}: {
  secao: NavSecao
  ativa: boolean
  aoEscolher: () => void
}) {
  return (
    <TooltipTrigger delay={200}>
      <button
        type="button"
        onClick={aoEscolher}
        aria-label={secao.rotulo}
        aria-current={ativa ? 'page' : undefined}
        {...(secao.modulo && { 'data-modulo': secao.modulo })}
        className={cn(
          'relative grid h-full w-14 place-content-center outline-none hover:bg-modulo focus-visible:focus-ring',
          ativa && 'bg-modulo',
        )}
      >
        <secao.icon aria-hidden="true" className="size-6" />
        {/* O fio de 3px é ELEMENTO, não `border`: nenhuma utility de borda
            deste repo pinta cor (o `* { border-color }` do fim do `index.css`
            está fora de `@layer` e vence a camada `utilities`), e `index.css`
            não é zona desta issue. Fundo pinta. */}
        {ativa ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] bg-modulo-cheia"
          />
        ) : null}
      </button>
      <Tooltip>{secao.rotulo}</Tooltip>
    </TooltipTrigger>
  )
}

/**
 * APPBAR GLOBAL — faixa acima do cabeçalho de página, presente em TODA rota
 * (§@casca-global). Vive no shell, não na tela: duplicá-la por página
 * desalinharia da regra "appbar = layout".
 *
 * ## Busca — deixou de ser decoração
 *
 * Até a paleta de comandos existir, este campo aceitava digitação e não fazia
 * nada: era CHROME copiado do mockup, e por isso não podia anunciar atalho
 * nenhum — prometer tecla que não abre nada é o mesmo defeito mudo do "sino que
 * não toca".
 *
 * Agora ele **abre a paleta**, e por isso deixou de ser `<input>`: o que parece
 * campo de texto e responde abrindo um diálogo mente sobre o que vai acontecer
 * ao digitar. É um BOTÃO com cara de campo — a mesma peça que o Supabase Studio
 * usa —, e é o caminho por CLIQUE que a decisão de interface do CLAUDE.md exige.
 * `Ctrl+K` fica como conveniência, escrito no próprio botão para quem quiser
 * aprender.
 *
 * ## As seis seções, e a engrenagem que é a sétima
 *
 * A faixa deixou de ser só busca + globais: ela carrega a NAVEGAÇÃO de primeiro
 * nível (Nav-2), espalhada na largura toda com fio entre as abas. A marca voltou
 * ao topo da barra lateral e a empresa mora nos globais da direita (busca ·
 * engrenagem · sino · empresa · operador) — formato de referência aprovado pelo
 * user em 2026-08-17, emenda registrada na issue #140.
 *
 * A engrenagem **abre Configurações**, a sétima seção, oculta da fileira: ela
 * existe fora do caminho de operação (Odoo CogMenu, HubSpot settings). Deixou
 * de ser o botão apagado que dizia "ainda não existe" — agora existe, e leva a
 * Funis, Motivos de Perda e Mapeamento de Tabelas.
 *
 * ## Sino — abre a gaveta que EMPURRA
 *
 * `aoAbrirGaveta` é do AppShell: a gaveta é coluna irmã do `<main>`, e o estado
 * de aberta/fechada mora lá, não aqui — a appbar só avisa a intenção.
 */
export function Appbar({
  naoLidas,
  secaoAtiva,
  aoEscolherSecao,
  aoAbrirGaveta,
  aoAbrirPaleta,
}: {
  naoLidas: number
  /** Id da seção aberta na barra lateral — quem a guarda é o `AppShell`. */
  secaoAtiva: string | undefined
  aoEscolherSecao: (id: string) => void
  aoAbrirGaveta: () => void
  aoAbrirPaleta: () => void
}) {
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()
  const logout = useLogout()
  const { tem } = useRecursosDaEmpresa()

  // O MENU É DA EMPRESA ATIVA: seção sem nenhum item que ela opere não vira
  // aba — o ícone abriria um painel em branco.
  const secoes = secoesVisiveis(tem)
  const config = secoes.find((secao) => secao.oculta)

  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <div
      data-slot="appbar"
      className="flex items-stretch gap-3 border-rule-strong border-b-2 bg-card px-4"
    >
      {/* AS SEIS SEÇÕES ocupam a LARGURA TODA da faixa, com fio vertical entre
          vizinhas (referência do user, 2026-08-17 — emenda na issue #140): a
          marca subiu para a barra lateral e a empresa foi para os globais da
          direita, então a navegação é o que resta — e o que manda — na faixa.
          `nav` com rótulo: é a navegação primária do sistema, e sem nome ela é
          uma fileira de ícones anônimos no leitor de tela. */}
      <nav aria-label="Seções" className="flex min-w-0 flex-1 items-stretch">
        {secoes
          .filter((secao) => !secao.oculta)
          .map((secao, indice) => (
            <div key={secao.id} className="flex flex-1 items-stretch">
              {/* O fio é ELEMENTO, não `border` — mesma razão do fio de 3px da
                  aba: utility de borda não pinta cor neste repo. */}
              {indice > 0 ? (
                <span aria-hidden="true" className="my-auto h-7 w-0.5 shrink-0 bg-border" />
              ) : null}
              <div className="flex flex-1 items-stretch justify-center">
                <AbaDeSecao
                  secao={secao}
                  ativa={secao.id === secaoAtiva}
                  aoEscolher={() => aoEscolherSecao(secao.id)}
                />
              </div>
            </div>
          ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2.5 py-2.5">
        <button
          type="button"
          onClick={aoAbrirPaleta}
          aria-label="Abrir a paleta de comandos"
          aria-keyshortcuts="Control+K"
          className="flex h-9 w-60 min-w-33 shrink items-center gap-2 border-2 border-input bg-card px-2.5 text-left text-muted-foreground text-sm outline-none hover:bg-muted focus-visible:focus-ring"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Pesquisar…</span>
          {/* O atalho fica ESCRITO no botão: quem prefere teclado aprende sem
            documentação, e quem não prefere continua clicando. */}
          <span className="shrink-0 border-2 border-border px-1 font-mono text-[10px] uppercase tracking-[0.06em]">
            {ATALHO_DA_PALETA}
          </span>
        </button>

        {config ? (
          <TooltipTrigger delay={200}>
            <button
              type="button"
              onClick={() => aoEscolherSecao(config.id)}
              aria-label="Configurações"
              aria-current={secaoAtiva === config.id ? 'page' : undefined}
              className={cn(
                'grid size-9 place-content-center border-2 border-border bg-card outline-none hover:bg-muted focus-visible:focus-ring',
                secaoAtiva === config.id && 'bg-muted',
              )}
            >
              <config.icon aria-hidden="true" className="size-4" />
            </button>
            <Tooltip>Configurações</Tooltip>
          </TooltipTrigger>
        ) : null}

        <Button
          variant="outline"
          size="icon"
          onClick={aoAbrirGaveta}
          aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
          className="relative"
        >
          <Bell />
          {naoLidas > 0 ? (
            // Bolinha, não corte lateral — a mesma regra da gaveta (reprovado
            // 2× no mockup): a notificação não-lida se lê sem invadir a moldura.
            <span
              aria-hidden="true"
              className="-top-1 -right-1 absolute grid size-4 place-content-center rounded-full border-2 border-border bg-destructive font-mono text-[0.625rem] font-bold text-destructive-foreground tabular-nums"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          ) : null}
        </Button>

        <div aria-hidden="true" className="h-7 w-0.5 bg-border" />

        {/* EMPRESA entre os globais e o operador: o escopo do dado mora ao lado
            de quem opera — decisão do user (2026-08-17, emenda na #140), que
            tirou a pill do canto esquerdo. */}
        <div className="w-64 min-w-44 shrink">
          <CompanySwitcher />
        </div>

        <DropdownMenuTrigger>
          <button
            type="button"
            className="flex items-center gap-2 rounded-control border-2 border-border bg-zone-id py-1 pr-2.5 pl-1 font-semibold text-sm outline-none focus-visible:focus-ring"
          >
            <span className="grid size-8 shrink-0 place-content-center rounded-item border-2 bg-accent font-mono text-xs">
              {iniciaisDoNome(nome)}
            </span>
            <span className="grid text-left leading-tight">
              <span className="truncate">{nome}</span>
              {ativa ? (
                <span className="truncate font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
                  {papelLabel(ativa.role)}
                </span>
              ) : null}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <DropdownMenu placement="bottom end">
            <DropdownMenuLabel>{nome}</DropdownMenuLabel>
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
