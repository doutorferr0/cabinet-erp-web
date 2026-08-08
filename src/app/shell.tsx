import { Appbar } from '@/app/appbar'
import { GavetaDeNotificacoes } from '@/app/gaveta-notificacoes'
import { moduloDaRota } from '@/app/modulo'
import { type NavItem, gruposVisiveis } from '@/app/navigation'
import { PageFrame } from '@/app/page-frame'
import { RequireRecurso } from '@/app/require-recurso'
import { CompanySwitcher } from '@/components/cabinet/company-switcher'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { cn } from '@/lib/utils'
import { NOTIFICACOES_MOCK } from '@/mocks/notificacoes'
import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'

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

function AppSidebar() {
  const { location } = useRouterState()
  const pathname = location.pathname
  // O MENU É DA EMPRESA ATIVA, não do sistema: item cujo recurso a empresa não
  // tem some da barra — e some do cartão de hover junto, porque o cartão é
  // montado do mesmo grupo já filtrado. Oferecer no cartão o que a barra não
  // lista seria dar caminho para tela que a guarda vai recusar.
  const { tem } = useRecursosDaEmpresa()
  const grupos = gruposVisiveis(tem)
  // O ornamento cresce quando o rótulo some. No colapsado ele é a ÚNICA
  // coisa que identifica a tela, e 18px de shape numa coluna de 56px lia
  // como ícone de aviso, não como marca do módulo.
  const { state } = useSidebar()
  const colapsada = state === 'collapsed'

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        {/* MARCA — o selo do sistema, e o único ornamento da sidebar que não
            fala nem de módulo nem de empresa. Fica no topo porque é o nó mais
            alto da hierarquia: acima de qualquer módulo está o produto. */}
        {/* Colapsada, o `px-2` daqui somava com o `p-2` do grupo e jogava o
            emblema 8px à esquerda da fileira de ícones. Sem rótulo para
            equilibrar, a marca ficava visivelmente fora do eixo da coluna. */}
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <Ornamento shape="emblema" tom="marca" tamanho={28} />
          {/* Some no modo colapsado, junto com todo rótulo: sobra a coluna de
              ícone, e o selo sozinho continua identificando o produto. */}
          <span className="truncate font-display font-bold text-lg tracking-[-0.012em] group-data-[collapsible=icon]:hidden">
            Cabinet
          </span>
        </div>
        {/* EMPRESA ATIVA logo abaixo da marca (decisão do user, 2026-08-07).
            REVOGA o rodapé de §@ornamentos: o argumento de lá era que escopo
            se lê depois do que ele governa. Na prática o operador procura
            "de que empresa é isto" ANTES de ler a lista, não depois, e no
            rodapé a peça ficava fora do caminho do olho. As duas perguntas
            de identidade seguem separadas por serem duas linhas distintas —
            selo do produto em cima, escopo do dado embaixo. */}
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Boletim é a entrada, não um módulo: fica solto acima dos grupos.
            Casamento exato — `/` é prefixo de tudo, `startsWith` acenderia sempre. */}
        <SidebarGroup className="group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:border-rule-hair group-data-[collapsible=icon]:border-t-2 group-data-[collapsible=icon]:pt-2">
          <SidebarMenu>
            {/* Boletim É módulo na tabela de cor (coral), mas ficava de fora
                da fileira colorida por acidente de montagem: por morar neste
                grupo à parte, não passava pelo `moduloDaRota` do laço abaixo e
                caía num lucide cinza. Era o único item com shape atribuído que
                não o mostrava — e logo o primeiro da barra. */}
            <SidebarMenuItem data-modulo="boletim">
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Boletim">
                <Link to="/">
                  <Ornamento
                    shape="boletim"
                    tom={pathname === '/' ? 'modulo-suave' : 'modulo'}
                    tamanho={colapsada ? 22 : 18}
                  />
                  <span>Boletim</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {grupos.map((group) => (
          <SidebarGroup
            key={group.title}
            className={cn(
              // Colapsada, o rótulo é zerado (`-mt-8 opacity-0`) e os grupos
              // viram uma fileira contínua de ícones sem fronteira. A régua
              // ocupa o lugar que o nome do módulo deixou: separa sem nomear.
              'group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:border-rule-hair group-data-[collapsible=icon]:border-t-2 group-data-[collapsible=icon]:pt-2',
              // Grupo sem tela (Estoque, §10) não tem o que separar: expandido
              // o rótulo ainda declara que o módulo existe, colapsado sobraria
              // só uma régua solta sobre espaço vazio.
              group.items.length === 0 && 'group-data-[collapsible=icon]:hidden',
            )}
          >
            {/* O rótulo do grupo é o gatilho do cartão: pousar em CADASTROS
                abre as telas de cadastro. Grupo de uma tela só não tem o que
                abrir — ali o cartão repetiria o próprio rótulo.

                Só existe na sidebar expandida. Colapsada, o rótulo some
                (`collapsible=icon` zera a opacidade dele) e o atalho some
                junto; o que volta ali é a dica de cada ícone, que é justamente
                o que falta no estado de ícone. */}
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(`${item.url}/`)
                // Cada item carrega a cor do SEU módulo, não a da tela no ar:
                // é o que faz a fileira inteira ficar legível como um mapa de
                // cores, e não só o item aceso (memória §@ornamentos).
                //
                // Tela fora da tabela de cor (Dashboard, Planner,
                // Colaboradores) traz a atribuição na própria entrada do menu:
                // empresta o par de um vizinho e leva desenho próprio. Sem
                // isso, três itens saíam em lucide cinza no meio da fileira.
                const moduloDoItem = moduloDaRota(item.url) ?? item.aparencia?.modulo
                const shapeDoItem = moduloDaRota(item.url) ?? item.aparencia?.shape
                return (
                  <SidebarMenuItem
                    key={item.url}
                    {...(moduloDoItem && { 'data-modulo': moduloDoItem })}
                  >
                    {/* CARTÃO no expandido, DICA no colapsado — e a razão é o que
                        cada estado já mostra. Expandido: o nome está no item, a um
                        centímetro do ponteiro; repeti-lo no cartão seria a mesma
                        duplicata que tirou o cartão do rótulo do grupo. Colapsado: o
                        nome NÃO existe na tela, então ali a peça certa é a dica, que
                        é justamente o que ela sempre fez.

                        O cartão nunca convive com a dica: quando existe, vence. Por
                        isso ele não pode aparecer no colapsado sem o nome — seria
                        trocar a única identificação do ícone por uma frase solta. */}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      {...(colapsada
                        ? { tooltip: item.title }
                        : { hoverCard: <ExplicacaoDaTela tela={item} /> })}
                    >
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
                        {shapeDoItem ? (
                          <Ornamento
                            shape={shapeDoItem}
                            tom={active ? 'modulo-suave' : 'modulo'}
                            tamanho={colapsada ? 22 : 18}
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
      <SidebarRail />
    </Sidebar>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)

  // Notificação é CASCA nesta fatia — dado de mock local, sem `src/data/` por
  // trás (não há `/api/notifications` no contrato — §@casca-global). Estado
  // vive no shell porque é ele que também guarda se a gaveta está aberta; as
  // duas coisas nascem e morrem juntas com a navegação da sessão.
  const [notificacoes, setNotificacoes] = useState(NOTIFICACOES_MOCK)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* APPBAR GLOBAL — acima do cabeçalho de página, em TODA rota
            (§@casca-global). Vive no shell: página nenhuma monta a própria. */}
        <Appbar naoLidas={naoLidas} aoAbrirGaveta={() => setGavetaAberta(true)} />

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
