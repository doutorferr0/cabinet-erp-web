import type { Modulo } from '@/app/modulo'
import {
  type NavGroup,
  type NavItem,
  type NavSecao,
  itemDaRota,
  secoesVisiveis,
} from '@/app/navigation'
import type { RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import { SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { Keyboard, type LucideIcon } from 'lucide-react'

/**
 * COMANDOS DA PALETA — montados da navegação, não de uma tabela paralela.
 *
 * A paleta oferece exatamente o que a empresa ativa alcança, porque lê os mesmos
 * `gruposVisiveis` que desenham a barra lateral. Uma lista própria de rotas
 * divergiria no primeiro cadastro novo, e o sintoma seria um comando levando a
 * uma tela que a guarda de recurso recusa — o defeito que `gruposVisiveis` foi
 * escrito para evitar.
 *
 * ## O que a paleta NÃO faz, e por quê
 *
 * **Não oferece `Alterar`, `Consultar` nem `Excluir`.** As três agem sobre a
 * LINHA SELECIONADA, que é estado de dentro da listagem. De uma paleta global
 * elas teriam de perguntar "qual registro?" — e a tela que responde essa
 * pergunta é a própria listagem. Um comando que abre outra tela para escolher o
 * alvo é a listagem com passos a mais.
 *
 * **Não monta a busca de REGISTRO — ela existe, e vem de outro lugar.** "Ir para
 * o cliente ANDRÉ BATALHA" é `useBuscaDeRegistro` (`src/data/busca-de-registro.ts`),
 * que pergunta o `q` das quatro listagens ao servidor. Este arquivo continua
 * sendo só o que se monta SEM rede, e a divisão é o que deixa a paleta abrir
 * cheia antes de qualquer resposta chegar.
 *
 * O motivo que ficou escrito aqui até a #362 — "o contrato não tem busca
 * global" — estava vencido: rota única de fato não há, mas o `q` de cada
 * listagem já casa nome, código, documento e número, e nenhuma delas precisou
 * de caminho novo no contrato.
 */
export type TipoDeComando = 'navegar' | 'incluir'

export interface Comando {
  id: string
  titulo: string
  /** Uma linha sob o título — a mesma `descricao` que o cartão da barra usa. */
  descricao?: string
  /** Cabeçalho sob o qual o comando aparece. */
  grupo: string
  url: string
  icon: LucideIcon
  tipo: TipoDeComando
  /**
   * Módulo do GRUPO — pinta o quadradinho de cor ao lado do cabeçalho.
   *
   * Viaja no comando e não numa tabela de grupos porque o grupo da paleta É a
   * seção da barra lateral: manter os dois em listas separadas faria a cor
   * divergir do menu na primeira seção nova. Ausente nos grupos que não são
   * módulo (Recentes, Ações, Ajuda), e a ausência é desenho — quadrado neutro
   * ali diria "módulo cinza".
   */
  modulo?: Modulo
  /**
   * Onde a tela mora, para o operador distinguir homônimos.
   *
   * `Pedidos` existe em Compras e em Vendas; sem o caminho a paleta oferece
   * duas linhas iguais e a escolha vira sorteio.
   */
  caminho?: string
  /**
   * A tecla que chega ao mesmo lugar, já com rótulo (`G C`).
   *
   * Mostrar o atalho NA linha é como ele se aprende: quem procurou "Ordens" com
   * o mouse lê a tecla no caminho de volta. Ela não é requisito — o item
   * continua clicável, e a barra lateral continua tendo o mesmo destino.
   */
  atalho?: string
  /**
   * A `url` sai da SPA — vem de `NavItem.externo`.
   *
   * Viaja até aqui porque a paleta NAVEGA (`navigate({ to })`), e para o
   * destino externo isso é rota inexistente: o operador pediria o mapa de
   * tabelas e receberia o 404 do roteador. É a mesma marca do item, carregada
   * junto em vez de reconsultada — a paleta não deve saber que caminho "parece"
   * arquivo estático.
   */
  externo?: true
}

export const GRUPO_RECENTES = 'Recentes'
export const GRUPO_NESTA_TELA = 'Nesta tela'
export const GRUPO_ACOES = 'Ações'
export const GRUPO_AJUDA = 'Ajuda'

/**
 * ONDE CADA TECLA `g` LEVA — por PREFIXO de rota, não por rota fixa.
 *
 * `g c` não pode apontar `/compras/ordens` na unha: a empresa que não tem o
 * recurso de compras veria a tecla levar a uma tela que a guarda recusa. O
 * prefixo é resolvido contra o menu VISÍVEL, então a tecla chega ao primeiro
 * destino que aquela empresa alcança — e, se ela não alcança nenhum, o atalho
 * simplesmente não existe, em vez de existir quebrado.
 */
const PREFIXO_DO_ATALHO = {
  [SHORTCUTS.irCompras]: '/compras',
  [SHORTCUTS.irEstoque]: '/estoque',
  [SHORTCUTS.irVendas]: '/vendas',
} as const

/**
 * A rota para onde uma tecla `g` leva nesta empresa, ou `undefined`.
 *
 * Ordem do MENU, não alfabética: a primeira tela do módulo é a que a barra
 * lateral mostra em cima, e a tecla tem de chegar onde o clique chegaria.
 */
export function destinoDoAtalho(
  tem: (recurso: RecursoDaEmpresa) => boolean,
  combo: string,
): string | undefined {
  const prefixo = PREFIXO_DO_ATALHO[combo as keyof typeof PREFIXO_DO_ATALHO]
  if (!prefixo) return undefined
  return itensDaPaleta(tem)
    .map(({ item }) => item)
    .find((item) => !item.externo && item.url.startsWith(prefixo))?.url
}

/** Chave do armazenamento local dos destinos recentes. */
export const CHAVE_RECENTES = 'cabinet:paleta:recentes'

/** Quantos destinos a paleta lembra. Três é o que o mockup mostra na sidebar. */
export const MAXIMO_DE_RECENTES = 3

/**
 * Os últimos destinos abertos pela paleta, do mais novo para o mais velho.
 *
 * Guarda URL e nada mais. Guardar o título congelaria o rótulo do dia em que
 * se clicou — tela renomeada apareceria com o nome antigo, e a lista viraria
 * um museu. A URL é resolvida contra o menu de HOJE, então destino que saiu do
 * ar (ou que a empresa deixou de alcançar) some sozinho da lista.
 *
 * `localStorage` pode lançar — navegador com dado de site bloqueado, modo
 * privado de alguns. A paleta não depende disto para funcionar: sem memória,
 * ela abre sem o grupo Recentes.
 */
export function lerRecentes(): string[] {
  try {
    const cru = window.localStorage.getItem(CHAVE_RECENTES)
    if (!cru) return []
    const lista: unknown = JSON.parse(cru)
    return Array.isArray(lista) ? lista.filter((u): u is string => typeof u === 'string') : []
  } catch {
    return []
  }
}

/** Põe a URL no topo dos recentes (sem repetir) e devolve a lista nova. */
export function registrarRecente(url: string): string[] {
  const lista = [url, ...lerRecentes().filter((u) => u !== url)].slice(0, MAXIMO_DE_RECENTES)
  try {
    window.localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista))
  } catch {
    // Sem memória entre sessões; a lista da sessão corrente continua valendo.
  }
  return lista
}

/**
 * O mapa de atalhos, alcançável de qualquer tela.
 *
 * **Entra por aqui e não pela barra lateral** porque a barra é o mapa dos
 * MÓDULOS do negócio — vendas, compras, estoque — e ajuda não é um deles.
 * Enfiá-la num grupo de módulo daria à referência de teclado o mesmo peso do
 * cadastro de produto na primeira leitura da barra.
 *
 * Fixo e sem `recurso`: o mapa vale para toda empresa, e a tela que o operador
 * procura quando a tecla não fez o que ele esperava não pode depender de a
 * empresa ter contratado alguma coisa.
 */
const AJUDA_DE_ATALHOS: Comando = {
  id: 'ir:/ajuda/atalhos',
  titulo: 'Atalhos do teclado',
  descricao: 'A tecla de cada ação, e a do sistema antigo que ela substitui.',
  grupo: GRUPO_AJUDA,
  url: '/ajuda/atalhos',
  icon: Keyboard,
  tipo: 'navegar',
}

/**
 * O verbo do `Incluir` acompanha o SUBSTANTIVO da tela, no singular.
 *
 * `Novo Clientes` é o que sai de pluralizar ao contrário, e a paleta é lida em
 * voz de comando — o rótulo tem de soar como a ação que a pessoa ia fazer. A
 * tabela é curta e explícita de propósito: derivar singular de plural em
 * português (Orçamentos → Orçamento, mas Motivos de Perda → Motivo de Perda)
 * exigiria regra de gramática para nove casos conhecidos.
 */
const NOME_NO_SINGULAR: Record<string, string> = {
  '/cadastros/clientes': 'Novo cliente',
  '/cadastros/fornecedores': 'Novo fornecedor',
  '/cadastros/profissionais': 'Novo profissional externo',
  '/cadastros/colaboradores': 'Novo colaborador',
  '/cadastros/produtos': 'Novo produto',
  '/vendas/orcamentos': 'Novo orçamento',
  '/compras/ordens': 'Nova ordem de compra',
  '/compras/pedidos': 'Novo pedido de compra',
  '/crm/funis': 'Novo funil',
}

function rotuloDeIncluir(item: NavItem): string {
  return NOME_NO_SINGULAR[item.url] ?? `Incluir em ${item.title}`
}

/**
 * Um item do menu com o lugar de onde ele veio.
 *
 * Seção e grupo viajam junto porque a paleta 2.0 os USA — a seção vira o
 * cabeçalho colorido, e o par seção › grupo vira o caminho da linha. Recalcular
 * isso depois, procurando o item de volta na árvore, é o tipo de segunda
 * travessia que diverge da primeira sem ninguém notar.
 */
interface ItemComLugar {
  item: NavItem
  secao: NavSecao
  grupo: NavGroup
}

/**
 * Os itens que a paleta oferece, achatados, na ordem do menu.
 *
 * Reproduz o recorte de `gruposVisiveis` — tela FUTURA fora, filha subindo
 * para o lugar do pai — e acrescenta o lugar de cada item. É a única
 * travessia da árvore neste arquivo.
 */
function itensDaPaleta(tem: (recurso: RecursoDaEmpresa) => boolean): ItemComLugar[] {
  return secoesVisiveis(tem).flatMap((secao) =>
    secao.grupos.flatMap((grupo) =>
      grupo.items
        .flatMap((item) => (item.filhas ? item.filhas : [item]))
        .filter((item) => !item.futuro)
        .map((item) => ({ item, secao, grupo })),
    ),
  )
}

/**
 * O CAMINHO da linha: `Estoque › Compras`.
 *
 * O nome do grupo some quando repete o da seção (`Pessoas › Pessoas`), que é o
 * caso de toda seção de um grupo só. Repetir diria que são dois níveis onde há
 * um, e gasta a metade direita da linha sem informar nada.
 */
function caminhoDoItem({ secao, grupo }: ItemComLugar): string {
  return grupo.title === secao.rotulo ? secao.rotulo : `${secao.rotulo} › ${grupo.title}`
}

function comandoDeNavegacao(lugar: ItemComLugar, atalhoPorUrl: Map<string, string>): Comando {
  const { item, secao } = lugar
  const atalho = atalhoPorUrl.get(item.url)
  return {
    id: `ir:${item.url}`,
    titulo: item.title,
    descricao: item.descricao,
    // O grupo é a SEÇÃO da barra lateral, com a cor dela. A paleta passa a ser
    // lida como o menu é lido — por bloco de cor — em vez de uma lista de
    // dezoito destinos sob um "Ir para" único.
    grupo: secao.rotulo,
    url: item.url,
    icon: item.icon,
    tipo: 'navegar',
    // A cor do item empresta a do vizinho quando a tela não tem módulo próprio
    // (`aparencia`), como já acontece na barra; senão, a da seção.
    ...((item.aparencia?.modulo ?? secao.modulo)
      ? { modulo: (item.aparencia?.modulo ?? secao.modulo) as Modulo }
      : {}),
    caminho: caminhoDoItem(lugar),
    ...(atalho && { atalho }),
    ...(item.externo && { externo: item.externo }),
  }
}

function comandoDeInclusao(item: NavItem, grupo: string, caminho?: string): Comando {
  return {
    id: `novo:${item.url}`,
    titulo: rotuloDeIncluir(item),
    descricao: `Abre um registro em branco em ${item.title}.`,
    grupo,
    url: item.incluir as string,
    icon: item.icon,
    tipo: 'incluir',
    ...(caminho && { caminho }),
  }
}

/**
 * Todos os comandos, na ordem em que a paleta os mostra.
 *
 * **O contexto vem primeiro, e o que a pessoa já usou vem antes dele.** Recentes
 * encabeça porque é a lista mais curta e a mais provável; depois a ação da tela
 * aberta; depois as ações de inclusão; depois o mapa inteiro, quebrado por
 * seção com a cor do módulo; a ajuda por último.
 *
 * **Nada aparece duas vezes.** Um destino que está em Recentes sai da seção
 * dele, e a inclusão da tela aberta sai do grupo Ações. Item repetido numa
 * lista de busca faz o operador achar que são dois registros diferentes — e é a
 * mesma regra que já valia para o contexto antes de Recentes existir.
 */
export function comandosDaPaleta(
  tem: (recurso: RecursoDaEmpresa) => boolean,
  rotaAtual?: string,
  recentes: string[] = [],
): Comando[] {
  const lugares = itensDaPaleta(tem)
  const atual = rotaAtual ? itemDaRota(rotaAtual) : undefined

  // Qual item ganha o rótulo de cada tecla `g`. Um Map porque a resolução é por
  // prefixo e custa uma varredura por atalho — fazê-la dentro do `map` dos
  // itens repetiria a conta por linha da paleta.
  const atalhoPorUrl = new Map<string, string>()
  for (const combo of [SHORTCUTS.irCompras, SHORTCUTS.irEstoque, SHORTCUTS.irVendas]) {
    const destino = destinoDoAtalho(tem, combo)
    if (destino) atalhoPorUrl.set(destino, shortcutLabel(combo))
  }

  // Só conta como contexto o item que a empresa ALCANÇA: navegar por URL para
  // uma tela sem recurso não pode fazer a paleta oferecer o que a barra esconde.
  // Compara por URL, não por identidade de objeto: `secoesVisiveis` devolve
  // cópias rasas, e comparar instância daria contexto sempre vazio.
  const doContexto =
    atual?.incluir && lugares.some(({ item }) => item.url === atual.url) ? atual : undefined

  const nestaTela = doContexto ? [comandoDeInclusao(doContexto, GRUPO_NESTA_TELA)] : []

  // A ordem dos recentes é a do armazenamento (mais novo primeiro), não a do
  // menu: é uma lista temporal, e reordená-la pelo mapa apagaria o que ela diz.
  const emRecentes = new Set(recentes.filter((url) => lugares.some(({ item }) => item.url === url)))
  const recentesComandos = [...emRecentes].flatMap((url) => {
    const lugar = lugares.find(({ item }) => item.url === url)
    return lugar ? [{ ...comandoDeNavegacao(lugar, atalhoPorUrl), grupo: GRUPO_RECENTES }] : []
  })

  const acoes = lugares
    .filter(({ item }) => item.incluir && item.url !== doContexto?.url)
    .map((lugar) => comandoDeInclusao(lugar.item, GRUPO_ACOES, caminhoDoItem(lugar)))

  const navegar = lugares
    .filter(({ item }) => !emRecentes.has(item.url))
    .map((lugar) => comandoDeNavegacao(lugar, atalhoPorUrl))

  // A ajuda vai por último de propósito: é a que se procura pelo nome, nunca a
  // que se quer ver antes das dezoito telas ao abrir a paleta em branco.
  return [...recentesComandos, ...nestaTela, ...acoes, ...navegar, AJUDA_DE_ATALHOS]
}
