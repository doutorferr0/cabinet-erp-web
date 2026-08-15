import { type FiltroDaTabela, type Juncao, novoFiltroId } from '@/lib/filtro-de-consulta'
import type { TableSort } from '@/lib/table-query'

/**
 * CONSULTA FAVORITA — a pergunta que o operador refaz toda semana, com nome.
 *
 * O filtro estruturado (#76→#85) some ao sair da tela, e "clientes inativos de
 * São Paulo" é uma consulta que se remonta na segunda-feira seguinte campo a
 * campo. Guardar a combinação com nome é o que transforma o filtro de ferramenta
 * de emergência em rotina.
 *
 * ## Guarda o que a CONSULTA é, não o que a tela mostrou
 *
 * Filtros, junção e ordenação. **Página e busca ficam de fora, de propósito:**
 * `page` é onde o operador parou de rolar naquele momento, e `q` é texto livre
 * de uma pergunta pontual — restaurar os dois faria o favorito abrir na página 4
 * de uma busca que ninguém lembra ter feito.
 *
 * **A VISÃO, o AGRUPAMENTO e a DENSIDADE entraram** (view modes #86, densidade
 * #123) e são o resto da mesma frase: "quais registros" (filtros + junção), "em
 * que ordem" (`sort`), "como desenhados" (`visao`), "em que colunas"
 * (`agruparPor`) e "quantas linhas cabem" (`densidade`). Guardar só os
 * primeiros faria o favorito abrir a lista quando o operador salvou o quadro —
 * e ele salvou o quadro.
 *
 * **Vazio (`''`) = o favorito não guardou aquilo, e aplicá-lo não mexe no que
 * está na tela.** É o que mantém válido o que foi gravado ANTES desta mudança:
 * um favorito de Clientes salvo na semana passada não tem visão, e ele não pode
 * significar "volte para a visão padrão" — significa "eu só falo de filtro".
 *
 * ## Local, e versionado
 *
 * `localStorage` porque não há backend para preferência de usuário, e a chave
 * carrega `v1`: mudança de forma vira chave nova em vez de conteúdo velho lido
 * como se fosse novo. Toda leitura tolera lixo — favorito corrompido devolve
 * lista vazia, nunca derruba a listagem. Perder um favorito é aborrecimento;
 * perder a tela por causa de um valor gravado é defeito.
 */
export interface FavoritoDeConsulta {
  id: string
  nome: string
  filtros: FiltroDaTabela[]
  juncao: Juncao
  sort: TableSort | null
  /** Id da visão ativa (`lista` é a tabela). `''` = não guardou visão. */
  visao: string
  /** Campo das colunas da visão que agrupa. `''` = não guardou agrupamento. */
  agruparPor: string
  /** Altura da linha da tabela (`padrao`/`compacta`). `''` = não guardou. */
  densidade: string
  /** Aplicado sozinho ao abrir a tela. No máximo um por tela. */
  padrao: boolean
}

/** A forma que a tela devolve ao aplicar um favorito. */
export interface ConsultaSalva {
  filtros: FiltroDaTabela[]
  juncao: Juncao
  sort: TableSort | null
  visao: string
  agruparPor: string
  densidade: string
}

const CHAVE = 'cabinet.consultas-favoritas.v1'

/**
 * Identidade da tela para o armazenamento — derivada do `queryKey`.
 *
 * O `queryKey` já é o nome estável da listagem (é por ele que o TanStack Query
 * separa os caches), então inventar um segundo identificador criaria duas
 * verdades sobre "que tela é esta". **O acoplamento é real e tem preço:** trocar
 * o `queryKey` por motivo de cache faria os favoritos gravados sumirem em
 * silêncio. Por isso existe teste fixando a chave de cada tela — a troca aparece
 * como teste vermelho, não como consulta perdida na segunda-feira.
 */
export function idDaTela(queryKey: readonly unknown[]): string {
  return queryKey.map((parte) => String(parte)).join('.')
}

type Guardado = Record<string, FavoritoDeConsulta[]>

function lerTudo(): Guardado {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return {}
    const lido: unknown = JSON.parse(bruto)
    if (!lido || typeof lido !== 'object' || Array.isArray(lido)) return {}
    return lido as Guardado
  } catch {
    // Sem `localStorage` (modo privado, SSR, política do navegador) ou com JSON
    // quebrado, a tela abre sem favorito. É o único fim aceitável: a listagem
    // não depende deles para funcionar.
    return {}
  }
}

function ehFavorito(valor: unknown): valor is FavoritoDeConsulta {
  if (!valor || typeof valor !== 'object') return false
  const f = valor as Partial<FavoritoDeConsulta>
  return typeof f.id === 'string' && typeof f.nome === 'string' && Array.isArray(f.filtros)
}

export function lerFavoritos(tela: string): FavoritoDeConsulta[] {
  const lista = lerTudo()[tela]
  if (!Array.isArray(lista)) return []
  // Filtra item a item: um favorito estragado não leva os outros junto.
  return lista.filter(ehFavorito).map((f) => ({
    ...f,
    juncao: f.juncao === 'or' ? 'or' : 'and',
    sort: f.sort ?? null,
    // Gravado antes dos view modes não tem os dois campos, e lixo no
    // armazenamento pode ter qualquer coisa neles. Nos dois casos vale o vazio:
    // "este favorito não fala de visão", que é diferente de "volte ao padrão".
    visao: typeof f.visao === 'string' ? f.visao : '',
    agruparPor: typeof f.agruparPor === 'string' ? f.agruparPor : '',
    densidade: typeof f.densidade === 'string' ? f.densidade : '',
    padrao: f.padrao === true,
  }))
}

export function gravarFavoritos(tela: string, favoritos: FavoritoDeConsulta[]): void {
  try {
    const tudo = lerTudo()
    if (favoritos.length === 0) delete tudo[tela]
    else tudo[tela] = favoritos
    localStorage.setItem(CHAVE, JSON.stringify(tudo))
  } catch {
    // Cota estourada ou armazenamento bloqueado: o favorito não persiste e a
    // sessão segue com ele em memória. Falhar a gravação não pode desfazer o
    // que o operador acabou de montar na tela.
  }
}

export function favoritoPadrao(
  favoritos: readonly FavoritoDeConsulta[],
): FavoritoDeConsulta | undefined {
  return favoritos.find((f) => f.padrao)
}

/**
 * Marca um como padrão e desmarca os outros — no máximo UM por tela.
 *
 * Dois padrões fariam a tela abrir com o que o `find` topasse primeiro, e a
 * ordem de um array gravado não é promessa que valha nada para o operador.
 */
export function comPadrao(
  favoritos: readonly FavoritoDeConsulta[],
  id: string,
): FavoritoDeConsulta[] {
  const jaEra = favoritos.find((f) => f.id === id)?.padrao === true
  return favoritos.map((f) => ({ ...f, padrao: !jaEra && f.id === id }))
}

/**
 * A consulta pronta para aplicar, com **chaves de linha novas**.
 *
 * O `filtroId` é identidade de LINHA em memória, e um gravado meses atrás pode
 * colidir com o de uma linha que o operador acabou de adicionar — aí editar uma
 * mexeria na outra. Regenerar no momento de aplicar custa nada e fecha o caso.
 */
export function consultaDoFavorito(favorito: FavoritoDeConsulta): ConsultaSalva {
  return {
    filtros: favorito.filtros.map((filtro) => ({ ...filtro, filtroId: novoFiltroId() })),
    juncao: favorito.juncao,
    sort: favorito.sort,
    visao: favorito.visao,
    agruparPor: favorito.agruparPor,
    densidade: favorito.densidade,
  }
}

let sequencia = 0

export function novoFavoritoId(): string {
  sequencia += 1
  return `fav-${Date.now().toString(36)}-${sequencia}`
}
