import { type NavSecao, destinoDaSecao, secoesVisiveis } from '@/app/navigation'
import { ATALHO_DA_PALETA } from '@/app/paleta-de-comandos'
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
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { useLogout, useSessao } from '@/data/sessao'
import { cn } from '@/lib/utils'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, Search } from 'lucide-react'
import { Button as ButtonAria } from 'react-aria-components'

/**
 * CINTO PROVISÓRIO — as peças que a appbar 1.x carregava e que a appbar 2.0
 * (D5) não recebe: marca, fileira de seções, busca `Ctrl+K`, seletor de empresa
 * e menu do operador.
 *
 * ## Por que existe um arquivo com "provisório" no nome
 *
 * A appbar 2.0 é migalha e quatro ações globais, e **nada mais** — a navegação
 * inteira desce para a barra lateral em D4 (sidebar única, com módulos
 * colapsáveis) e o seletor de empresa vira tecla da barra em D6. As duas
 * rodavam em paralelo com esta, então apagar as peças aqui deixaria o sistema,
 * até elas mergearem, sem trocar de seção, sem trocar de empresa e **sem
 * sair** — a `main` publica dois sites em produção a cada merge.
 *
 * Elas descem então para a barra lateral, que é a casa definitiva delas, num
 * arquivo SÓ: D4 e D6 apagam este arquivo inteiro ao chegar, em vez de
 * resolver conflito linha a linha dentro do shell. O desenho aqui é o da 1.x,
 * de propósito — refazê-lo seria fazer o trabalho de D4 com metade da espec.
 */
export function CintoDeNavegacao({
  secoes,
  secaoAtiva,
  aoEscolherSecao,
  aoAbrirPaleta,
}: {
  secoes: NavSecao[]
  secaoAtiva: string | undefined
  aoEscolherSecao: (id: string) => void
  aoAbrirPaleta: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Marca variante="assinatura" tamanho={30} />
      </div>

      <button
        type="button"
        onClick={aoAbrirPaleta}
        aria-label="Abrir a paleta de comandos"
        aria-keyshortcuts="Control+K"
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded-control border-2 border-input bg-card px-2.5 text-left text-muted-foreground text-sm outline-none hover:bg-muted focus-visible:focus-ring"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Pesquisar…</span>
        {/* O atalho fica ESCRITO no botão: quem prefere teclado aprende sem
            documentação, e quem não prefere continua clicando. */}
        <span className="shrink-0 rounded-data border-2 border-border px-1 font-mono text-[10px] uppercase tracking-[0.06em]">
          {ATALHO_DA_PALETA}
        </span>
      </button>

      <SecoesEmFileira secoes={secoes} secaoAtiva={secaoAtiva} aoEscolher={aoEscolherSecao} />
    </div>
  )
}

/**
 * O que vai DENTRO do ícone da seção: o desenho e, no ativo, o fio.
 *
 * Componente de topo, e não um fragmento montado dentro do `.map`: função
 * declarada por render é um TIPO novo a cada render, e o React desmonta e
 * remonta a subárvore inteira em vez de atualizá-la.
 *
 * O fio sai em TINTA, não na cheia /01 do módulo: a /01 mede 1,36–2,63:1
 * contra o fundo da barra no claro, contra o piso de 3:1 da WCAG 1.4.11 (#140).
 * Ele é o que separa ativo de hover — os dois usam o mesmo pastel /02.
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
 * A FILEIRA DE SEÇÕES — só ícone, o nome no hover e no foco.
 *
 * A dica é `::after` com `content: attr(...)`, e não o `Tooltip` do design
 * system: sete `TooltipTrigger` do react-aria montam em TODA rota, e medido em
 * `src/routes/` custavam **+8,4% na suíte** (33,19s → 36,30s) — custo de render
 * que o operador também paga. O texto vem de `data-rotulo` porque conteúdo
 * gerado por CSS não entra no nome acessível, e ler o rótulo do `aria-label`
 * deixaria a dica calada no dia em que alguém trocasse por `aria-labelledby`.
 *
 * `<Link>` quando a seção tem tela; `<button>` quando não tem (`Financeiro` só
 * publica tela futura, e inventar um `/financeiro` daria 404). **As duas avisam
 * `aoEscolher`**: clicar numa seção cujo destino é a rota atual não navega, e
 * só o `<button>` avisar deixava a escolha anterior de pé.
 */
function SecoesEmFileira({
  secoes,
  secaoAtiva,
  aoEscolher,
}: {
  secoes: NavSecao[]
  secaoAtiva: string | undefined
  aoEscolher: (id: string) => void
}) {
  return (
    <nav aria-label="Seções" className="flex flex-wrap items-center gap-0.5">
      {secoes.map((secao) => {
        const ativa = secao.id === secaoAtiva
        const destino = destinoDaSecao(secao)
        const comum = {
          'aria-label': secao.rotulo,
          'aria-current': ativa ? ('page' as const) : undefined,
          ...(secao.modulo && { 'data-modulo': secao.modulo }),
          'data-rotulo': secao.rotulo,
          className: cn(
            'relative grid size-9 shrink-0 place-content-center rounded-control outline-none hover:bg-modulo focus-visible:focus-ring',
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

/** Duas primeiras iniciais do nome — o mesmo corte que os avatares do quadro usam. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/**
 * EMPRESA + OPERADOR — o par que responde "sobre qual dado eu estou" e "quem
 * sou eu aqui", com o `Sair` dentro do menu.
 *
 * O rodapé da barra é onde D6 põe o seletor de empresa; o menu do operador vai
 * junto porque os dois são a mesma pergunta de escopo, e separá-los agora
 * criaria duas mudanças para D6 desfazer.
 */
export function CintoDeIdentidade() {
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()
  const logout = useLogout()
  const navigate = useNavigate()
  const { tem } = useRecursosDaEmpresa()
  const config = secoesVisiveis(tem).find((secao) => secao.oculta)
  // Em const: `exactOptionalPropertyTypes` recusa `config?.raiz` dentro do
  // atributo, onde a estreiteza se perde.
  const raizDaConfig = config?.raiz

  const nome = sessao?.displayName?.trim() || 'Usuário'

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <CompanySwitcher />

      <DropdownMenuTrigger>
        {/* `Button` do react-aria, e não `<button>` cru: o `MenuTrigger` entrega
            os gestos ao filho por `PressResponder`, e elemento DOM puro não os
            recebe — o menu não abria, e o `Sair` dentro dele era inalcançável
            pelo mouse. */}
        <ButtonAria className="flex w-full min-w-0 items-center gap-2 rounded-control py-1 pr-2 pl-1 text-left font-semibold text-sm outline-none hover:bg-muted focus-visible:focus-ring">
          <span className="grid size-7 shrink-0 place-content-center rounded-item bg-accent font-mono text-xs">
            {iniciaisDoNome(nome)}
          </span>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate">{nome}</span>
            {ativa ? (
              <span className="truncate font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.06em]">
                {papelLabel(ativa.role)}
              </span>
            ) : null}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </ButtonAria>
        <DropdownMenu placement="top start">
          <DropdownMenuLabel>{nome}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {config && raizDaConfig ? (
            // A engrenagem da appbar é ícone sem palavra: quem não a associa a
            // "configurações" não tem como saber que ela é o caminho. Aqui o
            // destino está POR ESCRITO, que é onde o hábito manda procurar
            // ajuste de conta.
            // `onAction` e não `href`: o menu do react-aria não conhece o
            // roteador do TanStack, e uma âncora recarregaria a SPA inteira.
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
  )
}
