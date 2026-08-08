import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { papelLabel } from '@/data/papeis'
import { useLogout, useSessao } from '@/data/sessao'
import { Bell, ChevronDown, Search, Settings } from 'lucide-react'
import { useState } from 'react'

/** Duas primeiras iniciais do nome — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/**
 * APPBAR GLOBAL — faixa acima do cabeçalho de página, presente em TODA rota
 * (§@casca-global). Vive no shell, não na tela: duplicá-la por página
 * desalinharia da regra "appbar = layout".
 *
 * ## Busca — decoração de propósito
 *
 * O mockup só tem o campo — sem JS, sem filtro. Não existe busca global no
 * sistema (cada tela tem a própria "Janela de busca", padrão #5), então este
 * campo é CHROME: aceita digitação, não filtra nada. Por isso não leva o
 * atalho `Ctrl+K` do registry (`shortcuts.ts`) — aquele é da busca do
 * CONTEXTO atual, e prometer aqui um atalho que não abre nada seria o mesmo
 * defeito mudo do "sino que não toca".
 *
 * ## Engrenagem — desabilitada de propósito
 *
 * Não existe tela de configurações no sistema. Um botão que não leva a lugar
 * nenhum é pior que um botão apagado — a mesma razão que desabilita
 * `Alterar`/`Consultar` quando o contrato não tem `get`.
 *
 * ## Sino — abre a gaveta que EMPURRA
 *
 * `aoAbrirGaveta` é do AppShell: a gaveta é coluna irmã do `<main>`, e o estado
 * de aberta/fechada mora lá, não aqui — a appbar só avisa a intenção.
 */
export function Appbar({
  naoLidas,
  aoAbrirGaveta,
}: {
  naoLidas: number
  aoAbrirGaveta: () => void
}) {
  const [busca, setBusca] = useState('')
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()
  const logout = useLogout()

  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <div
      data-slot="appbar"
      className="flex flex-wrap items-center gap-3 border-rule-strong border-b-2 bg-card px-4 py-2.5"
    >
      <div className="relative w-60 min-w-33 shrink">
        <Search
          className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Pesquisar"
          placeholder="Pesquisar…"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          className="pl-8"
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <TooltipTrigger>
          <Button variant="outline" size="icon" isDisabled aria-label="Configurações">
            <Settings />
          </Button>
          <Tooltip>Configurações — ainda não existe</Tooltip>
        </TooltipTrigger>

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
