import { type NavItem, gruposVisiveis, itemDaRota } from '@/app/navigation'
import type { RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import type { LucideIcon } from 'lucide-react'

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
 * **Não busca REGISTRO.** "Ir para o cliente ANDRÉ BATALHA" exigiria consulta ao
 * servidor a cada tecla, em todo recurso ao mesmo tempo, e o contrato não tem
 * busca global — cada recurso tem a sua listagem. Prometer isso aqui daria uma
 * caixa que às vezes acha e às vezes não, sem o operador saber por quê.
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
}

export const GRUPO_NESTA_TELA = 'Nesta tela'
export const GRUPO_IR_PARA = 'Ir para'
export const GRUPO_INCLUIR = 'Incluir'

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

function comandoDeNavegacao(item: NavItem, grupo: string): Comando {
  return {
    id: `ir:${item.url}`,
    titulo: item.title,
    descricao: item.descricao,
    grupo,
    url: item.url,
    icon: item.icon,
    tipo: 'navegar',
  }
}

function comandoDeInclusao(item: NavItem, grupo: string): Comando {
  return {
    id: `novo:${item.url}`,
    titulo: rotuloDeIncluir(item),
    descricao: `Abre um registro em branco em ${item.title}.`,
    grupo,
    url: item.incluir as string,
    icon: item.icon,
    tipo: 'incluir',
  }
}

/**
 * Todos os comandos, na ordem em que a paleta os mostra.
 *
 * **O contexto vem primeiro.** Estando em `Clientes`, `Novo cliente` encabeça a
 * lista: a ação mais provável de quem já está na tela é a da própria tela, e
 * fazê-la disputar espaço com dezoito destinos alfabéticos é cobrar leitura por
 * algo que se sabia de antemão. O mesmo comando NÃO se repete embaixo — item
 * duplicado numa lista de busca faz o operador achar que são dois.
 */
export function comandosDaPaleta(
  tem: (recurso: RecursoDaEmpresa) => boolean,
  rotaAtual?: string,
): Comando[] {
  const itens = gruposVisiveis(tem).flatMap((grupo) => grupo.items)
  const atual = rotaAtual ? itemDaRota(rotaAtual) : undefined
  // Só conta como contexto o item que a empresa ALCANÇA: navegar por URL para
  // uma tela sem recurso não pode fazer a paleta oferecer o que a barra esconde.
  // Compara por URL, não por identidade de objeto: `gruposVisiveis` hoje
  // devolve as MESMAS instâncias de item, mas isso é detalhe da implementação
  // dela — um `map` ali dentro faria o contexto sumir sem nenhum teste acusar.
  const doContexto =
    atual?.incluir && itens.some((item) => item.url === atual.url) ? atual : undefined

  const nestaTela = doContexto ? [comandoDeInclusao(doContexto, GRUPO_NESTA_TELA)] : []

  const incluir = itens
    .filter((item) => item.incluir && item.url !== doContexto?.url)
    .map((item) => comandoDeInclusao(item, GRUPO_INCLUIR))

  const navegar = itens.map((item) => comandoDeNavegacao(item, GRUPO_IR_PARA))

  return [...nestaTela, ...incluir, ...navegar]
}
