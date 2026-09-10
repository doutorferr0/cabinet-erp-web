import {
  type ColumnDef as ColumnDefV9,
  columnOrderingFeature,
  columnVisibilityFeature,
  type RowData,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'
import type { TipoDeColuna } from '@/components/cabinet/listagem/celulas-tipadas'

/**
 * O QUE A COLUNA DIZ SOBRE SI — o `meta` do `ColumnDef`.
 *
 * Vivia como `declare module '@tanstack/react-table'` dentro do `data-table.tsx`.
 * Na v9 saiu de lá por dois motivos, e o segundo é o que importa: a interface
 * global passou a exigir `TFeatures` como primeiro parâmetro (a augmentação
 * antiga nem compila), e a v9 abriu uma saída melhor que augmentar o módulo —
 * declarar o meta como SLOT do conjunto de features, logo abaixo.
 *
 * A diferença é de alcance. A augmentação global valia para todo `ColumnDef`
 * do processo, inclusive o de uma segunda tabela que um dia usasse outro
 * conjunto; o slot vale para ESTE conjunto, que é o que a frase quer dizer.
 */
export interface MetaDaColuna {
  /** Coluna de valor: numerais tabulares alinhados à direita (DESIGN.md, Regra do Número Tabular). */
  numeric?: boolean
  /**
   * O QUE aquele valor é — id, entidade, data, dinheiro, situação, progresso
   * ou texto. Decide a moldura da célula (mono, alinhamento, truncagem), o
   * ícone do cabeçalho e, na situação, se a linha inteira fica apagada.
   * Ver `listagem/celulas-tipadas.tsx`.
   */
  tipo?: TipoDeColuna
  /**
   * A célula aceita edição inline no modo Planilha (D33).
   *
   * Sem isto, Enter na célula ABRE o registro — que é o que nove em cada dez
   * colunas de uma listagem de ERP querem, porque listagem confere e o
   * formulário é que grava. Ligar exige a tela passar `aoEditarCelula`: a
   * coluna diz que ACEITA, a tela diz o que FAZER com o valor, e uma sem a
   * outra abriria um editor cujo Enter não grava em lugar nenhum.
   */
  editavel?: boolean
}

/**
 * AS FEATURES DA TABELA — o conjunto que a v9 exige que seja declarado.
 *
 * A v8 embutia tudo em `useReactTable`; a v9 pede que cada feature usada seja
 * registrada, e é isso que a torna tree-shakeable. Registrar de menos não
 * "quebra o tipo e segue": o método some da instância, então o erro aparece na
 * chamada — que é o modo de falha bom. A alternativa preguiçosa
 * (`stockFeatures`) compila sempre e traz o pacote inteiro para o bundle.
 *
 * **Só TRÊS, e o motivo é que esta tabela pergunta pouco ao cliente.**
 * Ordenação e paginação são do SERVIDOR — quem as aplica é o backend, pela
 * convenção de `queryDaTabela` (`sortBy`, `sortDesc`, `page`, `pageSize`), e a
 * tabela nunca teve `getSortedRowModel` nem `getPaginationRowModel`. Na v8 isso
 * se dizia com `manualSorting`/`manualPagination`; na v9 se diz NÃO registrando
 * as features, o que é a mesma frase sem a chance de alguém ligar o row model
 * por engano e passar a ordenar duas vezes.
 *
 * O que ela realmente governa no cliente é qual coluna aparece e em que ordem —
 * estado de tela, que entra na consulta favorita:
 *
 * - `columnVisibilityFeature` — o menu `Colunas` esconde e mostra;
 * - `columnOrderingFeature` — o arraste do mesmo menu reordena;
 * - `rowSortingFeature` — **sem** o `sortedRowModel`, e é essa a metade que
 *   importa: a feature dá à COLUNA o `enableSorting` (que oito listagens usam
 *   para dizer que um campo não está na whitelist de `sortBy` do servidor) e à
 *   tabela o estado da seta do cabeçalho; o row model é que ordenaria as linhas
 *   aqui, e ele fica de fora porque quem ordena é o backend. Registrar os dois
 *   faria a página vir ordenada do servidor e ser reordenada de novo no
 *   cliente, sobre as 10 linhas da página — a lista pareceria certa e estaria
 *   errada a partir da segunda página.
 *
 * As três são CONTROLADAS pelo `VitraDataTable` (o estado mora lá, porque viaja
 * para o favorito). Registrar a feature é o que dá à tabela os métodos que leem
 * esse estado: `getIsVisible()`, `getVisibleCells()`, `getVisibleLeafColumns()`.
 *
 * Feature nova entra AQUI, num lugar só: espalhar `tableFeatures()` por tela
 * daria a cada listagem um conjunto próprio, e a primeira divergência
 * apareceria como um método faltando numa tela e presente na vizinha.
 */
export const featuresDaTabela = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  rowSortingFeature,
  columnMeta: {} as MetaDaColuna,
})

export type FeaturesDaTabela = typeof featuresDaTabela

/**
 * `ColumnDef` com as features já amarradas — o tipo que as telas importam.
 *
 * Na v9 o tipo virou `ColumnDef<TFeatures, TData, TValue>`: as features entram
 * na assinatura porque são elas que decidem quais opções a coluna aceita
 * (`enableSorting` só existe com a feature de ordenação registrada, e assim por
 * diante). Escrever os três argumentos em cada uma das 37 telas seria repetir
 * `typeof featuresDaTabela` trinta e sete vezes, e bastaria uma divergir para a
 * coluna aceitar opção que a tabela não serve.
 *
 * Reexportado com o MESMO nome de propósito: para a tela, `ColumnDef<Cliente>`
 * continua sendo `ColumnDef<Cliente>` — muda o caminho do import, não o que se
 * escreve. Foi o que manteve a migração da v9 em trinta e sete trocas de import
 * e um arquivo de lógica, em vez de 213 correções de tipo espalhadas.
 */
export type ColumnDef<TData extends RowData, TValue = unknown> = ColumnDefV9<
  FeaturesDaTabela,
  TData,
  TValue
>

/**
 * A restrição que a v9 passou a exigir da linha: `RowData` é record ou array,
 * nunca `unknown`.
 *
 * Reexportada para as telas e os componentes genéricos escreverem
 * `<T extends LinhaDaTabela>` sem importar do pacote — mesma razão do
 * `ColumnDef` acima: o caminho do import é um só.
 */
export type { RowData as LinhaDaTabela }
