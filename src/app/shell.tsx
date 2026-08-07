import { moduloDaRota } from '@/app/modulo'
import { type NavGroup, gruposVisiveis } from '@/app/navigation'
import { PageFrame } from '@/app/page-frame'
import { RequireRecurso } from '@/app/require-recurso'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
import { ModeToggle } from '@/components/cabinet/mode-toggle'
import { Ornamento } from '@/components/cabinet/ornamento'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'

/**
 * O que o cartão de hover mostra ao pousar no RÓTULO de um grupo: as telas
 * daquele grupo, com a atual marcada.
 *
 * Mora no rótulo, e não em cada item, porque no item o cartão listava as
 * IRMÃS — que já estão logo abaixo, na mesma coluna, a um palmo do ponteiro.
 * Era a seção reescrita ao lado dela mesma. No rótulo a relação passa a ser a
 * que o operador já espera de um menu: o pai abre os filhos.
 *
 * Segue sendo acréscimo, nunca caminho único: tudo que está no cartão está na
 * sidebar logo abaixo (§HoverCard). Por isso o rótulo NÃO vira parada de
 * teclado — seria um tab a mais por grupo para revelar exatamente o que o tab
 * seguinte já mostra. Quem navega por teclado entra direto nos itens.
 */
function TelasDoGrupo({ grupo, atual }: { grupo: NavGroup; atual: string }) {
  return (
    <ul className="flex flex-col">
      {grupo.items.map((tela) => {
        const naTela = atual === tela.url || atual.startsWith(`${tela.url}/`)
        return (
          <li key={tela.url}>
            <Link
              to={tela.url}
              className={cn(
                'flex items-center gap-2 rounded-item px-1.5 py-1 text-sm no-underline transition-colors hover:bg-neutral',
                naTela && 'bg-primary font-semibold text-primary-foreground',
              )}
              {...(naTela && { 'aria-current': 'page' })}
            >
              <tela.icon className="size-3.5 shrink-0" />
              {tela.title}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function AppSidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname
  // O MENU É DA EMPRESA ATIVA, não do sistema: item cujo recurso a empresa não
  // tem some da barra — e some do cartão de hover junto, porque o cartão é
  // montado do mesmo grupo já filtrado. Oferecer no cartão o que a barra não
  // lista seria dar caminho para tela que a guarda vai recusar.
  const { tem } = useRecursosDaEmpresa()
  const grupos = gruposVisiveis(tem)

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        {/* MARCA — o selo do sistema, e o único ornamento da sidebar que não
            fala nem de módulo nem de empresa. Fica no topo porque é o nó mais
            alto da hierarquia: acima de qualquer módulo está o produto.

            O par topo/rodapé é o que mantém o teto de densidade. A EMPRESA
            ATIVA morava aqui e desceu para o rodapé: as duas no mesmo cabeçalho
            seriam dois ornamentos na mesma região visível, o que a regra
            proíbe, e empilhariam as duas perguntas de identidade — "que sistema
            é este" e "de que empresa é este dado" — no mesmo canto do olho. */}
        <div className="flex items-center gap-2 px-2 py-1">
          <Ornamento shape="emblema" tom="marca" tamanho={28} />
          {/* Some no modo colapsado, junto com todo rótulo: sobra a coluna de
              ícone, e o selo sozinho continua identificando o produto. */}
          <span className="truncate font-display font-bold text-lg tracking-[-0.012em] group-data-[collapsible=icon]:hidden">
            Cabinet
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Boletim é a entrada, não um módulo: fica solto acima dos grupos.
            Casamento exato — `/` é prefixo de tudo, `startsWith` acenderia sempre. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Boletim">
                <Link to="/">
                  <LayoutDashboard />
                  <span>Boletim</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {grupos.map((group) => (
          <SidebarGroup key={group.title}>
            {/* O rótulo do grupo é o gatilho do cartão: pousar em CADASTROS
                abre as telas de cadastro. Grupo de uma tela só não tem o que
                abrir — ali o cartão repetiria o próprio rótulo.

                Só existe na sidebar expandida. Colapsada, o rótulo some
                (`collapsible=icon` zera a opacidade dele) e o atalho some
                junto; o que volta ali é a dica de cada ícone, que é justamente
                o que falta no estado de ícone. */}
            {group.items.length > 1 ? (
              <HoverCard>
                <HoverCardTrigger>
                  <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                </HoverCardTrigger>
                <HoverCardContent placement="right top">
                  <TelasDoGrupo grupo={group} atual={pathname} />
                </HoverCardContent>
              </HoverCard>
            ) : (
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(`${item.url}/`)
                // Cada item carrega a cor do SEU módulo, não a da tela no ar:
                // é o que faz a fileira inteira ficar legível como um mapa de
                // cores, e não só o item aceso (memória §@ornamentos).
                const moduloDoItem = moduloDaRota(item.url)
                return (
                  <SidebarMenuItem
                    key={item.url}
                    {...(moduloDoItem && { 'data-modulo': moduloDoItem })}
                  >
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        {/* O shape do módulo no lugar do ícone genérico: é ele
                            que o operador aprende como marca do módulo, e o
                            mesmo desenho reaparece na banda e no estado vazio.

                            O par entra INVERTIDO em relação ao fundo: item
                            inativo é liso, então o ornamento vai de cheia /01 e
                            a fileira inteira vira um mapa de cores; item ativo
                            já tem fundo /01 pelo §3b, e ali a cheia sobre cheia
                            sumiria — nele o ornamento vai de pastel /02. As
                            duas regras (memória §@ornamentos e §3b) só coexistem
                            assim, e a família da cor é a mesma nos dois casos. */}
                        {moduloDoItem ? (
                          <Ornamento
                            shape={moduloDoItem}
                            tom={active ? 'modulo-suave' : 'modulo'}
                            tamanho={18}
                          />
                        ) : (
                          <item.icon />
                        )}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {/* EMPRESA ATIVA no rodapé (memória §@ornamentos). Não é só arrumação: a
          empresa ativa é o escopo de TUDO que a sidebar lista acima, e escopo
          se lê depois do que ele governa, não antes. No topo ela competia com a
          marca pela mesma leitura; aqui ela fecha a coluna, que é onde o
          operador já procura "quem sou / onde estou". */}
      <SidebarFooter>
        <CompanySwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
    </SidebarProvider>
  )
}
