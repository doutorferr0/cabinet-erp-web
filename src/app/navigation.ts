import type { Modulo } from '@/app/modulo'
import type { ShapeDeLugar } from '@/components/cabinet/ornamento'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import {
  ArrowLeftRight,
  BookUser,
  Boxes,
  CircleDollarSign,
  Filter,
  GanttChart,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  SquareKanban,
  Store,
  Table2,
  Users,
} from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /**
   * Uma linha dizendo O QUE A TELA FAZ — não o que ela contém. É o conteúdo do
   * cartão de hover do grupo, e a razão de ele existir: sem isto o cartão só
   * repetia a lista que já está na barra logo abaixo.
   *
   * **Obrigatório de propósito.** Tela nova sem descrição não compila, senão o
   * cartão volta a ser uma lista de nomes com buracos no meio.
   *
   * REDAÇÃO PROVISÓRIA (2026-08-07): escrita pelo agente a pedido do user, NÃO
   * extraída de `topicos/transcricaosoftlux.md`. A transcrição do legado
   * descreve campos e barra de ações, não propósito. Rever com quem opera —
   * `Ordem de Compra` vs `Pedido de Compra` e `Planner` são as mais expostas a
   * erro de leitura minha.
   */
  descricao: string
  /**
   * Recurso que a EMPRESA ATIVA precisa ter para este item existir. Item sem
   * `recurso` está em toda empresa — é o padrão, e continua sendo o caso da
   * maioria. Ver `src/data/recursos-da-empresa.ts`: é capacidade da empresa,
   * não permissão da pessoa.
   */
  recurso?: RecursoDaEmpresa
  /**
   * Caminho que abre um registro EM BRANCO nesta tela — o `Incluir` da barra de
   * ações (§9, padrão 4), publicado para quem está fora da tela.
   *
   * Existe para a paleta de comandos poder oferecer "Novo cliente" sem que ela
   * precise de uma tabela paralela de rotas. **Ausente = a tela não inclui**, e
   * isso é informação: `Movimentação`, `Motivos de Perda` e as telas de visão
   * (Dashboard, Tarefas, Planner) não criam registro por aqui. Inventar o
   * caminho na paleta daria um comando que leva a 404.
   *
   * Fica ao lado de `recurso` e `descricao` porque é da mesma natureza: o que
   * ESTA tela oferece, dito uma vez só.
   */
  incluir?: string

  /**
   * A `url` NÃO é rota do roteador: é endereço que sai da SPA.
   *
   * Existe por causa do `Mapeamento de Tabelas`, que é
   * `public/mapeamento-tabelas.html` — um arquivo estático servido ao lado da
   * aplicação, não uma tela dela. Sem esta marca, os dois consumidores da
   * navegação levariam o operador a um 404: o shell monta `<Link to={item.url}>`
   * e a paleta chama `navigate({ to: comando.url })`, e as duas coisas são
   * navegação client-side para uma rota que o roteador não conhece — com o
   * arquivo ali do lado, servido pelo mesmo domínio.
   *
   * Marcado, o item vira `<a href>` na barra e `window.open` na paleta, e abre
   * em ABA NOVA: é ferramenta de referência que se consulta ao lado do
   * trabalho, e trocar a aplicação inteira por ela custaria uma recarga fria da
   * SPA na volta.
   */
  externo?: true

  /**
   * Cor e desenho de uma tela que NÃO tem módulo próprio.
   *
   * O normal é a sidebar tirar os dois de `moduloDaRota(item.url)`. Três telas
   * ficam de fora da tabela travada pelo user — Dashboard, Planner e
   * Colaboradores — e apareciam com ícone lucide cinza no meio de uma fileira
   * colorida. `mockup-dashboard-cores.html` resolveu sem inventar a nona cor:
   * elas EMPRESTAM o par de um vizinho e se distinguem pelo desenho.
   *
   * Fica na entrada do menu, e não em `moduloDaRota`, de propósito: aquela
   * função responde "de que módulo é a TELA no ar" e o shell a usa para pintar
   * a folha inteira. Dizer ali que `/dashboard` é Boletim tingiria a página de
   * coral e faria a banda de identidade anunciar o módulo errado. O empréstimo
   * é do ITEM DE MENU, e o alcance dele para no item.
   */
  aparencia?: { modulo: Modulo; shape: ShapeDeLugar }

  /**
   * Tela que AINDA NÃO EXISTE — aparece na barra, apagada, com selo, e não
   * navega.
   *
   * Decisão do desenho v7 (catálogo §5): *"telas futuras aparecem apagadas com
   * selo — o operador vê pra onde cresce"*. Esconder até existir faria o menu
   * mudar de forma a cada entrega, e quem aprendeu onde ficava Contas a Pagar
   * teria de reaprender o mapa.
   *
   * **Some da paleta e do `itemDaRota`.** Item futuro na paleta seria um
   * comando que leva a 404; item futuro casando rota faria a guarda de recurso
   * responder por uma tela que não está lá. Ele existe só como DESENHO da
   * barra — ver `gruposVisiveis`.
   *
   * Apagado no FUNDO, nunca na tinta (regra Visual-1): texto claro sobre folha
   * clara reprova contraste, e o item continua legível.
   */
  futuro?: true

  /**
   * Sub-telas que este item abre por colapso (chevron), no formato da
   * referência aprovada.
   *
   * O pai NÃO é tela: `Compras` agrupa Ordem e Pedido de Compra e não tem rota
   * própria. É por isso que ele não vira comando na paleta — quem navega são as
   * filhas, e um comando "ir para Compras" abriria o quê?
   */
  filhas?: NavItem[]
}

export interface NavGroup {
  title: string
  url: string
  icon: LucideIcon
  /**
   * Módulo DONO do grupo — pinta o quadradinho ao lado do rótulo.
   *
   * É do grupo e não do item porque o rótulo é que se lê correndo o olho: numa
   * sidebar de seis grupos, a cor no rótulo diz de quem é o bloco antes de o
   * operador ler qualquer nome. Ausente = grupo sem módulo (Financeiro,
   * Sistema), e aí o quadradinho sai no par neutro do `:root` — nenhuma cor
   * nova é inventada aqui, paleta de módulo é decisão do user.
   */
  modulo?: Modulo
  items: NavItem[]
}

/**
 * SEÇÃO — o processo de negócio, e o que o ícone do topo representa.
 *
 * Seis, com teto (catálogo §5): *"nova seção só substituindo ou reagrupando"*.
 * A ordem é a frequência de uso, esquerda→direita — Início, Comercial, Estoque,
 * Financeiro — e vem de Dynamics/NetSuite, onde poucos itens no topo ordenados
 * por importância é o que faz a barra ser lida sem procurar.
 *
 * **Configurações é a sétima, OCULTA:** mora atrás da engrenagem, fora do
 * caminho de operação (Odoo CogMenu, HubSpot settings — catálogo §2.6). Ela não
 * conta para o teto porque não disputa espaço com as outras.
 */
export interface NavSecao {
  id: string
  rotulo: string
  icon: LucideIcon
  /** Cor da aba: o fio de 3px sob o ícone ativo e o fundo pastel do hover. */
  modulo?: Modulo
  /** Fora da fileira de ícones — alcançada pela engrenagem. */
  oculta?: true
  grupos: NavGroup[]
}

/**
 * A TAXONOMIA — seis seções por processo, mais Configurações atrás da
 * engrenagem. Desenho FECHADO pelo user em 2026-08-14 (mockup v7 +
 * `catalogo-navegacao.md`).
 *
 * Três princípios da pesquisa mandam aqui, e explicam escolhas que de fora
 * parecem arbitrárias:
 *
 * 1. **Seção é processo, não tipo de objeto** (Odoo, ERPNext, HubSpot,
 *    NetSuite). Por isso não há "Cadastros": o cadastro mora onde é usado.
 * 2. **Configuração sai do caminho de operação.** Funis, Motivos de Perda e
 *    Mapeamento não são o que se faz no dia — são como o sistema é montado.
 * 3. **Esqueleto repetido:** Documentos → Cadastros → Relatórios, na mesma
 *    ordem em toda seção. Aprendeu uma, aprendeu todas.
 *
 * O user preferiu **Pessoas e Catálogo como seções próprias**, supersedindo o
 * princípio "cadastro dentro do processo dono" da v5. Fica registrado porque a
 * decisão pode ser revisitada — e o mitigador continua sendo o combo `+...` e
 * a paleta, que são o caminho principal de cadastro rápido.
 */
export const navSecoes: NavSecao[] = [
  {
    id: 'inicio',
    rotulo: 'Início',
    icon: Home,
    modulo: 'boletim',
    grupos: [
      {
        /**
         * HOJE × ADIANTE, e não uma lista só: Boletim é o fechamento do
         * movimento do dia, Planner é o que ainda vai acontecer. Empilhá-los
         * no mesmo grupo diria que respondem a mesma pergunta.
         */
        title: 'Hoje',
        url: '/dashboard',
        icon: LayoutDashboard,
        modulo: 'boletim',
        items: [
          {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutDashboard,
            descricao: 'O que está em curso agora: números do dia e o que pede atenção.',
            // Coral do Boletim nas três: a seção da VISÃO fala do mesmo assunto
            // que ele — o dia. Desenhos distintos é o que as separa.
            aparencia: { modulo: 'boletim', shape: 'dashboard' },
          },
          {
            title: 'Tarefas',
            url: '/tarefas',
            icon: SquareKanban,
            descricao: 'O quadro do que precisa ser feito, em colunas por andamento.',
            aparencia: { modulo: 'boletim', shape: 'tarefas' },
          },
          {
            /**
             * Boletim ENTROU no menu. Ele era um item solto acima dos grupos,
             * herança do shell antigo; com seção de Início ele tem lugar, e um
             * item fora de grupo seria a única exceção do desenho novo.
             *
             * A rota é `/` — casamento EXATO no `itemDaRota`, senão o prefixo
             * acenderia em toda tela do sistema.
             */
            title: 'Boletim',
            url: '/',
            icon: LayoutDashboard,
            descricao: 'O fechamento do movimento do dia.',
            // SEM `aparencia`: `moduloDaRota('/')` já responde `boletim`, por
            // casamento exato. Ele não é tela sem módulo — é a única com módulo
            // e sem prefixo, e o empréstimo não tem o que fazer aqui.
          },
        ],
      },
      {
        title: 'Adiante',
        url: '/planner',
        icon: GanttChart,
        modulo: 'boletim',
        items: [
          {
            title: 'Planner',
            url: '/planner',
            icon: GanttChart,
            descricao:
              'O que ainda vai acontecer, na linha do tempo: prazos, entregas e reagendamentos.',
            aparencia: { modulo: 'boletim', shape: 'planner' },
          },
          {
            title: 'Relatórios',
            url: '/relatorios',
            icon: GanttChart,
            descricao: 'Ainda não existe. Entra quando houver o que consolidar.',
            futuro: true,
          },
        ],
      },
    ],
  },
  {
    id: 'comercial',
    rotulo: 'Comercial',
    icon: Store,
    modulo: 'vendas',
    grupos: [
      {
        title: 'Documentos',
        url: '/vendas/orcamentos',
        icon: Store,
        modulo: 'vendas',
        items: [
          {
            title: 'Orçamentos',
            url: '/vendas/orcamentos',
            incluir: '/vendas/orcamentos/novo',
            icon: Store,
            descricao: 'A proposta ao cliente. Se cancela, nunca se apaga.',
          },
          {
            title: 'Pedidos de Venda',
            url: '/vendas/pedidos',
            icon: Store,
            descricao: 'Ainda não existe. O orçamento fechado vira pedido aqui.',
            futuro: true,
          },
        ],
      },
      {
        /**
         * CRM em grupo próprio dentro de Comercial: o orçamento é DOCUMENTO
         * (existe ou não existe) e a oportunidade é ANDAMENTO — vive mudando
         * de coluna até virar documento ou morrer com motivo.
         */
        title: 'CRM',
        url: '/crm/funil',
        icon: SquareKanban,
        modulo: 'crm',
        items: [
          {
            title: 'Oportunidades',
            url: '/crm/funil',
            icon: SquareKanban,
            descricao: 'O quadro do funil: cada negócio em aberto, na etapa em que está.',
          },
        ],
      },
    ],
  },
  {
    id: 'estoque',
    rotulo: 'Estoque',
    icon: Package,
    modulo: 'estoque',
    grupos: [
      {
        title: 'Estoque',
        url: '/estoque/movimentacao',
        icon: ArrowLeftRight,
        modulo: 'estoque',
        items: [
          {
            title: 'Movimentação',
            url: '/estoque/movimentacao',
            icon: ArrowLeftRight,
            descricao: 'Entrada, saída e transferência do estoque.',
          },
          {
            title: 'Reserva Técnica',
            url: '/estoque/reserva',
            icon: ArrowLeftRight,
            descricao: 'Ainda não existe. A peça separada para um projeto, antes de sair.',
            futuro: true,
          },
        ],
      },
      {
        title: 'Compras',
        url: '/compras',
        icon: ShoppingCart,
        modulo: 'compras',
        items: [
          {
            /**
             * COLAPSÁVEL, e é o único: as duas telas de compra são o mesmo
             * assunto visto de dois lados, e ocupavam um grupo inteiro para
             * duas linhas. O pai não é tela — não tem rota nem entra na paleta.
             */
            title: 'Compras',
            url: '/compras',
            icon: ShoppingCart,
            descricao: 'O que se compra do fornecedor: a ordem combinada e o pedido efetivado.',
            filhas: [
              {
                title: 'Ordem de Compra',
                url: '/compras/ordens',
                incluir: '/compras/ordens/novo',
                icon: ShoppingCart,
                descricao: 'O combinado com o fornecedor: itens, prazo previsto e reagendamento.',
              },
              {
                title: 'Pedido de Compra',
                url: '/compras/pedidos',
                incluir: '/compras/pedidos/novo',
                icon: ShoppingCart,
                descricao: 'A compra efetivada, amarrada ao pedido de venda que a originou.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    /**
     * Financeiro entra INTEIRO como futuro, e de propósito: o user decidiu que
     * Contas a Pagar e a Receber moram juntas, e a seção existir vazia é o que
     * mostra onde elas vão cair. Sem módulo — não há cor de financeiro na
     * paleta travada, e inventar uma seria decisão dele, não minha.
     */
    id: 'financeiro',
    rotulo: 'Financeiro',
    icon: CircleDollarSign,
    grupos: [
      {
        title: 'Documentos',
        url: '/financeiro',
        icon: CircleDollarSign,
        items: [
          {
            title: 'Contas a Receber',
            url: '/financeiro/receber',
            icon: CircleDollarSign,
            descricao: 'Ainda não existe. O que o cliente deve, por vencimento.',
            futuro: true,
          },
          {
            title: 'Contas a Pagar',
            url: '/financeiro/pagar',
            icon: CircleDollarSign,
            descricao: 'Ainda não existe. O que se deve ao fornecedor, por vencimento.',
            futuro: true,
          },
          {
            title: 'Comissões',
            url: '/financeiro/comissoes',
            icon: CircleDollarSign,
            descricao: 'Ainda não existe. Quanto cada consultor tem a receber pelo que vendeu.',
            futuro: true,
          },
        ],
      },
    ],
  },
  {
    id: 'pessoas',
    rotulo: 'Pessoas',
    icon: Users,
    modulo: 'clientes',
    grupos: [
      {
        title: 'Clientes',
        url: '/cadastros/clientes',
        icon: BookUser,
        modulo: 'clientes',
        items: [
          {
            title: 'Clientes',
            url: '/cadastros/clientes',
            incluir: '/cadastros/clientes/novo',
            icon: BookUser,
            descricao: 'Quem compra. Obra, cobrança, contato e situação financeira.',
          },
          {
            title: 'Profissional Externo',
            url: '/cadastros/profissionais',
            incluir: '/cadastros/profissionais/novo',
            icon: BookUser,
            descricao: 'Arquiteto ou lighting designer que especifica o projeto.',
            recurso: RECURSOS.professionals,
          },
        ],
      },
      {
        title: 'Equipe',
        url: '/cadastros/colaboradores',
        icon: BookUser,
        modulo: 'clientes',
        items: [
          {
            title: 'Colaboradores',
            url: '/cadastros/colaboradores',
            incluir: '/cadastros/colaboradores/novo',
            icon: BookUser,
            descricao: 'O quadro interno. Setor, cargo, vínculo e admissão.',
            recurso: RECURSOS.employees,
            // Par de Clientes: é o cadastro de PESSOA vizinho. O desenho é que
            // separa — corpo dentro de moldura, a pessoa de dentro.
            aparencia: { modulo: 'clientes', shape: 'colaboradores' },
          },
        ],
      },
    ],
  },
  {
    id: 'catalogo',
    rotulo: 'Catálogo',
    icon: Boxes,
    modulo: 'produtos',
    grupos: [
      {
        title: 'Produtos',
        url: '/cadastros/produtos',
        icon: Package,
        modulo: 'produtos',
        items: [
          {
            title: 'Produtos',
            url: '/cadastros/produtos',
            incluir: '/cadastros/produtos/novo',
            icon: Package,
            descricao: 'O catálogo. Variantes, valores, localização de estoque e tributação.',
          },
        ],
      },
      {
        title: 'Origem',
        url: '/cadastros/fornecedores',
        icon: BookUser,
        modulo: 'fornecedores',
        items: [
          {
            title: 'Fornecedores',
            url: '/cadastros/fornecedores',
            incluir: '/cadastros/fornecedores/novo',
            icon: BookUser,
            descricao: 'Quem fornece. Razão social, prazo de entrega e contatos.',
            recurso: RECURSOS.suppliers,
          },
          {
            title: 'Transportadoras',
            url: '/cadastros/transportadoras',
            icon: BookUser,
            descricao: 'Ainda não existe. Quem entrega, e em quanto tempo.',
            futuro: true,
          },
        ],
      },
      {
        title: 'Projetos',
        url: '/obras',
        icon: Package,
        modulo: 'vendas',
        items: [
          {
            title: 'Obras',
            url: '/obras',
            icon: Package,
            descricao: 'Ainda não existe. A obra que amarra orçamento, entrega e profissional.',
            futuro: true,
          },
        ],
      },
    ],
  },
  {
    /**
     * A SÉTIMA seção, oculta atrás da engrenagem. Funis e Motivos de Perda
     * saíram do menu do CRM: são como o funil é MONTADO, não o que se faz nele.
     * Mapeamento de Tabelas saiu da barra (#119) pelo mesmo motivo.
     */
    id: 'config',
    rotulo: 'Configurações',
    icon: Settings,
    oculta: true,
    grupos: [
      {
        title: 'CRM',
        url: '/crm/funis',
        icon: Filter,
        modulo: 'crm',
        items: [
          {
            title: 'Funis',
            url: '/crm/funis',
            incluir: '/crm/funis/novo',
            icon: Filter,
            descricao: 'Os modelos de venda: as colunas por onde a oportunidade passa até fechar.',
          },
          {
            title: 'Motivos de Perda',
            url: '/crm/motivos',
            icon: Filter,
            descricao:
              'Por que os negócios se perdem — catalogado, para virar análise no fim do ano.',
          },
        ],
      },
      {
        title: 'Sistema',
        url: '/mapeamento-tabelas.html',
        icon: Table2,
        items: [
          {
            title: 'Mapeamento de Tabelas',
            /**
             * `.html` explícito, e não `/mapeamento-tabelas`, porque a URL limpa
             * só existe em produção: o Cloudflare Pages serve o arquivo e
             * redireciona. Em `pnpm dev` não há esse passo — o Vite manda todo
             * caminho desconhecido para o `index.html` da SPA, e o roteador
             * responderia 404. O `.html` funciona nos dois.
             */
            url: '/mapeamento-tabelas.html',
            externo: true,
            icon: Table2,
            descricao:
              'O mapa das tabelas do Cabinet: módulos, chaves e ligações. Abre em nova aba.',
          },
          {
            title: 'Usuários e Empresas',
            url: '/config/usuarios',
            icon: Settings,
            descricao: 'Ainda não existe. Quem entra, em qual empresa, com qual acesso.',
            futuro: true,
          },
        ],
      },
    ],
  },
]

/**
 * Os grupos, sem a camada de seção.
 *
 * Existe porque a paleta de comandos e a guarda de rota leem GRUPOS, não
 * seções: para elas, "de que seção veio" não muda nada — o que importa é o
 * item e o rótulo do grupo. Derivar em vez de manter duas listas é o que
 * impede a divergência muda entre o que a barra mostra e o que a paleta acha.
 */
export const navGroups: NavGroup[] = navSecoes.flatMap((secao) => secao.grupos)

/** Todo item navegável de um grupo — as filhas contam, o pai colapsável não. */
function itensNavegaveis(grupo: NavGroup): NavItem[] {
  return grupo.items.flatMap((item) => item.filhas ?? [item]).filter((item) => !item.futuro)
}

/**
 * Item cuja tela responde por este caminho (o próprio ou um detalhe dele).
 *
 * Item FUTURO não casa: a tela não está lá, e deixá-lo casar faria a guarda de
 * recurso responder por uma rota que o roteador vai recusar de qualquer jeito.
 * O pai colapsável também não — ele não tem tela, só filhas.
 */
export function itemDaRota(pathname: string): NavItem | undefined {
  return navGroups
    .flatMap(itensNavegaveis)
    .find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))
}

/**
 * Se a empresa ativa alcança este caminho. Caminho fora do menu é liberado —
 * quem decide sobre ele é o roteador (404), não o recurso.
 */
export function rotaLiberada(pathname: string, tem: (recurso: RecursoDaEmpresa) => boolean) {
  const item = itemDaRota(pathname)
  return !item?.recurso || tem(item.recurso)
}

/** O item (e as filhas dele) sobrevive ao recurso da empresa ativa? */
function comRecurso(item: NavItem, tem: (recurso: RecursoDaEmpresa) => boolean): NavItem | null {
  if (item.recurso && !tem(item.recurso)) return null
  if (!item.filhas) return item
  const filhas = item.filhas.filter((filha) => !filha.recurso || tem(filha.recurso))
  // Pai que perdeu todas as filhas some junto: ele não é tela, e um chevron que
  // não abre nada é um item morto no meio da barra.
  return filhas.length > 0 ? { ...item, filhas } : null
}

/**
 * As SEÇÕES da empresa ativa — é o que desenha a barra.
 *
 * Mantém os itens FUTUROS: eles são o desenho, e sumir com eles tiraria da tela
 * justamente o que o user pediu que aparecesse. Quem os esconde é
 * `gruposVisiveis`, que serve a paleta.
 *
 * Grupo que fica vazio some; seção que fica vazia some. Uma seção inteira pode
 * sumir de uma empresa — e é correto: se ela não opera nada ali, a aba levaria
 * a um painel em branco.
 */
export function secoesVisiveis(tem: (recurso: RecursoDaEmpresa) => boolean): NavSecao[] {
  return navSecoes
    .map((secao) => ({
      ...secao,
      grupos: secao.grupos
        .map((grupo) => ({
          ...grupo,
          items: grupo.items
            .map((item) => comRecurso(item, tem))
            .filter((item): item is NavItem => item !== null),
        }))
        .filter((grupo) => grupo.items.length > 0),
    }))
    .filter((secao) => secao.grupos.length > 0)
}

/**
 * O menu da empresa ativa em GRUPOS, sem seção e sem tela futura.
 *
 * É o que a paleta de comandos lê. Duas diferenças em relação a
 * `secoesVisiveis`, e as duas são sobre o que a paleta pode PROMETER:
 *
 * - **tela futura sai** — comando que leva a 404 é pior que comando ausente;
 * - **filha sobe** — quem navega é a filha, e um comando "ir para Compras"
 *   abriria o quê?
 *
 * Ler daqui, e não de uma lista própria, é o que impede o defeito que a paleta
 * já teve: comando levando a tela que a guarda de recurso recusa.
 */
export function gruposVisiveis(tem: (recurso: RecursoDaEmpresa) => boolean): NavGroup[] {
  return secoesVisiveis(tem)
    .flatMap((secao) => secao.grupos)
    .map((grupo) => ({ ...grupo, items: itensNavegaveis(grupo) }))
    .filter((grupo) => grupo.items.length > 0)
}
