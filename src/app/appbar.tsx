import { type NavSecao, secoesVisiveis } from '@/app/navigation'
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
import { Bell, ChevronDown, Search } from 'lucide-react'

/** Duas primeiras iniciais do nome — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/** A seção dona desta rota — é ela que fica acesa e vem aberta na barra lateral. */
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
 * TOPBAR — no formato do admin Shopify (POLARIS, referência única desde
 * 2026-08-17): faixa fina e branca com a marca à esquerda, a busca no centro
 * e os globais à direita. A NAVEGAÇÃO NÃO MORA MAIS AQUI — as seções, com
 * rótulo, desceram para a barra lateral (sidebar-first), que é onde o Polaris
 * as põe. A fileira de seis ícones anônimos foi descartada junto com o
 * brutalism.
 *
 * ## Busca — abre a paleta
 *
 * Botão com cara de campo (mesma peça do Supabase Studio): o que parece campo
 * e responde abrindo diálogo mentiria como `<input>`. `Ctrl+K` escrito no
 * próprio botão. No Polaris a busca é central e larga — aqui também.
 *
 * ## Engrenagem — a seção oculta
 *
 * Abre Configurações na barra lateral (7ª seção, fora da fileira de operação:
 * Odoo CogMenu, HubSpot settings).
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

  const secoes = secoesVisiveis(tem)
  const config = secoes.find((secao) => secao.oculta)

  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <div
      data-slot="appbar"
      className="flex h-12 shrink-0 items-center gap-3 border-rule-strong border-b-2 bg-card px-4"
    >
      {/* A MARCA à esquerda da topbar — posição Polaris (o logo do admin
          Shopify). Ela subiu da barra lateral quando a navegação desceu:
          os dois não disputam mais o mesmo canto. */}
      <div className="flex shrink-0 items-center">
        <Marca variante="assinatura" tamanho={34} />
      </div>

      {/* BUSCA CENTRAL, larga — a âncora da topbar no Polaris. */}
      <div className="flex min-w-0 flex-1 justify-center">
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

      <div className="flex shrink-0 items-center gap-2">
        {config ? (
          <TooltipTrigger delay={200}>
            <button
              type="button"
              onClick={() => aoEscolherSecao(config.id)}
              aria-label="Configurações"
              aria-current={secaoAtiva === config.id ? 'page' : undefined}
              className="grid size-8 place-content-center rounded-control outline-none hover:bg-muted focus-visible:focus-ring"
            >
              <config.icon aria-hidden="true" className="size-4" />
            </button>
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
        <div className="w-64 shrink-0">
          <CompanySwitcher />
        </div>

        <DropdownMenuTrigger>
          <button
            type="button"
            className="flex items-center gap-2 rounded-control py-1 pr-2 pl-1 font-semibold text-sm outline-none hover:bg-muted focus-visible:focus-ring"
          >
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
