import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import {
  ArrowLeftRight,
  BookUser,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Filter,
  GanttChart,
  HandCoins,
  Home,
  Inbox,
  Keyboard,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  SquareKanban,
  Store,
  Table2,
  Truck,
  Users,
} from 'lucide-react'

/**
 * A NAVEGAÇÃO — uma lista só, em grupos de ORDEM FIXA por módulo.
 *
 * ## O que morreu aqui, e por quê
 *
 * O modelo 1.x tinha DOIS níveis acima do item: uma fileira de sete ícones na
 * appbar escolhia a SEÇÃO, e a barra lateral desenhava só a seção escolhida.
 * O operador precisava saber em que seção uma tela morava antes de poder
 * procurá-la, e a barra mudava de conteúdo debaixo dele — dois estados
 * (`espiada` e `secaoDaRota`) disputando qual seção estava no ar, com uma regra
 * de expiração por caminho para desempatar.
 *
 * A 2.0 troca isso por UMA lista com tudo dentro (modelo A da auditoria §6 —
 * Shopify, Stripe, Ramp, Linear): o mapa inteiro está sempre presente, o grupo
 * da rota vem aberto e os outros ficam fechados. Achar uma tela deixa de exigir
 * saber onde ela mora.
 *
 * ## A ordem é FIXA e não se deriva de nada
 *
 * HOJE · FAVORITOS · COMPRAS · ESTOQUE · VENDAS · CRM · PESSOAS · RECENTES, e
 * Configurações no rodapé. Ela é do fluxo — o que se compra vira estoque, o que
 * está em estoque se vende, o que se vende nasce no CRM — e não da frequência
 * de uso nem da ordem alfabética: menu que se reordena sozinho obriga a reler o
 * mapa a cada visita.
 *
 * FAVORITOS e RECENTES são os dois grupos que esta lista NÃO declara: um vem do
 * que o operador marcou (`★`), o outro do que ele abriu — os dois moram em
 * `src/app/nav/estado.ts`. Ambos somem quando estão vazios: rótulo sem conteúdo
 * é ruído.
 */
export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /**
   * Uma linha dizendo O QUE A TELA FAZ — não o que ela contém. Alimenta a
   * página de Configurações e a dica do item com a barra colapsada.
   *
   * REDAÇÃO PROVISÓRIA (2026-08-07): escrita pelo agente a pedido do user, NÃO
   * extraída de `topicos/transcricaosoftlux.md`.
   */
  descricao: string
  /**
   * Recurso que a EMPRESA ATIVA precisa ter para este item existir. Item sem
   * `recurso` está em toda empresa. Ver `src/data/recursos-da-empresa.ts`: é
   * capacidade da empresa, não permissão da pessoa.
   */
  recurso?: RecursoDaEmpresa
  /**
   * Caminho que abre um registro EM BRANCO nesta tela — o `Incluir` publicado
   * para quem está fora dela. Ausente = a tela não inclui, e isso é informação:
   * inventar o caminho na paleta daria um comando que leva a 404.
   */
  incluir?: string
  /**
   * A `url` NÃO é rota do roteador: é endereço que sai da SPA (hoje, o
   * `public/mapeamento-tabelas.html`). Marcado, o item vira `<a href>` na barra
   * e `window.open` na paleta — `<Link to>` o mandaria ao roteador, que
   * responderia 404 com o arquivo ali do lado.
   */
  externo?: true
  /**
   * Tela que AINDA NÃO EXISTE — aparece na lista, apagada, com etiqueta, e não
   * navega. Some da paleta e do `itemDaRota`: comando que leva a 404 é pior que
   * comando ausente.
   */
  futuro?: true
  /**
   * A chave do contador que este item mostra à direita. Quem os produz é
   * `useContadoresNav()`; item sem chave não desenha número.
   */
  contador?: 'minhasTarefas' | 'caixaDeEntrada'
}

/**
 * O MATIZ DO GRUPO — o que pinta o quadradinho de 7px ao lado do rótulo.
 *
 * São os `--mod-*` de `src/styles/tokens-2.0.css`, e não os módulos de
 * `src/app/modulo.ts`: aquela lista é a de 2026-08 (nove módulos, um par de
 * cores cada) e não tem `pessoas`, que na 2.0 é grupo. Um nome por matiz
 * publicado, e nenhum a mais.
 *
 * **A cor do módulo NÃO marca o item ativo** (decisão do user, 2026-09-02): ela
 * fica no quadradinho e nos KPIs, e "onde eu estou" é sempre chartreuse. Uma
 * marca de estado que muda de cor conforme o módulo obriga a aprender nove
 * marcas para ler uma informação.
 */
export type MatizDeModulo =
  | 'hoje'
  | 'compras'
  | 'estoque'
  | 'vendas'
  | 'crm'
  | 'pessoas'
  | 'relatorios'
  | 'produtos'

export interface NavGroup {
  /** Chave de persistência do colapso — nunca o rótulo, que é texto de tela. */
  id: string
  /** Em caixa alta na tela; guardado aqui como se lê, sem `uppercase` no dado. */
  title: string
  /** Dono do grupo: pinta o quadradinho de 7px. Grupo sem dono usa o neutro. */
  matiz?: MatizDeModulo
  /**
   * O PREFIXO do módulo — tudo que mora sob ele pertence a este grupo, tenha
   * item próprio ou não.
   *
   * Existe porque nem toda rota do módulo é publicada como item, e nem deveria
   * ser: `/compras` é o layout do módulo (a rota-índice que a auditoria §6
   * quer ver virar hub na D26) e `/crm/oportunidades/{id}` é a ficha de um
   * negócio, aberta a partir do quadro. Sem o prefixo, as duas ficariam órfãs
   * — e "órfã" aqui quer dizer que o operador entra nelas e a barra inteira
   * fecha, porque nenhum grupo se reconhece dono do lugar onde ele está.
   *
   * O item continua tendo precedência: o casamento mais ESPECÍFICO ganha, e
   * um prefixo de 8 caracteres nunca vence uma url de 22.
   */
  raiz?: string
  items: NavItem[]
}

/**
 * A ordem é a do fluxo, e cada grupo é um MÓDULO — não uma taxonomia de
 * "documentos / cadastros / relatórios" repetida sete vezes. O cadastro mora no
 * módulo que o consome: Fornecedores em COMPRAS (é de quem se compra), Clientes
 * em VENDAS (é para quem se vende), Produtos em ESTOQUE (é o que se guarda).
 *
 * O `/cadastros` como agrupador DEIXOU DE EXISTIR. As rotas continuam — são o
 * endereço dos registros — mas nenhum item da barra leva ao hub delas:
 * "cadastros" descreve a natureza do dado, não o trabalho de ninguém.
 *
 * Financeiro também deixou de ser bloco próprio. As três telas dele são todas
 * `futuro`, e uma seção inteira em cinza no meio da barra pesava mais do que
 * informava; cada uma foi para o módulo que a origina — o que se deve ao
 * fornecedor em COMPRAS, o que o cliente deve em VENDAS, a comissão de quem
 * vendeu em PESSOAS.
 */
export const GRUPOS_NAV: readonly NavGroup[] = [
  {
    id: 'hoje',
    title: 'Hoje',
    matiz: 'hoje',
    items: [
      {
        title: 'Início',
        url: '/',
        icon: Home,
        descricao: 'O fechamento do movimento do dia.',
      },
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        descricao: 'O que está em curso agora: números do dia e o que pede atenção.',
      },
      {
        title: 'Minhas tarefas',
        url: '/tarefas',
        icon: SquareKanban,
        descricao: 'O quadro do que precisa ser feito, em colunas por andamento.',
        contador: 'minhasTarefas',
      },
      {
        title: 'Caixa de entrada',
        url: '/inbox',
        icon: Inbox,
        descricao: 'Ainda não existe. O que chegou para você, numa lista só.',
        // A gaveta de notificações vira ROTA na D7. Até lá o item existe
        // apagado, dizendo para onde o sino vai — e o contador já é o mesmo
        // número que o sino mostra, para as duas metades nunca divergirem.
        futuro: true,
        contador: 'caixaDeEntrada',
      },
      {
        title: 'Agenda',
        url: '/agenda',
        icon: CalendarDays,
        descricao: 'Compromissos do mês e agenda do dia, num calendário só.',
      },
      {
        title: 'Planner',
        url: '/planner',
        icon: GanttChart,
        descricao:
          'O que ainda vai acontecer, na linha do tempo: prazos, entregas e reagendamentos.',
      },
    ],
  },
  {
    id: 'compras',
    title: 'Compras',
    matiz: 'compras',
    raiz: '/compras',
    items: [
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
      {
        title: 'Previsão de Chegada',
        url: '/compras/previsao',
        icon: CalendarClock,
        descricao: 'O que já foi enviado e ainda não chegou, com o atraso contra a promessa.',
      },
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
        icon: Truck,
        descricao: 'Ainda não existe. Quem entrega, e em quanto tempo.',
        futuro: true,
      },
      {
        title: 'Contas a Pagar',
        url: '/financeiro/pagar',
        icon: CircleDollarSign,
        descricao: 'Ainda não existe. O que se deve ao fornecedor, por vencimento.',
        futuro: true,
      },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    matiz: 'estoque',
    raiz: '/estoque',
    items: [
      {
        title: 'Movimentação',
        url: '/estoque/movimentacao',
        icon: ArrowLeftRight,
        descricao: 'Entrada, saída e transferência do estoque.',
      },
      {
        title: 'Produtos',
        url: '/cadastros/produtos',
        incluir: '/cadastros/produtos/novo',
        icon: Package,
        descricao: 'O catálogo. Variantes, valores, localização de estoque e tributação.',
      },
      {
        title: 'Estoque Valorizado',
        url: '/estoque/relatorios/valorizado',
        icon: Table2,
        descricao: 'Quanto vale o que está em casa, agora — por depósito ou na empresa.',
      },
      {
        title: 'Estoque Parado',
        url: '/estoque/relatorios/parado',
        icon: Table2,
        descricao: 'O dinheiro parado na prateleira: dias sem venda e última saída.',
      },
      {
        title: 'Orçado × Estoque',
        url: '/estoque/relatorios/orcado-x-estoque',
        icon: Table2,
        descricao: 'O que os orçamentos abertos prometem, contra o que existe em casa.',
      },
      {
        /**
         * A RESERVA DE PEÇA, homônima da Reserva Técnica do Profissional e
         * OUTRA coisa: aqui é a peça separada para um projeto, antes de sair;
         * lá é dinheiro que o profissional externo recebe pela indicação. O
         * nome de tela fica com o do legado até ela existir; a descrição
         * desempata, e quem chegar depois entra com nome próprio.
         */
        title: 'Reserva Técnica',
        url: '/estoque/reserva',
        icon: ArrowLeftRight,
        descricao: 'Ainda não existe. A peça separada para um projeto, antes de sair.',
        futuro: true,
      },
    ],
  },
  {
    id: 'vendas',
    title: 'Vendas',
    matiz: 'vendas',
    raiz: '/vendas',
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
        incluir: '/vendas/pedidos/novo',
        icon: Store,
        descricao: 'O orçamento fechado vira pedido aqui. Se cancela, nunca se apaga.',
      },
      {
        title: 'Quadro de Cargas',
        url: '/vendas/cargas',
        icon: Truck,
        descricao: 'O que está liberado e ainda não saiu do galpão, por pedido.',
      },
      {
        title: 'Reserva Técnica do Profissional',
        url: '/vendas/reservas-tecnicas',
        icon: HandCoins,
        descricao: 'O que o profissional externo recebe pela indicação. Cancela, não apaga.',
      },
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
      {
        title: 'Obras',
        url: '/obras',
        icon: Package,
        descricao: 'Ainda não existe. A obra que amarra orçamento, entrega e profissional.',
        futuro: true,
      },
      {
        title: 'Contas a Receber',
        url: '/financeiro/receber',
        icon: CircleDollarSign,
        descricao: 'Ainda não existe. O que o cliente deve, por vencimento.',
        futuro: true,
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    matiz: 'crm',
    raiz: '/crm',
    items: [
      {
        title: 'Oportunidades',
        url: '/crm/funil',
        icon: SquareKanban,
        descricao: 'O quadro do funil: cada negócio em aberto, na etapa em que está.',
      },
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
        descricao: 'Por que os negócios se perdem — catalogado, para virar análise no fim do ano.',
      },
    ],
  },
  {
    id: 'pessoas',
    title: 'Pessoas',
    matiz: 'pessoas',
    items: [
      {
        title: 'Colaboradores',
        url: '/cadastros/colaboradores',
        incluir: '/cadastros/colaboradores/novo',
        icon: Users,
        descricao: 'O quadro interno. Setor, cargo, vínculo e admissão.',
        recurso: RECURSOS.employees,
      },
      {
        title: 'Usuários e Empresas',
        url: '/config/usuarios',
        icon: Users,
        descricao:
          'Quem entra, com qual papel, em quais empresas do grupo — e o timbre do impresso.',
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
]

/**
 * O RODAPÉ — Configurações e o que mora atrás dela.
 *
 * Não é um nono grupo: fica colado no pé da barra, fora da rolagem da lista, e
 * não colapsa. O que se AJUSTA não disputa espaço com o que se OPERA, e é o
 * lugar onde o hábito manda procurar (Odoo CogMenu, HubSpot settings).
 *
 * `Mapeamento de Tabelas` e `Listas de apoio` não sobem para cá: elas moram
 * DENTRO de `/config`, que é a página que as lista. Repeti-las na barra seria a
 * mesma escolha oferecida em dois lugares.
 */
export const GRUPO_CONFIG: NavGroup = {
  id: 'config',
  title: 'Configurações',
  // Tudo sob `/config` é ajuste do sistema, inclusive as telas que só a PÁGINA
  // de Configurações publica (`/config/listas`). Elas não sobem para a barra —
  // seria a mesma escolha em dois lugares —, mas continuam pertencendo aqui:
  // quem está em `/config/listas` está em Configurações, e é isso que o rodapé
  // aceso precisa dizer.
  raiz: '/config',
  items: [
    {
      title: 'Configurações',
      url: '/config',
      icon: Settings,
      descricao: 'Como o sistema é montado: usuários, listas de apoio e o mapa das tabelas.',
    },
  ],
}

/**
 * O que o menu do AVATAR publica, no mesmo rodapé.
 *
 * `Atalhos do teclado` mora aqui e não na lista: é referência que se consulta
 * uma vez e não trabalho que se repete, e um item permanente na barra cobraria
 * espaço de operação por isso. Continua alcançável por clique — que é a regra
 * de atalhos deste repo: nenhum fluxo depende de tecla memorizada, nem o fluxo
 * de descobrir quais teclas existem.
 */
export const ITENS_DO_MENU_DO_OPERADOR: readonly NavItem[] = [
  {
    title: 'Atalhos do teclado',
    url: '/ajuda/atalhos',
    icon: Keyboard,
    descricao: 'A tecla de cada ação, e a que ela respondia no sistema antigo.',
  },
]

/**
 * As telas que a PÁGINA de Configurações publica — o que mora atrás de
 * `/config`, e que a barra deliberadamente não repete.
 */
export const GRUPO_DENTRO_DA_CONFIG: NavGroup = {
  id: 'config-sistema',
  title: 'Sistema',
  items: [
    {
      title: 'Usuários e Empresas',
      url: '/config/usuarios',
      icon: Users,
      descricao: 'Quem entra, com qual papel, em quais empresas do grupo — e o timbre do impresso.',
    },
    {
      title: 'Listas de apoio',
      url: '/config/listas',
      icon: Table2,
      descricao:
        'O que os combos oferecem: marca, setor, cargo, motivo. Renomear e aposentar item.',
    },
    {
      title: 'Mapeamento de Tabelas',
      /**
       * `.html` explícito, e não `/mapeamento-tabelas`, porque a URL limpa só
       * existe em produção: o Cloudflare Pages serve o arquivo e redireciona.
       * Em `pnpm dev` o Vite manda todo caminho desconhecido para o `index.html`
       * da SPA, e o roteador responderia 404. O `.html` funciona nos dois.
       */
      url: '/mapeamento-tabelas.html',
      externo: true,
      icon: Table2,
      descricao: 'O mapa das tabelas do Cabinet: módulos, chaves e ligações. Abre em nova aba.',
    },
    ...ITENS_DO_MENU_DO_OPERADOR,
  ],
}

/**
 * Todo grupo que publica tela, incluindo o rodapé e o que está atrás dele.
 *
 * É o que a paleta de comandos e as guardas leem: para elas "de que grupo veio"
 * muda o rótulo, não o alcance. Derivar em vez de manter duas listas é o que
 * impede a divergência muda entre o que a barra mostra e o que a paleta acha.
 *
 * **Deduplicado por `url`, e isso não é higiene: é o contrato da paleta.** Uma
 * tela pode aparecer em DOIS lugares de propósito — `Usuários e Empresas` está
 * em PESSOAS (é onde se administra gente) e dentro de `/config` (é onde se
 * ajusta o sistema), e `Atalhos do teclado` está no menu do operador e na
 * página de Configurações. Repetir na tela é escolha de desenho; repetir na
 * paleta seria o mesmo comando duas vezes na mesma lista.
 */
export const navGroups: readonly NavGroup[] = (() => {
  const vistas = new Set<string>()
  return [...GRUPOS_NAV, GRUPO_CONFIG, GRUPO_DENTRO_DA_CONFIG]
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => {
        if (vistas.has(item.url)) return false
        vistas.add(item.url)
        return true
      }),
    }))
    .filter((grupo) => grupo.items.length > 0)
})()

/**
 * O GRUPO que responde por este caminho — o único que abre por padrão.
 *
 * Função pura e exportada, e não um `find` dentro do componente, porque é a
 * regra que o DoD da issue cobra ("todas as rotas alcançáveis pela barra"): o
 * teste a chama com o caminho de cada rota do `routeTree` e exige resposta.
 * Dentro do render, ela só seria conferível montando o shell inteiro.
 *
 * O casamento é por PREFIXO com fronteira de segmento, então a ficha
 * (`/vendas/pedidos/9a1f`) e a inclusão (`/vendas/pedidos/novo`) caem no grupo
 * da listagem — é o mesmo trabalho, e fechar o grupo ao abrir um registro faria
 * o operador perder o mapa exatamente quando entra no detalhe.
 *
 * Ganha o item MAIS ESPECÍFICO: `/estoque/relatorios/parado` está em ESTOQUE
 * pelo item dele, não pelo primeiro item cujo prefixo case por acaso.
 */
function cobre(prefixo: string, pathname: string): boolean {
  // `/` é prefixo de tudo: casamento EXATO, nunca prefixo, senão o Início
  // responderia por toda tela do sistema.
  if (prefixo === '/') return pathname === '/'
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`)
}

export function grupoDaRota(
  pathname: string,
  grupos: readonly NavGroup[] = [...GRUPOS_NAV, GRUPO_CONFIG],
): string | undefined {
  let melhor: { id: string; tamanho: number } | undefined
  const considerar = (id: string, prefixo: string) => {
    if (!cobre(prefixo, pathname)) return
    if (!melhor || prefixo.length > melhor.tamanho) melhor = { id, tamanho: prefixo.length }
  }
  for (const grupo of grupos) {
    if (grupo.raiz) considerar(grupo.id, grupo.raiz)
    for (const item of grupo.items) considerar(grupo.id, item.url)
  }
  return melhor?.id
}
