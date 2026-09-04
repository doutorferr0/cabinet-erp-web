import { AbasDeConsulta } from '@/components/cabinet/filtros/abas-de-consulta'
import { interpretarBusca } from '@/components/cabinet/filtros/busca-com-prefixo'
import { consultaDaUrl } from '@/components/cabinet/filtros/filtro-na-url'
import { SincroniaComAUrl } from '@/components/cabinet/filtros/sincronia-com-a-url'
import { ListaDeFiltros } from '@/components/cabinet/lista-de-filtros'
import { type AcaoDeLinha, AcoesDeLinha } from '@/components/cabinet/listagem/acoes-de-linha'
import { BarraDeFiltros } from '@/components/cabinet/listagem/barra-de-filtros'
import {
  IconeDeTipo,
  LARGURA_DO_TIPO,
  type TipoDeColuna,
  classeDoTipo,
  ehTipoComposto,
  renderTipo,
  tomDoValor,
} from '@/components/cabinet/listagem/celulas-tipadas'
import {
  PontoDoModulo,
  colunasDaGrade,
  idsDeclarados,
  moduloDaColuna,
} from '@/components/cabinet/listagem/colunas-da-grade'
import { gruposDoModulo } from '@/components/cabinet/listagem/colunas-por-modulo'
import { FiltroPorModulo } from '@/components/cabinet/listagem/filtro-por-modulo'
import { useFlipDasLinhas } from '@/components/cabinet/listagem/flip-das-linhas'
import {
  DICA_DA_PLANILHA,
  EditorDaCelula,
  useModoPlanilha,
} from '@/components/cabinet/listagem/modo-planilha'
import { ModuloEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { Ornamento, OrnamentoDoModulo } from '@/components/cabinet/ornamento'
import { Stamp, type StampTom } from '@/components/cabinet/stamp'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// A constante é do CONTRATO de listagem (`pageSize` acima de 100 é 400), e é
// por isso que ela vem da fronteira em vez de ser redigitada aqui: a visão que
// desenha colunas pede o conjunto inteiro, e "inteiro" é um número que o
// servidor define.
import { PAGE_SIZE_MAX } from '@/data/api-provider'
import { ehModuloEmConstrucao } from '@/data/modulos-em-construcao'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { mensagemDoErro } from '@/lib/erros'
import {
  type ConsultaSalva,
  type FavoritoDeConsulta,
  comPadrao,
  consultaDoFavorito,
  favoritoPadrao,
  gravarFavoritos,
  idDaTela,
  lerFavoritos,
  novoFavoritoId,
} from '@/lib/favoritos-de-consulta'
import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type Juncao,
  filtrosNormalizados,
  filtrosValidos,
} from '@/lib/filtro-de-consulta'
import { formatMoneyBRL } from '@/lib/formatters'
import type { TableFetcher, TableQueryState, TableSort } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import {
  type ColumnDef,
  type Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  Rows3,
} from 'lucide-react'
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
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
}

/** Ação da barra padrão das listagens (transcrição §9, padrão 4). */
export interface DataTableAction<T> {
  id: string
  label: string
  /**
   * Ícone do lucide à esquerda do rótulo. Sempre acompanhado do TEXTO, nunca no
   * lugar dele: a barra é a mesma em 8 telas e o operador a lê por palavra —
   * `Consul.` e `Alterar` são vocabulário do legado, e um olho sozinho não diz
   * qual dos dois é. O desenho serve para achar o botão de longe depois de já
   * ter aprendido onde ele fica.
   *
   * Família LUCIDE, não os shapes brutalist: aqui é AÇÃO ("o que eu faço"), e a
   * fronteira do sistema dá ação ao lucide e lugar ao shape.
   */
  icon?: LucideIcon
  /** Recebe a linha selecionada (null quando `needsSelection` é false). */
  onClick?: (row: T | null) => void
  /** Desabilita sem linha selecionada (Alterar, Consul., Excluir/Cancelar). */
  needsSelection?: boolean
  /** Desabilita SEMPRE — a ação existe na barra mas não é possível aqui. */
  disabled?: boolean
  /** Motivo, no `title` do botão. Obrigatório na prática quando `disabled`: botão
   *  morto e mudo faz o operador achar que é defeito. */
  title?: string
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
}

/** Id da visão de TABELA — a que toda listagem tem, e a que existe por omissão. */
export const VISAO_LISTA = 'lista'

/**
 * VIEW MODE — a mesma consulta, desenhada de outro jeito.
 *
 * Padrão aprovado para TODO o ERP (core @decisoes, ponto 6), com o funil de
 * vendas como piloto: kanban, lista, gráfico e calendário sobre o **mesmo
 * filtro**. Mora aqui, e não na tela, porque é justamente o "mesmo" que precisa
 * ser garantido: dois componentes lado a lado teriam dois estados de filtro com
 * o mesmo nome, e a tela alternaria entre duas perguntas parecidas.
 *
 * A visão recebe as linhas que a consulta trouxe. Ela **não consulta nada** —
 * quem pergunta é a listagem, uma vez só.
 */
export interface VisaoDaListagem<T> {
  id: string
  rotulo: string
  icon?: LucideIcon
  /**
   * Esta visão desenha COLUNAS a partir de um campo — liga o seletor
   * `Agrupar por`. Visão que não agrupa (um gráfico de barras no tempo, por
   * exemplo) não o mostra: seletor sem efeito é pior que ausência de seletor.
   */
  agrupa?: boolean
  render: (dados: { rows: T[]; agruparPor: string }) => ReactNode
}

/**
 * Campo pelo qual a listagem se parte — nas COLUNAS da visão que agrupa e, desde
 * a D10, nas FAIXAS da tabela.
 *
 * `valorDaLinha` é o que separa os dois usos: a visão sabe ler as próprias
 * linhas (o quadro do funil tem o mapa de etapas), a tabela não sabe nada sobre
 * `T`. Campo sem `valorDaLinha` continua valendo para a visão e **não** aparece
 * no chip `Agrupar` — oferecer na barra um campo que a tabela não sabe ler daria
 * um clique que não faz nada, que é pior que a ausência do campo.
 */
export interface OpcaoDeAgrupamento<T = unknown> {
  id: string
  rotulo: string
  /** O valor do grupo desta linha, já na forma de exibição. */
  valorDaLinha?: (linha: T) => string
  /**
   * O tom do valor quando o campo é SITUAÇÃO — é ele que tinge a faixa do
   * grupo. Sem ele a faixa fica no tint neutro: agrupar por vendedor não tem
   * cor, e inventar uma pintaria a listagem de decoração sem significado
   * (§Hierarquia: cor decorativa em linha de dado é proibida).
   */
  tomDoValor?: (valor: string) => StampTom | undefined
}

/**
 * DECORAÇÃO DA LINHA — o estado que a linha anuncia sozinha (D10, Odoo).
 *
 * Não é cor decorativa: cada tom responde a uma pergunta que o operador faria
 * varrendo a coluna de data. `warn` é o que ainda dá tempo (vence hoje),
 * `bad` é o que já passou (atrasado, bloqueado), `muted` é o que saiu do jogo
 * (cancelado, inativo) e por isso não deve competir com o resto por atenção.
 *
 * A tela decide o que é cada um: a tabela não conhece prazo nem situação.
 */
export type DecoracaoDaLinha = 'warn' | 'bad' | 'muted'

/** Um grupo montado pela tabela: o valor, as linhas e a soma (quando há). */
export interface GrupoDaTabela<T> {
  valor: string
  linhas: T[]
  /** Soma em CENTAVOS INTEIROS; `null` quando a listagem não declara subtotal. */
  subtotal: number | null
}

/**
 * Parte as linhas em grupos, na ordem em que cada valor APARECEU.
 *
 * Ordem de primeira aparição, e não alfabética: a ordenação da tabela é uma
 * pergunta que o operador já fez (clicou no cabeçalho, o servidor respondeu), e
 * reordenar os grupos por conta própria responderia outra. Ordenar por `Valor`
 * decrescente com os grupos em ordem alfabética mostraria o maior grupo no meio.
 *
 * A soma é de INTEIROS, sempre: dinheiro trafega em centavos (CLAUDE.md), e o
 * subtotal de um grupo é a soma dos centavos das linhas dele — nunca a soma dos
 * reais formatados, que perderia o centavo em cada linha e devolveria um total
 * que não bate com a coluna acima dele.
 */
export function agruparLinhas<T>(
  linhas: readonly T[],
  valorDaLinha: (linha: T) => string,
  subtotalDaLinha?: (linha: T) => number,
): GrupoDaTabela<T>[] {
  const porValor = new Map<string, GrupoDaTabela<T>>()
  for (const linha of linhas) {
    const valor = valorDaLinha(linha)
    const grupo = porValor.get(valor) ?? {
      valor,
      linhas: [],
      subtotal: subtotalDaLinha ? 0 : null,
    }
    grupo.linhas.push(linha)
    if (subtotalDaLinha) grupo.subtotal = (grupo.subtotal ?? 0) + subtotalDaLinha(linha)
    porValor.set(valor, grupo)
  }
  return [...porValor.values()]
}

/**
 * DENSIDADE da linha — escolha do operador, não do designer.
 *
 * `confortavel` é a célula de 52px do mockup, com subtítulo da entidade;
 * `compacta` é 40px, o piso da faixa consolidada (40–44px), sem subtítulo. Quem
 * confere cinquenta linhas quer as cinquenta na tela; quem lê uma a uma quer
 * respiro. Fixar um dos dois é escolher pelo outro.
 *
 * `planilha` (D33) é a terceira, e é a única que muda o GESTO e não só a
 * altura: a unidade passa a ser a célula, as setas andam por ela e `⌘C` copia o
 * que está marcado. Ela entra aqui, ao lado das outras duas, porque é a mesma
 * pergunta — "como você quer olhar esta lista hoje" —, e um interruptor
 * separado obrigaria o operador a descobrir que existem dois lugares onde a
 * grade muda de cara.
 *
 * A planilha herda a ALTURA da compacta, e não a do mockup: a célula é a
 * unidade de cópia, e o subtítulo da entidade dentro dela faria `⌘C` levar duas
 * linhas de texto para a planilha do operador. O que se copia tem de ser o
 * valor, não o valor mais o que o explica.
 *
 * A troca é CSS puro sobre a mesma marcação — nada de reconsultar nem remontar
 * a tabela, porque densidade não muda o que a consulta trouxe.
 */
export const DENSIDADES = [
  { id: 'compacta', rotulo: 'Compacta', altura: 'Linha de 40px, sem subtítulo' },
  { id: 'confortavel', rotulo: 'Confortável', altura: 'Linha de 52px, com subtítulo' },
  {
    id: 'planilha',
    rotulo: 'Planilha',
    altura: 'Célula selecionável: setas navegam, Enter edita, Esc cancela',
  },
] as const

export type Densidade = (typeof DENSIDADES)[number]['id']

/** A densidade com que toda listagem abre. */
const DENSIDADE_PADRAO: Densidade = 'confortavel'

/**
 * Densidade vinda de FORA (consulta favorita gravada no navegador).
 *
 * `padrao` era o nome do confortável antes desta rodada, e há favoritos
 * gravados com ele em máquina de operador. Descartá-los devolveria a tela à
 * densidade inicial sem ninguém ter mexido no seletor — e o operador atribuiria
 * o salto ao filtro que acabou de aplicar, não a uma renomeação.
 */
function densidadeLida(valor: unknown): Densidade | null {
  if (valor === 'compacta') return 'compacta'
  if (valor === 'planilha') return 'planilha'
  if (valor === 'confortavel' || valor === 'padrao') return 'confortavel'
  return null
}

export interface VitraDataTableProps<T> {
  columns: ColumnDef<T>[]
  /** Prefixo da query key do TanStack Query (o estado da tabela é anexado). */
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  searchPlaceholder?: string
  /**
   * A caixa de busca livre. Ligada por padrão — é o `q` do `TableQueryState`, e
   * quase todo recurso do contrato o publica.
   *
   * `false` para o recurso que NÃO publica `q`, e aí não é preferência de
   * layout: a caixa aceitaria digitação e o servidor devolveria a mesma página,
   * ensinando ao operador que a peça não está lá quando ela está. O kardex
   * (`ListStockMovements`) é o primeiro caso — o `buscaEm` dele é vazio no
   * backend, e o parâmetro não existe no contrato.
   */
  busca?: boolean
  /** Barra de ações padrão: Filtro · Incluir · Alterar · Consul. · Excluir/Cancelar · Imprimir. */
  actions?: DataTableAction<T>[]
  pageSizeOptions?: number[]
  /**
   * Coluna de numeração (DESIGN.md §DataTable): primeira coluna, 40px, valor
   * em Meta alinhado à direita, sequencial GLOBAL da consulta (a "linha 12"
   * que o operador diz em voz alta não muda ao trocar de página). Desligada
   * por padrão — listagem de cadastro não numera.
   */
  rowNumbers?: boolean
  /**
   * Campos que esta listagem oferece para filtrar. **Opt-in por tela**, e não é
   * detalhe: quem responde ao filtro é o provider, e nem todo recurso sabe. Os
   * HTTP dependem de o contrato publicar `filters` para o caminho
   * (`/api/products` e `/api/partners` publicam; `catalog-lookups` e
   * `stock-movements`, não) e de o campo estar na whitelist — as duas coisas
   * barram em `filtrosDaTabela`, na fronteira. Ligar o filtro por padrão em toda
   * tabela ofereceria em oito telas uma consulta que metade delas não sabe
   * responder.
   *
   * Sem esta prop a barra segue com o botão `Filtro` que veio em `actions` (o
   * comportamento antigo: leva o foco para a busca).
   */
  filtros?: readonly CampoFiltravel[]
  /**
   * `pilulas` (padrão) = uma frase removível por condição, na própria barra
   * (#199). `lista` = query-builder em painel, denso, para montar pergunta
   * longa. `modulo` = a faixa de chips por assunto do cadastro (#104). A
   * escolha é da tela porque depende do que ela filtra, não do componente.
   */
  modoDeFiltro?: 'pilulas' | 'lista' | 'modulo'
  /**
   * Visões ALTERNATIVAS à tabela. A tabela existe sempre e não entra na lista —
   * é a visão que toda listagem do ERP tem, e declarar a mesma entrada em oito
   * telas seria repetir o que nunca varia.
   *
   * Sem esta prop não há alternador: a listagem segue tabela e ponto.
   */
  visoes?: readonly VisaoDaListagem<T>[]
  /**
   * Campos oferecidos no `Agrupar por` da visão que agrupa **e** no chip
   * `Agrupar` da tabela (D10). Quem entra no chip é só o campo que declara
   * `valorDaLinha` — ver `OpcaoDeAgrupamento`.
   */
  agrupamentos?: readonly OpcaoDeAgrupamento<T>[]
  /**
   * O que cada linha soma no subtotal do grupo, em CENTAVOS INTEIROS.
   *
   * Opcional porque nem toda listagem agrupada soma dinheiro: agrupar cidades
   * por UF dá contagem, não total. Sem ela a faixa do grupo mostra `n itens` e
   * mais nada — um `R$ 0,00` inventado seria pior, porque tem a forma de um
   * total conferido.
   */
  subtotalDoGrupo?: (linha: T) => number
  /**
   * O ESTADO que a linha anuncia sozinha: faixa lateral e tint (D10).
   *
   * Devolve `undefined` para a linha normal — que é a maioria delas, e é o que
   * faz a decorada saltar. Listagem que decora tudo não decora nada.
   */
  decoracao?: (linha: T) => DecoracaoDaLinha | undefined
  /**
   * Com que visão a tela ABRE. Padrão: a tabela. O funil abre no quadro porque
   * o quadro é o que a tela é — abrir na tabela obrigaria um clique diário para
   * chegar onde o operador já ia.
   */
  visaoInicial?: string
  /**
   * A entidade do schema de módulos — obrigatória em `modoDeFiltro: 'modulo'`.
   *
   * É dela que saem os chips, os campos de cada painel e a cor de cada pill. A
   * prop `filtros` (lista de `CampoFiltravel`) **não serve** para isso: ela é
   * uma lista plana, e o que o modo por módulo precisa é justamente o
   * agrupamento — qual campo pertence a que assunto.
   */
  entidade?: EntidadeCadastro
  /**
   * A consulta desta listagem VIVE no endereço da janela (#199).
   *
   * Ligada, busca e filtro viram `?q=…&filters=…` e a tela volta ao mesmo lugar
   * depois do F5 ou do link colado no chat. Desligada por padrão porque a MESMA
   * tabela também é montada dentro do dialog da janela de busca (padrão 5) e
   * dentro de teste de componente: ali o endereço é o da tela de trás, e
   * escrever nele faria a busca do dialog filtrar a listagem de baixo ao fechar.
   * Quem liga é a `TelaDeListagem`, que é a tela inteira.
   */
  consultaNoEndereco?: boolean
  /**
   * ABRE a linha — e ligar esta prop muda o gesto da listagem inteira
   * (IndexTable, #198).
   *
   * Com ela, clicar na linha ABRE o registro, como em qualquer lista de
   * aplicativo: some o passo "marca a linha, procura o botão, clica". Marcar
   * passa a ser trabalho do CHECKBOX, que é um alvo declarado, e as ações que
   * dependem de seleção descem para a barra que aparece ao marcar.
   *
   * Sem ela a tabela segue como era: clique na linha MARCA. É o que a janela de
   * busca (§9 padrão 5) precisa — lá escolher é o fim, não o meio.
   */
  aoAbrirLinha?: (row: T) => void
  /**
   * Ações que agem sobre a SELEÇÃO. Só aparecem quando há linha marcada, e na
   * barra de seleção — não na barra de consulta, onde ficariam desabilitadas o
   * dia inteiro esperando um clique que quase nunca vem antes delas.
   */
  acoesDeSelecao?: readonly DataTableAction<T>[]
  /**
   * Ações que agem sobre UMA linha, no lugar onde o olho já está: aparecem no
   * hover e no foco da própria linha, na última coluna.
   *
   * A barra de lote responde "o que faço com as marcadas"; estas respondem "o
   * que faço com ESTA". Sem elas, imprimir um pedido custa marcar a linha,
   * subir até a barra e voltar — três gestos para o que é um.
   *
   * `Abrir` NÃO entra aqui: a grade a deriva sozinha de `aoAbrirLinha`, porque
   * toda listagem que abre registro tem a mesma, e repeti-la em oito telas é
   * oito chances de escrever um rótulo diferente.
   */
  acoesDeLinha?: readonly AcaoDeLinha<T>[]
  /**
   * A saída do vazio de MÓDULO — "não há nada cadastrado aqui" com o botão que
   * resolve isso (#201).
   *
   * Chega por prop, e não da lista de `actions`, porque desde a #202 o
   * `Incluir` mora no cabeçalho da PÁGINA: a tabela deixou de conhecê-lo, e a
   * caixa que anuncia o vazio ficou informando um problema sem oferecer o passo
   * seguinte. Quem liga é a `TelaDeListagem`, que é dona das duas peças.
   *
   * Opcional porque a MESMA tabela é montada na janela de busca (padrão 5): lá
   * o vazio termina em cadastro que ninguém pediu no meio de outro formulário.
   */
  acaoDoVazio?: { label: string; onClick: () => void }
  /**
   * O que fazer com o valor digitado numa célula do modo Planilha (D33).
   *
   * Só é chamada em coluna que declara `meta.editavel` — e as duas condições
   * são separadas de propósito: a COLUNA sabe se o campo é editável (uma
   * situação derivada não é), a TELA sabe para onde o valor vai. Sem esta prop
   * nenhuma coluna edita, mesmo declarando `editavel`, e Enter volta a abrir o
   * registro: um editor que aceita a digitação e perde o valor no Enter é pior
   * que editor nenhum.
   *
   * Hoje NENHUMA das onze listagens a liga, e isso não é esquecimento: listagem
   * confere e o formulário grava, e a escrita em lote não existe na fronteira
   * (ver `BarraDeSelecao`). A capacidade fica pronta para a grade de itens do
   * documento, que é onde a edição em célula é o trabalho.
   */
  aoEditarCelula?: (linha: T, colunaId: string, valor: string) => void
}

/**
 * A tinta da FAIXA DE GRUPO, por tom da situação (2.0, mockup §Ordens).
 *
 * A faixa é TINT — a terceira ferramenta de separação da §Hierarquia, que
 * separa região por natureza. Ela e o `<Stamp>` que carrega dizem a mesma
 * coisa: por isso a tinta é a semântica do próprio estado (`--ok-bg`,
 * `--info-bg`, `--bad-bg`) e não uma cor nova — duas famílias de verde na
 * mesma linha leriam como duas informações.
 *
 * São os tokens ALPHA do 2.0, deitados sobre o `n-50` que a linha de grupo já
 * tem: `--ok-bg` e companhia são `color-mix(… , transparent)`, então a
 * composição dá exatamente o `matiz sobre folha-2` do mockup, e a mesma
 * declaração serve os dois temas — o `n-50` é que troca de valor no escuro.
 * Um `#FEF8EC` cravado aqui viraria mancha clara no tema escuro.
 */
const TINT_DO_GRUPO: Record<StampTom, string> = {
  // `neutral` fica no `n-50` puro da faixa: o grupo sem estado (Rascunho, no
  // mockup) é justamente o que não deve chamar. Uma quinta tinta cinza sobre
  // cinza seria ruído com forma de sinal.
  neutral: '',
  open: '[&>td]:bg-[var(--info-bg)]',
  done: '[&>td]:bg-[var(--ok-bg)]',
  void: '[&>td]:bg-[var(--bad-bg)]',
}

/**
 * A DECORAÇÃO da linha: faixa lateral de 3px + tint (D10).
 *
 * A faixa vai na PRIMEIRA célula, não na `<tr>`: sob `border-collapse` a linha
 * não pinta `box-shadow` — é a mesma razão pela qual o anel de foco daqui é
 * montado nas células.
 *
 * `muted` não ganha faixa nem tint, e a assimetria é a regra §Hierarquia: quem
 * saiu do jogo (cancelado, inativo) precisa PARAR de competir por atenção, e
 * uma faixa cinza seria mais um sinal na coluna, não menos. Rebaixar o texto é
 * a ferramenta mais barata que resolve.
 *
 * O tint da LINHA é mais fraco que o do grupo (8% contra os 18–22% dos
 * `--*-bg`) porque a §Hierarquia proíbe cor decorativa em linha de dado: aqui
 * quem informa é a FAIXA, e o fundo só a acompanha. É a fórmula do mockup
 * (`color-mix(… 8%, folha)`), com as rampas 2.0.
 *
 * `bad` usa o token semântico `--bad`; `warn` usa o par de rampas
 * `--amber-600`/`--amber-400` porque `--warn` (como `--info`) ainda é
 * REDEFINIDO pelo `:root` 1.x do `index.css`, que vem depois do import de
 * `tokens-2.0.css` e o vence — ali `--warn` são três números HSL soltos, e
 * `var(--warn)` numa sombra não pinta nada. Os aliases da D1 resolvem a
 * colisão; até lá a rampa dá o mesmo valor nos dois temas, sem depender de
 * quem mergeia primeiro (registrado na #469).
 */
const DECORACAO_DA_LINHA: Record<DecoracaoDaLinha, string> = {
  warn: '[&>td]:bg-[color-mix(in_oklab,var(--amber-400)_8%,var(--n-0))] [&>td:first-child]:shadow-[inset_3px_0_0_var(--amber-600)] dark:[&>td:first-child]:shadow-[inset_3px_0_0_var(--amber-400)]',
  bad: '[&>td]:bg-[color-mix(in_oklab,var(--rose-400)_8%,var(--n-0))] [&>td:first-child]:shadow-[inset_3px_0_0_var(--bad)]',
  muted: 'text-muted-foreground',
}

const SEARCH_DEBOUNCE_MS = 300

const SKELETON_ROWS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const

/**
 * Larguras do esqueleto, cicladas por linha e coluna.
 *
 * Texto de verdade não tem a mesma largura duas vezes; uma grade de barras
 * iguais lê como carregamento em bloco, não como tabela chegando. Ciclo fixo, e
 * não sorteio: `Math.random` mudaria o desenho a cada render e o esqueleto
 * piscaria em larguras diferentes enquanto o operador olha.
 */
const LARGURAS_DE_ESQUELETO = ['h-4 w-4/5', 'h-4 w-3/5', 'h-4 w-2/3'] as const

/**
 * Igualdade do filtro por VALOR, não por referência.
 *
 * O rascunho reconstrói o array a cada tecla, então comparar referência marcaria
 * "mudou" sempre — e cada `setState` voltaria a listagem para a página 1 e
 * perderia a seleção sem que nada de fato tivesse mudado.
 */
function assinaturaDoFiltro(
  filtros: readonly FiltroDaTabela[] | undefined,
  juncao: Juncao,
): string {
  return JSON.stringify({ filtros: filtros ?? [], juncao })
}

/**
 * Falhou ≠ vazio: o operador precisa saber se avisa alguém ou se a consulta não
 * tem resultado mesmo. Com o backend real, essa distinção é a diferença entre
 * "some" e "não existe".
 *
 * Componente, e não bloco solto dentro da tabela, porque as VISÕES respondem à
 * mesma consulta: um quadro que falha calado, ao lado de uma tabela que explica,
 * seria a mesma tela contando duas histórias sobre a mesma requisição.
 */
function FalhaDaConsulta({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  // O 501 não é falha de consulta: o módulo está no contrato e o servidor ainda
  // não o serve. Mostrar o triângulo partido e `Tentar de novo` diria que a
  // requisição não chegou — ela chegou, foi entendida, e a resposta é que o
  // pedaço ainda não existe. O desvio mora AQUI porque as visões respondem à
  // mesma consulta: quadro e tabela têm de contar a mesma história.
  if (ehModuloEmConstrucao(erro)) return <ModuloEmConstrucao erro={erro} />

  return (
    // Mesma anatomia dos vazios, com o ornamento de FALHA — o triângulo partido
    // em Tomato, que não é o vermelho de erro: a consulta não chegou, ninguém
    // fez nada errado e não há cadastro para consertar. Vermelho aqui mandaria o
    // operador procurar culpa onde só houve rede.
    <Empty>
      <EmptyMedia>
        <Ornamento shape="falha-rede" tom="offline" tamanho={96} />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Não foi possível carregar a consulta</EmptyTitle>
        <EmptyDescription>
          {/* O `detail` do problem+json é a frase que o backend escolheu para o
              caso — é a única informação acionável da resposta. Sem ela, a
              orientação genérica. */}
          {mensagemDoErro(erro, 'A consulta não chegou ao servidor. Tente de novo em instantes.')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={aoTentar}>
          Tentar de novo
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Os dois vazios NÃO dizem a mesma coisa, e essa é a razão de existirem
 * separados: "não existe registro" pede cadastrar; "a busca não achou" pede
 * corrigir o termo. Tratar os dois com uma frase só é o que faz o operador
 * procurar defeito onde não há.
 *
 * O ornamento acompanha: shape do módulo num caso, shape de busca na cor de
 * apoio no outro — vazio de busca não é módulo vazio. Ele é `aria-hidden`; quem
 * informa é o título.
 *
 * FILTRO conta como consulta: listagem estreitada até zero com "Ainda não há
 * nada cadastrado aqui" mandaria cadastrar registro que existe e está do lado de
 * fora do filtro.
 */
function VazioDaConsulta({
  q,
  temFiltro,
  acao,
  aoLimpar,
}: {
  q: string
  temFiltro: boolean
  acao?: { label: string; onClick: () => void } | undefined
  aoLimpar: () => void
}) {
  const houveConsulta = q !== '' || temFiltro
  return (
    <Empty data-testid="vazio-da-consulta">
      <EmptyMedia>
        {houveConsulta ? (
          <Ornamento shape="busca-vazia" tom="info" tamanho={96} />
        ) : (
          <OrnamentoDoModulo tamanho={128} />
        )}
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{houveConsulta ? 'Nenhum registro encontrado' : 'Nenhum registro'}</EmptyTitle>
        <EmptyDescription>
          {q && temFiltro
            ? `A busca por “${q}” com os filtros aplicados não trouxe resultado. Confira o termo ou revise os filtros.`
            : q
              ? `A busca por “${q}” não trouxe resultado. Confira o termo ou limpe a busca.`
              : temFiltro
                ? 'Nenhum registro atende aos filtros aplicados. Revise as condições ou limpe os filtros.'
                : 'Ainda não há nada cadastrado aqui.'}
        </EmptyDescription>
      </EmptyHeader>
      {/* A saída acompanha o diagnóstico, e por isso são DUAS.
          Módulo vazio termina em cadastrar. Consulta vazia termina em DESFAZER
          a pergunta — oferecer `Incluir` aqui mandaria cadastrar de novo um
          registro que provavelmente existe, do lado de fora do termo digitado,
          e o cadastro duplicado só apareceria semanas depois. */}
      <EmptyContent>
        {houveConsulta ? (
          <Button variant="outline" size="sm" onClick={aoLimpar}>
            {q && temFiltro ? 'Limpar busca e filtros' : q ? 'Limpar busca' : 'Limpar filtros'}
          </Button>
        ) : acao ? (
          <Button size="sm" onClick={acao.onClick}>
            {acao.label}
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  )
}

/**
 * A BARRA DE SELEÇÃO (IndexTable, #198) — aparece ao marcar, some ao limpar.
 *
 * É a outra metade da linha clicável: se abrir o registro é o clique, marcar
 * precisa levar a algum lugar, e esse lugar não pode ser um botão que passa o
 * dia desabilitado no topo da tela. A barra existe SÓ quando há seleção, e diz
 * quantas linhas estão marcadas antes de oferecer qualquer ação — o número é o
 * que o operador confere antes de apertar algo destrutivo.
 *
 * ## Ação de UM registro com VÁRIAS linhas marcadas
 *
 * `Alterar` abre um cadastro; `Excluir` desativa um por vez, com confirmação
 * que nomeia o registro. Nenhuma das duas tem hoje uma versão em lote na
 * fronteira de dados — o contrato não publica escrita em lote e um laço de N
 * requisições no cliente falha pela metade sem ninguém saber quantas passaram.
 * Então elas ficam DESABILITADAS com mais de uma linha marcada, dizendo o
 * motivo. Prometer massa e agir na primeira linha seria a promessa errada no
 * botão mais caro da tela.
 */
function BarraDeSelecao<T>({
  quantidade,
  acoes,
  linhas,
  aoLimpar,
  saindo,
}: {
  quantidade: number
  acoes: readonly DataTableAction<T>[]
  linhas: readonly T[]
  aoLimpar: () => void
  /** A saída é mais rápida que a entrada (90ms contra 200ms, pesquisa §8). */
  saindo: boolean
}) {
  const varias = quantidade > 1
  return (
    // TINTA CHEIA, e é a única peça escura da listagem. A barra aparece por
    // cima da grade e some junto com a seleção: em papel claro, uma faixa
    // invertida é lida como modo — "a tela está em outro estado agora" —, que é
    // exatamente o que ela é. Fosse mais uma caixa clara, passaria por
    // cabeçalho e o operador agiria em lote achando que agia em uma.
    //
    // Na 2.0 ela FLUTUA (pesquisa §4): pílula de raio total, tinta a 92% com
    // desfoque atrás, sombra dura + a difusa que a solta do plano. Glass aqui
    // não é decoração — é o único lugar da listagem onde ele cabe pela regra
    // ("glass só no que flutua"), e o que ele comunica é que a barra está SOBRE
    // a grade, não dentro dela: por baixo continua a linha que o operador
    // marcou, meio visível, que é o que ele quer conferir antes de apertar
    // `Cancelar ordens`.
    <div
      data-slot="barra-de-selecao"
      className={cn(
        'flex flex-wrap items-center gap-2.5 rounded-[var(--r-pill)] py-2 pr-2.5 pl-3.5',
        'bg-[color-mix(in_oklab,var(--n-900)_92%,transparent)] backdrop-blur-[6px]',
        // A sombra dura é a do sistema (`--hard-3`, a de dialog e ⌘K); a difusa
        // por baixo é a §5 da pesquisa, e existe porque a pílula está no ar:
        // sem ela, a tinta chapada encostaria na grade como um adesivo.
        'shadow-[var(--hard-3),0_20px_40px_-16px_color-mix(in_oklab,var(--n-900)_55%,transparent)]',
        // Entrada de 200ms subindo — o `cab-rise` da fundação, que é
        // exatamente o `cab-pop` do mockup depois de a centragem sair do
        // `transform` e ir para o `flex` do ancoradouro. Um keyframe novo com
        // outro nome para o mesmo movimento seria a segunda fonte da mesma
        // decisão, e `tokens-2.0.css` é zona de D1 nesta rodada.
        saindo
          ? 'animate-[cab-fade_90ms_var(--ease)_reverse_both]'
          : 'animate-[cab-rise_var(--dur-2)_var(--ease-out)_both]',
      )}
    >
      {/* `<output>`: o número muda a cada checkbox e quem não vê a tela precisa
          ouvir o total, não o evento. O NÚMERO em mono, a palavra em Inter — é
          contagem, e contagem se compara.
          As classes `t-*` trazem a cor do degrau (tinta sobre papel); aqui o
          papel é a tinta, então a cor é sobrescrita com `!` — sem isso o texto
          sairia preto sobre preto conforme a ordem de carga do CSS. */}
      <output className="t-ui text-card!">
        <span className="t-dado text-card!">{quantidade}</span>{' '}
        {quantidade === 1 ? 'selecionada' : 'selecionadas'}
      </output>
      <div className="flex flex-wrap items-center gap-2">
        {acoes.map((acao) => {
          const morta = acao.disabled === true || varias
          return (
            <Button
              key={acao.id}
              variant="outline"
              size="sm"
              disabled={morta}
              // Botão de contorno sobre tinta: a borda e o texto viram cor de
              // papel, senão o `outline` desenharia traço preto sobre preto.
              // Sem `disabled:opacity-40`: o `Button` já carrega a receita
              // `desabilitado` (index.css), que apaga FUNDO e TRAÇO e devolve a
              // tinta do tema — opacidade no conteúdo é o que a regra proíbe, e
              // `ui/desabilitado.test.tsx` varre as fontes atrás disso.
              className="border-muted-foreground bg-transparent text-card! shadow-none hover:bg-muted-foreground/25"
              title={
                acao.disabled === true
                  ? acao.title
                  : varias
                    ? `${acao.label} age em um registro por vez — desmarque as outras linhas.`
                    : undefined
              }
              onClick={() => acao.onClick?.(linhas[0] ?? null)}
            >
              {acao.icon ? <acao.icon aria-hidden="true" /> : null}
              {acao.label}
            </Button>
          )
        })}
      </div>
      {/* A saída fica na PONTA, e diz a tecla que já funciona. `esc` limpando a
          seleção é o gesto que quem usa lista espera; anunciá-lo aqui é o que
          impede que ele seja atalho secreto — o botão continua existindo para
          quem usa o mouse. */}
      <button
        type="button"
        onClick={aoLimpar}
        className="ml-auto inline-flex items-center gap-2 rounded-item px-2 py-1 t-meta text-card/75! hover:text-card! focus-visible:focus-ring"
      >
        Limpar seleção
        {/* `bg-transparent!` — a regra global `kbd { background: var(--card) }`
            do `index.css` está FORA de camada e vence toda utility sem `!`. O
            resultado media na tela como uma tecla de papel branco sobre a
            pílula escura, com o texto (já sobrescrito para `--card`) invisível
            dentro dela. A cor tinha `!` desde sempre; o fundo, não — e o
            defeito só aparece na captura, porque o teste continua achando o
            `esc` pelo texto. */}
        <kbd className="rounded-item border border-muted-foreground bg-transparent! px-1 t-dado-meta text-card/75!">
          esc
        </kbd>
      </button>
    </div>
  )
}

export function VitraDataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = 'Busca pelo código:',
  busca = true,
  actions = [],
  pageSizeOptions = [10, 20, 50],
  rowNumbers = false,
  filtros: camposFiltraveis,
  modoDeFiltro = 'pilulas',
  consultaNoEndereco = false,
  visoes,
  agrupamentos,
  subtotalDoGrupo,
  decoracao,
  visaoInicial = VISAO_LISTA,
  entidade,
  aoAbrirLinha,
  acoesDeSelecao,
  acoesDeLinha,
  acaoDoVazio,
  aoEditarCelula,
}: VitraDataTableProps<T>) {
  /**
   * O ENDEREÇO É O PONTO DE PARTIDA da consulta (#199).
   *
   * Lido UMA vez, no primeiro render, e já dentro do estado inicial — semear
   * por efeito faria a listagem buscar a lista inteira, mandar o resultado para
   * a tela e só então refazer a consulta filtrada, com o operador vendo os dois.
   * Fora do modo (`consultaNoEndereco` desligado) devolve o vazio de sempre.
   */
  // `warn: false` porque a MESMA tabela também roda fora do router (janela de
  // busca, teste de componente): ali não há endereço, e avisar no console a
  // cada render seria ruído sobre um caso que é de projeto.
  const router = useRouter({ warn: false })
  const [daUrl] = useState(() =>
    consultaNoEndereco && router
      ? consultaDaUrl(
          router.state.location.search as Record<string, unknown>,
          camposFiltraveis ?? [],
        )
      : { q: '', filtros: [], juncao: 'and' as Juncao },
  )
  const [qInput, setQInput] = useState(daUrl.q)
  const [state, setState] = useState<TableQueryState>({
    q: daUrl.q,
    sort: null,
    page: 1,
    pageSize: pageSizeOptions[0] ?? 10,
    ...(daUrl.filtros.length > 0 ? { filtros: daUrl.filtros, juncao: daUrl.juncao } : {}),
  })
  /**
   * SELEÇÃO EM LISTA, não em linha única (#198): o checkbox marca várias, e a
   * barra de seleção diz quantas. `selected` continua existindo como "a
   * primeira marcada" porque a barra de AÇÕES antiga (janela de busca, funil)
   * age sobre uma linha só — quem tem uma tem a primeira.
   */
  const [selecionadas, setSelecionadas] = useState<readonly T[]>([])
  const selected = selecionadas[0] ?? null
  /** Modo IndexTable: a linha abre, o checkbox marca. Ver `aoAbrirLinha`. */
  const linhaAbre = aoAbrirLinha !== undefined
  const marcavel = (acoesDeSelecao?.length ?? 0) > 0

  function alternarLinha(linha: T) {
    setSelecionadas((atuais) =>
      atuais.includes(linha) ? atuais.filter((l) => l !== linha) : [...atuais, linha],
    )
  }

  /**
   * `esc` desfaz a seleção — e a barra de lote DIZ isso, em vez de escondê-lo.
   *
   * Não é atalho novo no sentido que o CLAUDE.md proíbe: a mesma saída existe
   * como botão na barra, e nenhum fluxo depende da tecla. É o gesto que quem
   * usa lista já tem no dedo, e o custo de não tê-lo é o operador com trinta
   * linhas marcadas por engano procurando onde desfazer.
   *
   * Só escuta enquanto HÁ seleção: fora disso a tecla é de quem estiver por
   * cima (dialog, popover), e um ouvinte permanente no documento roubaria o
   * `esc` de todos eles.
   */
  useEffect(() => {
    if (selecionadas.length === 0) return
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelecionadas([])
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [selecionadas.length])
  // Rascunho do filtro, como `qInput` é o rascunho da busca: o painel responde
  // à tecla na hora e só a frase COMPLETA vira consulta, depois do debounce.
  // Sem isso, cada letra digitada num valor viraria uma ida ao servidor.
  const [filtrosInput, setFiltrosInput] = useState<FiltroDaTabela[]>(daUrl.filtros)
  const [juncao, setJuncao] = useState<Juncao>(daUrl.juncao)
  // Colunas OPCIONAIS ligadas pelo seletor. Vazio = a grade que a tela declarou,
  // e é por isso que o estado nasce aqui e não na tela: quem monta a listagem
  // escolhe a identidade da linha, não o que o operador quer ver hoje.
  const [colunasExtras, setColunasExtras] = useState<string[]>([])
  /**
   * O que o operador ESCONDEU e em que ordem ele pôs o que sobrou.
   *
   * Estado de tela, como a densidade: não muda o que o servidor traz, muda o
   * que se lê. Nasce vazio — a grade que a tela declarou é a ordem certa até
   * alguém dizer o contrário —, e por isso `ordemDasColunas` fica `[]` em vez
   * de uma cópia dos ids: cópia envelheceria no dia em que a tela ganhasse uma
   * coluna, escondendo a nova atrás de uma ordem gravada antes dela existir.
   */
  const [colunasOcultas, setColunasOcultas] = useState<string[]>([])
  const [ordemDasColunas, setOrdemDasColunas] = useState<string[]>([])

  // A visão e o agrupamento não entram no `TableQueryState`: nenhum dos dois
  // muda o CONJUNTO de registros, só o desenho. Somá-los à chave de cache faria
  // alternar quadro ⇄ lista refazer uma consulta cuja resposta é a mesma.
  const [visaoId, setVisaoId] = useState(visaoInicial)
  const [densidade, setDensidade] = useState<Densidade>(DENSIDADE_PADRAO)
  // O `name` agrupa os rádios, e precisa ser único por INSTÂNCIA: duas
  // listagens na mesma página (a janela de busca sobre a tela) dividiriam o
  // grupo e uma desmarcaria a visão da outra.
  const grupoDeVisao = useId()
  const [agruparPor, setAgruparPor] = useState('')
  /**
   * A listagem NASCE SEM AGRUPAMENTO, e a D10 mudou isto de propósito.
   *
   * Antes o estado nascia no primeiro campo declarado, porque o único
   * consumidor era a visão que agrupa (o quadro do funil), e um quadro sem
   * campo não tem colunas. Agora a TABELA também responde a este estado, e
   * nascer agrupada partiria em faixas toda listagem que declarasse
   * `agrupamentos` — ninguém pediu, e a lista corrida é o que a maioria abre
   * para conferir.
   *
   * A visão continua vendo o que via: `agrupamentoDaVisao` cai no primeiro
   * campo quando o estado está vazio. É por isso que "sem agrupamento" é o
   * vazio e não uma opção `— Nenhum —`: para a tabela é um estado de verdade,
   * para o quadro não existe.
   */
  const agrupamentoDaVisao = agruparPor === '' ? (agrupamentos?.[0]?.id ?? '') : agruparPor
  /**
   * Campos que a TABELA sabe agrupar — os que declaram `valorDaLinha`.
   *
   * O quadro do funil declara `agrupamentos` desde os view modes e nenhum deles
   * lê a linha (quem lê é o quadro). Oferecer esses no chip mostraria `Agrupar:
   * Etapa` sobre uma tabela idêntica à de antes.
   */
  const camposAgrupaveis = useMemo(
    () => (agrupamentos ?? []).filter((opcao) => opcao.valorDaLinha !== undefined),
    [agrupamentos],
  )
  // Id desconhecido (favorito gravado antes de a visão ser renomeada) cai na
  // tabela em vez de derrubar a tela: a tabela responde a mesma pergunta.
  const visaoAtiva = visoes?.find((visao) => visao.id === visaoId) ?? null
  /**
   * O campo que a TABELA está agrupando agora — `null` quando não há.
   *
   * Depende da visão ativa: numa visão que não é a lista não existe faixa nem
   * subtotal para desenhar, e o mesmo estado passa a significar "coluna do
   * quadro". Um só estado para os dois desenhos é o que garante que alternar
   * lista ⇄ quadro não troque a pergunta no caminho.
   */
  const agrupamentoDaTabela =
    visaoAtiva === null ? (camposAgrupaveis.find((opcao) => opcao.id === agruparPor) ?? null) : null
  /**
   * O que o chip `Agrupar` da barra oferece AGORA.
   *
   * Depende do desenho ativo, e é a mesma razão do `agrupamentoDaTabela` acima:
   * na visão que agrupa quem lê a linha é ela (o quadro tem o mapa de etapas),
   * então valem todos os campos declarados; na TABELA vale só quem declara
   * `valorDaLinha`, porque é a tabela que vai ter de ler cada linha para montar
   * a faixa. Vazio = a barra não desenha o chip, que é o certo para uma
   * listagem sem nada agrupável.
   */
  const camposDoChip = visaoAtiva?.agrupa ? (agrupamentos ?? []) : camposAgrupaveis

  // Grupos COLAPSADOS, por valor. Lista de fechados (e não de abertos) porque o
  // estado natural é aberto: uma consulta nova nasce mostrando o que trouxe, e
  // guardar os abertos faria a próxima página chegar toda fechada.
  const [gruposFechados, setGruposFechados] = useState<readonly string[]>([])

  // Consultas favoritas: a identidade da tela vem do `queryKey`, que já é o nome
  // estável da listagem. `useState` com inicializador preguiçoso — ler o
  // armazenamento a cada render seria I/O síncrono por tecla digitada.
  const telaId = useMemo(() => idDaTela(queryKey), [queryKey])
  const [favoritos, setFavoritos] = useState<FavoritoDeConsulta[]>(() => lerFavoritos(telaId))

  // O aviso sai de UM lugar, e por efeito: a seleção se perde em seis pontos
  // diferentes (clique na linha, troca de página, busca, filtro, visão,
  // consulta favorita), e chamar o callback em cada um deles deixaria o
  // cabeçalho da página com uma linha que a tabela já esqueceu no dia em que
  // alguém acrescentasse o sétimo.
  // Toda mudança de estado de consulta limpa a seleção.
  function updateState(updater: (s: TableQueryState) => TableQueryState) {
    setSelecionadas([])
    setState(updater)
  }

  /**
   * UM debounce para busca e filtro, e a fusão é o que a busca com prefixo pede.
   *
   * `forn: stella` é meia busca e meio filtro: o que sobra depois de tirar os
   * prefixos vira `q`, e os pares reconhecidos viram condição. Com os dois
   * efeitos separados que existiam aqui, o de filtro sobrescreveria `s.filtros`
   * com os chips e apagaria o que a caixa acabou de montar — a lista voltaria
   * ao que era 300ms depois de o realce dizer que filtrou.
   *
   * Só os filtros VÁLIDOS viajam: chip recém-criado ainda sem valor não pode
   * esvaziar a listagem enquanto o operador escolhe o campo.
   */
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => {
        const daBusca = interpretarBusca(qInput, camposFiltraveis ?? [])
        // Normaliza DEPOIS de decidir o que já é frase completa: um CNPJ meio
        // digitado continua sendo filtro sem valor, e limpar a máscara antes
        // não muda isso.
        const dosChips = filtrosNormalizados(filtrosValidos(filtrosInput), camposFiltraveis ?? [])
        const validos = [...dosChips, ...daBusca.filtros]
        const mesmoFiltro =
          assinaturaDoFiltro(s.filtros, s.juncao ?? 'and') === assinaturaDoFiltro(validos, juncao)
        if (s.q === daBusca.q && mesmoFiltro) return s
        setSelecionadas([])
        return { ...s, q: daBusca.q, filtros: validos, juncao, page: 1 }
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [qInput, filtrosInput, juncao, camposFiltraveis])

  /**
   * O ENDEREÇO publica o que está NA CAIXA, não o que foi deduzido dela.
   *
   * Se a URL levasse o `q` já interpretado e o filtro do prefixo junto, abrir o
   * link devolveria a mesma consulta com outra cara: o texto sumiria da busca e
   * reapareceria como chip. O link tem de restaurar a TELA — e quem recebe
   * precisa poder editar o `forn:` que a outra pessoa digitou.
   */
  const [qNoEndereco, setQNoEndereco] = useState(daUrl.q)
  useEffect(() => {
    const t = setTimeout(() => setQNoEndereco(qInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [qInput])

  /** Aplica uma consulta salva: filtros, junção, ordenação, visão e agrupamento. */
  const aplicarConsulta = useCallback((favorito: FavoritoDeConsulta) => {
    const consulta = consultaDoFavorito(favorito)
    setFiltrosInput(consulta.filtros)
    setJuncao(consulta.juncao)
    setSelecionadas([])
    // Vazio = o favorito não fala de visão (foi gravado antes dos view modes).
    // Tratá-lo como "volte ao padrão" mudaria o desenho da tela sem ninguém ter
    // pedido, e o operador atribuiria o salto ao filtro que acabou de aplicar.
    if (consulta.visao) setVisaoId(consulta.visao)
    if (consulta.agruparPor) setAgruparPor(consulta.agruparPor)
    const gravada = densidadeLida(consulta.densidade)
    if (gravada) setDensidade(gravada)
    // A ordenação NÃO passa pelo debounce dos filtros: ela não é digitada, e
    // esperar 300ms por ela faria a tabela reordenar depois de já ter mudado.
    setState((s) => ({ ...s, sort: consulta.sort, page: 1 }))
  }, [])

  // O favorito PADRÃO abre a tela: é a consulta que se repete todo dia, e
  // obrigar dois cliques nela seria cobrar pelo caso mais frequente. Roda uma
  // vez por tela — `telaId` só muda quando a listagem muda.
  // **Endereço explícito VENCE o favorito padrão.** Um link com filtro dentro
  // foi escolhido agora, por alguém; o padrão foi escolhido uma vez, meses
  // atrás. Aplicar o padrão por cima faria o link colado no chat abrir noutra
  // consulta — e o defeito seria invisível para quem mandou o link.
  const veioDoEndereco = daUrl.q !== '' || daUrl.filtros.length > 0
  useEffect(() => {
    if (veioDoEndereco) return
    const padrao = favoritoPadrao(lerFavoritos(telaId))
    if (padrao) aplicarConsulta(padrao)
  }, [telaId, aplicarConsulta, veioDoEndereco])

  function atualizarFavoritos(proximos: FavoritoDeConsulta[]) {
    setFavoritos(proximos)
    gravarFavoritos(telaId, proximos)
  }

  /**
   * A aba `Todos`: a listagem crua de volta.
   *
   * Desfaz TUDO que a consulta salva sabe guardar — filtro, junção, ordenação,
   * visão, agrupamento e densidade —, e não só o filtro. Voltar para `Todos`
   * deixando o quadro agrupado no lugar mostraria a listagem inteira com o
   * desenho da pergunta anterior, e a aba acesa diria que não há pergunta.
   * A BUSCA fica: ela é texto livre, digitado à parte, e some no `×` do campo.
   */
  function limparConsulta() {
    setFiltrosInput([])
    setJuncao('and')
    setVisaoId(visaoInicial)
    setAgruparPor('')
    setDensidade(DENSIDADE_PADRAO)
    updateState((s) => ({ ...s, sort: null, page: 1 }))
  }

  /**
   * A saída do vazio de CONSULTA: desfaz a pergunta INTEIRA, busca inclusive.
   *
   * `limparConsulta` sozinha não serve aqui e a diferença é a razão de o botão
   * existir: ela é a aba `Todos`, que preserva a busca de propósito (texto
   * livre, digitado à parte, morre no `×` do campo). No vazio, quem clica está
   * dizendo "tire o que escondeu meus registros" — deixar o termo de pé
   * devolveria a MESMA caixa vazia, e o operador clicaria de novo.
   */
  function limparBuscaEFiltros() {
    setQInput('')
    limparConsulta()
  }

  /** O que está montado na tela AGORA, na forma que a consulta salva guarda. */
  const consultaAtual: ConsultaSalva = {
    filtros: filtrosValidos(filtrosInput),
    juncao,
    sort: state.sort,
    visao: visaoId,
    agruparPor,
    densidade,
  }
  const temConsulta =
    consultaAtual.filtros.length > 0 ||
    state.sort !== null ||
    visaoId !== visaoInicial ||
    agruparPor !== '' ||
    densidade !== DENSIDADE_PADRAO

  /**
   * A visão que desenha colunas pede o conjunto INTEIRO, não uma página.
   *
   * Uma coluna montada com a página 1 seria uma coluna FALSA: mostraria três
   * cartões numa etapa que tem trinta, e o total da coluna somaria só o que
   * coube na página. Paginar um quadro é oferecer o erro sem o sintoma — a
   * tela pareceria completa. Quando nem o teto do contrato basta, o rodapé diz
   * quantos ficaram de fora, em vez de cortar calado.
   */
  const estadoDaConsulta = useMemo(
    () => (visaoAtiva ? { ...state, page: 1, pageSize: PAGE_SIZE_MAX } : state),
    [state, visaoAtiva],
  )

  const query = useQuery({
    queryKey: [...queryKey, estadoDaConsulta],
    queryFn: () => fetcher(estadoDaConsulta),
    placeholderData: keepPreviousData,
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize))

  // A grade é o que a TELA declarou mais o que o operador ligou. A soma mora
  // aqui, e não na tela, para a coluna extra nascer com a mesma célula e a
  // mesma regra de ordenação em todas as oito listagens.
  const declaradas = useMemo(() => idsDeclarados(columns), [columns])
  const colunasDaTabela = useMemo(
    () =>
      entidade ? [...columns, ...colunasDaGrade<T>(entidade, colunasExtras, declaradas)] : columns,
    [columns, entidade, colunasExtras, declaradas],
  )

  const table = useReactTable({
    data: rows,
    columns: colunasDaTabela,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    // Visibilidade e ordem CONTROLADAS: quem guarda as duas é o estado acima,
    // porque as duas entram na consulta favorita e no que o menu mostra. Deixar
    // a tabela guardá-las internamente daria duas verdades sobre a mesma grade.
    state: {
      columnVisibility: Object.fromEntries(colunasOcultas.map((id) => [id, false])),
      ...(ordemDasColunas.length > 0 ? { columnOrder: ordemDasColunas } : {}),
    },
  })

  /**
   * As colunas como o menu as lê: rótulo, visível e a primeira travada.
   *
   * FIXA é a PRIMEIRA coluna da grade, e não uma marca no schema: é ela que
   * identifica a linha em todas as oito listagens (código, número, nome).
   * Esconder a primeira deixaria uma lista de datas e valores sem sujeito, e o
   * operador só perceberia depois de fechar o menu.
   *
   * O rótulo sai do `header` quando ele é texto. Cabeçalho montado por função
   * (ícone, seta, tooltip) não tem string para copiar, e o id — que é o nome
   * que viaja para o servidor — é o que resta de honesto: inventar um rótulo
   * bonito aqui daria dois nomes para a mesma coluna.
   */
  // Sem `useMemo`: o que muda entre um render e outro é a RESPOSTA de
  // `getIsVisible()`, não a identidade da tabela — memoizar por `table` daria
  // uma lista congelada, e listar as duas variáveis de estado como dependência
  // é o mesmo cálculo com uma comparação a mais. São dez colunas.
  const colunasDoMenu = table.getAllLeafColumns().map((coluna, indice) => ({
    id: coluna.id,
    rotulo: typeof coluna.columnDef.header === 'string' ? coluna.columnDef.header : coluna.id,
    visivel: coluna.getIsVisible(),
    ...(indice === 0 ? { fixa: true } : {}),
  }))

  /**
   * O filtro que NÃO é o chip — os dois modos alternativos da barra.
   *
   * O modo por módulo (#104) troca a faixa de chips por uma faixa agrupada pelo
   * módulo de origem; o modo em lista é o query-builder em popover. Os dois
   * reusam o MESMO `filtrosInput`, então debounce, consulta salva e a recusa na
   * fronteira continuam valendo de graça — a diferença é só como o operador
   * monta a pergunta.
   */
  const temCamposFiltraveis = camposFiltraveis !== undefined && camposFiltraveis.length > 0
  const filtroProprio =
    !temCamposFiltraveis || !camposFiltraveis ? null : modoDeFiltro === 'modulo' && entidade ? (
      <FiltroPorModulo entidade={entidade} filtros={filtrosInput} onChange={setFiltrosInput} />
    ) : modoDeFiltro === 'lista' ? (
      <ListaDeFiltros
        campos={camposFiltraveis}
        filtros={filtrosInput}
        juncao={juncao}
        onFiltrosChange={setFiltrosInput}
        onJuncaoChange={setJuncao}
      />
    ) : null

  /**
   * O repertório do módulo MENOS o que a grade já desenha.
   *
   * Sem o corte, a mesma coluna aparecia duas vezes no popover — uma em
   * `Na grade` e outra na oferta do módulo —, com dois checkboxes respondendo a
   * coisas diferentes: um esconde, o outro desliga.
   */
  const opcionaisForaDaGrade = useMemo(() => {
    if (!entidade) return []
    const naGrade = new Set(colunasDoMenu.map((coluna) => coluna.id))
    return gruposDoModulo(entidade, colunasExtras, declaradas)
      .map((grupo) => ({
        ...grupo,
        colunas: grupo.colunas.filter((coluna) => !naGrade.has(coluna.id)),
      }))
      .filter((grupo) => grupo.colunas.length > 0)
  }, [entidade, colunasExtras, declaradas, colunasDoMenu])

  /**
   * Desmarcar uma coluna: a que veio do módulo DESLIGA, a que a tela declarou
   * ESCONDE.
   *
   * São duas coisas diferentes com o mesmo gesto, e é assim que tem de ser: uma
   * coluna extra desmarcada volta a ser oferta (e reaparece no grupo de onde
   * veio); uma coluna da tela desmarcada continua existindo, só não é mostrada
   * — e é ela que o rótulo conta como oculta.
   */
  function alternarColuna(id: string) {
    if (colunasExtras.includes(id)) {
      setColunasExtras((atuais) => atuais.filter((x) => x !== id))
      return
    }
    setColunasOcultas((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
    )
  }

  /**
   * A ordenação como a barra a lê — o resumo do que o cabeçalho já mostra.
   *
   * Sai das colunas do menu, e não de uma tabela própria de rótulos: o `sort.id`
   * é o nome que viaja para o servidor (em inglês nos recursos HTTP), e mostrá-lo
   * cru na barra poria `expectedAt` onde a grade escreve `Previsão`.
   */
  const ordenacaoDaBarra = state.sort
    ? {
        rotulo:
          colunasDoMenu.find((coluna) => coluna.id === state.sort?.id)?.rotulo ?? state.sort.id,
        desc: state.sort.desc,
      }
    : null

  /**
   * As ações de linha, com `Abrir` na frente quando a tela abre registro.
   *
   * Derivada, e não pedida à tela: toda listagem que abre tem a mesma ação com
   * o mesmo rótulo, e declará-la em oito lugares é oito chances de divergir. A
   * tela acrescenta o que é dela (imprimir, duplicar, ···).
   */
  const acoesDaLinha = useMemo<readonly AcaoDeLinha<T>[]>(() => {
    const abrir: AcaoDeLinha<T>[] = aoAbrirLinha
      ? [{ id: 'abrir', label: 'Abrir', icon: ChevronRight, onClick: aoAbrirLinha }]
      : []
    return [...abrir, ...(acoesDeLinha ?? [])]
  }, [aoAbrirLinha, acoesDeLinha])
  const temAcoesDeLinha = acoesDaLinha.length > 0

  /**
   * A planilha usa a MESMA célula da compacta (40px, sem subtítulo): a unidade
   * ali é a célula, e o subtítulo dentro dela sujaria o `⌘C`.
   */
  const planilha = densidade === 'planilha'
  const compacta = densidade === 'compacta' || planilha

  /**
   * O `<table>` — dois donos, um ref.
   *
   * O modo Planilha o usa para achar a célula de destino e focá-la; o FLIP, para
   * medir onde cada linha estava. Dois refs no mesmo elemento seriam duas
   * fontes para a mesma pergunta ("qual é a grade?").
   */
  const refDaTabela = useRef<HTMLTableElement | null>(null)

  /**
   * Colunas que desenham o próprio conteúdo — as que o TIPO não sobrescreve.
   *
   * Medido AQUI e não na hora de desenhar a célula: o TanStack completa toda
   * coluna com um `cell` padrão no `useReactTable`, então perguntar à coluna
   * montada se ela declarou `cell` responde "sim" para todas, e o tipo nunca
   * desenharia nada. A pergunta só tem resposta antes do merge.
   */
  const comCelulaPropria = useMemo(() => {
    const ids = new Set<string>()
    for (const coluna of colunasDaTabela) {
      if (coluna.cell === undefined) continue
      const id = coluna.id ?? ('accessorKey' in coluna ? String(coluna.accessorKey) : undefined)
      if (id) ids.add(id)
    }
    return ids
  }, [colunasDaTabela])

  /**
   * A SOMA da coluna de dinheiro, no rodapé, ao lado da contagem.
   *
   * Sai da coluna que declarou `tipo: 'dinheiro'` — perguntar à tela por uma
   * prop `somar` repetiria em cada listagem o que a coluna já diz. Soma o que
   * está NA TELA, e o rótulo muda conforme isso: com paginação é a soma da
   * PÁGINA, e chamá-la de "soma filtrada" seria afirmar sobre registros que
   * esta consulta nem trouxe. Duas páginas somando errado no relatório de
   * alguém começa exatamente assim.
   */
  const colunaDeDinheiro = colunasDaTabela.find((c) => c.meta?.tipo === 'dinheiro')
  const soma = useMemo(() => {
    if (!colunaDeDinheiro) return null
    const chave = (colunaDeDinheiro as { accessorKey?: string }).accessorKey
    if (!chave) return null
    let total = 0
    for (const linha of rows) {
      const valor = (linha as Record<string, unknown>)[chave]
      if (typeof valor === 'number') total += valor
    }
    return total
  }, [colunaDeDinheiro, rows])

  // Folha total de colunas (grupos contam as folhas) + as colunas de serviço.
  const totalColSpan =
    table.getAllLeafColumns().length +
    (rowNumbers ? 1 : 0) +
    (marcavel ? 1 : 0) +
    (temAcoesDeLinha ? 1 : 0)

  /**
   * Uma linha da tabela — a MESMA em lista corrida e dentro de faixa de grupo.
   *
   * Extraída porque o agrupamento não muda NADA na linha: mesmo gesto de
   * seleção, mesma numeração global, mesmas ações de linha, mesma decoração.
   * Duas cópias divergiriam na primeira mudança de comportamento, e a que
   * fica dentro do grupo é a que ninguém lembraria de atualizar.
   */
  function renderLinha(row: Row<T>, linhaVisual: number) {
    const isSelected = selecionadas.includes(row.original)
    const tomDaLinha = decoracao?.(row.original)
    /**
     * Linha CONCLUÍDA ou CANCELADA fica apagada, e quem sabe
     * disso é a coluna de situação — não uma prop que cada tela
     * teria de passar certo. Recebida e cancelada continuam
     * legíveis e param de disputar o olho com as que ainda pedem
     * alguma coisa, que é o trabalho de quem abre a listagem.
     */
    const apagada = row
      .getVisibleCells()
      .some(
        (cell) =>
          cell.column.columnDef.meta?.tipo === 'status' &&
          (tomDoValor(cell.getValue()) === 'done' || tomDoValor(cell.getValue()) === 'void'),
      )
    return (
      // Seleção = `--primary-soft` com FAIXA de 3px em chartreuse
      // na borda esquerda (mockup 2.0, supersede o violeta cheio
      // da 1.x). O fundo cheio de cor de ação lavava o dado da
      // linha justo quando o operador confere o que marcou; a
      // faixa é o sinal, o tint é o estado, e o texto continua
      // sendo o texto. Chartreuse aqui é ÁREA, nunca letra.
      <TableRow
        key={row.id}
        // O id da linha é a IDENTIDADE que o FLIP usa para saber que a
        // linha que estava em cima é a mesma que agora está embaixo.
        // Medir por posição inverteria o sentido do deslize.
        data-linha-id={row.id}
        data-state={isSelected ? 'selected' : undefined}
        // A linha é parada de FOCO nos dois modos, e o que ela faz
        // muda com o gesto da tela: onde a linha abre (#198), Enter
        // abre e o Espaço marca — o mesmo par que qualquer lista de
        // aplicativo tem; onde a linha marca (janela de busca), os
        // dois marcam, como era. Não é atalho: é o teclado nativo do
        // controle, e nenhuma tecla precisa ser memorizada.
        //
        // No modo PLANILHA a parada sai da linha e vai para a célula
        // ativa: com as duas, um Tab pousaria na linha e o seguinte na
        // célula, e o operador andaria metade dos passos sem sair do
        // lugar.
        tabIndex={planilha ? -1 : 0}
        aria-selected={isSelected}
        data-apagada={apagada ? '' : undefined}
        className={cn(
          // O anel de foco é de LINHA, montado nas células: sob
          // `border-collapse` o `<tr>` não pinta box-shadow, e um
          // anel por célula viraria uma moldura por coluna.
          // `group/linha` é o que faz as ações aparecerem no hover
          // E no foco de teclado — nomeado, porque a célula tem
          // grupos próprios e um `group` anônimo casaria com o de
          // dentro.
          'group/linha cursor-pointer outline-none hover:bg-surface-sunken focus-visible:focus-ring-row',
          // Seleção não depende só de cor: o tint, a faixa e o
          // `aria-selected` dizem a mesma coisa por três canais.
          // DECORAÇÃO (D10): a linha atrasada se anuncia sem ninguém
          // abrir filtro. Cede à SELEÇÃO — as duas desenham faixa na
          // mesma `box-shadow` da primeira célula, e a marcada é sobre
          // o que as ações da barra vão agir agora; deixar a decoração
          // por cima esconderia o que o operador acabou de marcar.
          !isSelected && tomDaLinha !== undefined && DECORACAO_DA_LINHA[tomDaLinha],
          isSelected &&
            '[&>td]:bg-[var(--primary-soft,hsl(var(--muted)))] [&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
          // Concluída/cancelada: texto em `n-500`. A linha
          // continua ali, conferível, e para de puxar o olho.
          //
          // Cede à `decoracao` da tela (D10) quando ela fala: o derivado
          // lê a COLUNA de situação, a prop lê o REGISTRO, e só a tela
          // sabe que uma ordem confirmada e vencida ainda cobra alguma
          // coisa. Deixar os dois valerem apagaria justamente a linha
          // que a tela mandou destacar.
          apagada && tomDaLinha === undefined && 'text-muted-foreground',
        )}
        // No modo PLANILHA a linha para de responder a clique e a tecla,
        // e a razão é a mesma que faz o modo existir: ali a unidade é a
        // CÉLULA. Clicar numa célula posiciona o cursor de onde a próxima
        // seta parte — abrir o registro junto tiraria da tela quem só
        // estava mirando de onde ia copiar. E o Enter que a célula trata
        // (editar, ou abrir) chegaria aqui de novo pela propagação,
        // abrindo o mesmo registro duas vezes.
        onClick={() => {
          if (planilha) return
          if (linhaAbre) aoAbrirLinha(row.original)
          else alternarLinha(row.original)
        }}
        onKeyDown={(e) => {
          if (planilha) return
          if (e.key !== 'Enter' && e.key !== ' ') return
          // Espaço rolaria a página; Enter dentro de célula com
          // controle não deve chegar aqui duas vezes.
          e.preventDefault()
          if (linhaAbre && e.key === 'Enter') aoAbrirLinha(row.original)
          else alternarLinha(row.original)
        }}
      >
        {marcavel ? (
          // A célula do checkbox NÃO propaga o clique: mirar o
          // quadradinho é dizer "marque esta", e abrir o registro
          // junto tiraria da tela quem só queria montar a seleção.
          // MEDIDO: hoje a barreira é redundante — o sistema de
          // press do react-aria já não propaga, e tirar estas duas
          // linhas não derruba o teste. Ficam como guarda do dia em
          // que o checkbox virar `<input>` nativo, que propaga: o
          // sintoma seria a tela abrindo o registro no meio da
          // montagem da seleção, e o teste que o pega é o de
          // comportamento acima, não este arquivo.
          <TableCell
            className="w-10"
            onClick={(e) => e.stopPropagation()}
            // Barra só as teclas que a LINHA trata. Barrar tudo
            // custou caro: o React chama `stopPropagation` no
            // evento NATIVO, e o ouvinte do `esc` vive no
            // document — a saída da barra de lote morria calada
            // sempre que o foco estivesse no checkbox, que é
            // justamente onde ele está depois de marcar.
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
            }}
          >
            <Checkbox
              isSelected={isSelected}
              onChange={() => alternarLinha(row.original)}
              aria-label={`Marcar linha ${(state.page - 1) * state.pageSize + row.index + 1}`}
            />
          </TableCell>
        ) : null}
        {rowNumbers ? (
          // Numeração em Meta, sequencial global da consulta.
          <TableCell className="w-10 text-right t-dado-meta">
            {(state.page - 1) * state.pageSize + row.index + 1}
          </TableCell>
        ) : null}
        {row.getVisibleCells().map((cell, indiceDaColuna) => {
          const tipo = cell.column.columnDef.meta?.tipo
          // Coluna que declara `cell` próprio manda no CONTEÚDO;
          // o tipo só lhe dá a moldura. É o caso que existe hoje
          // em oito telas — célula que já formata e só quer
          // alinhar como as irmãs —, e reescrever o conteúdo dela
          // aqui apagaria formatação que a tela escolheu.
          const proprio = comCelulaPropria.has(cell.column.id)
          const celula = { linha: linhaVisual, coluna: indiceDaColuna }
          const valor = cell.getValue()
          /**
           * O `title` é o texto INTEIRO da célula truncada — a
           * outra metade da regra da §Hierarquia ("trunca com `…` +
           * tooltip, nunca quebra em 3 linhas"). Só onde o valor É
           * texto: pendurar `[object Object]` no `title` de uma
           * célula de progresso seria pior que não ter dica.
           */
          const textoDoValor = typeof valor === 'string' && valor !== '' ? valor : undefined
          return (
            <TableCell
              key={cell.id}
              data-tipo={tipo}
              {...(textoDoValor ? { title: textoDoValor } : {})}
              {...(planilha ? modoPlanilha.propsDaCelula(celula) : {})}
              className={cn(
                cell.column.columnDef.meta?.numeric === true && 'text-right tabular-nums',
                classeDoTipo(tipo),
                // `table-layout: fixed` dá a largura; a truncagem é o
                // que impede o texto longo de atravessar a coluna
                // vizinha, que é o que a largura fixa faria sozinha.
                // Os tipos COMPOSTOS ficam de fora: entidade,
                // progresso e situação montam layout próprio dentro da
                // célula, e `white-space: nowrap` herdado ali cortaria
                // o subtítulo em vez de truncá-lo.
                ehTipoComposto(tipo) ? 'overflow-hidden' : 'truncate',
                planilha && 'celula-de-planilha',
              )}
            >
              {modoPlanilha.editorAberto(celula) ? (
                <EditorDaCelula
                  valorInicial={textoDoValor ?? String(valor ?? '')}
                  rotulo={`${cell.column.id}, linha ${linhaVisual + 1}`}
                  aoConfirmar={modoPlanilha.confirmarEdicao}
                  aoCancelar={modoPlanilha.cancelarEdicao}
                />
              ) : tipo && !proprio ? (
                renderTipo(tipo, valor, { compacta })
              ) : (
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
            </TableCell>
          )
        })}
        {temAcoesDeLinha ? (
          // As ações não propagam o clique da linha (o botão
          // barra), mas a CÉLULA também não: sobrar 20px de
          // padding clicável que abre o registro, ao lado de três
          // botões que fazem outra coisa, é alvo traiçoeiro.
          <TableCell
            className="w-[90px]"
            onClick={(e) => e.stopPropagation()}
            // Mesma regra da célula do checkbox: só as teclas da
            // linha. `esc` tem de chegar ao document.
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
            }}
          >
            <AcoesDeLinha acoes={acoesDaLinha} linha={row.original} />
          </TableCell>
        ) : null}
      </TableRow>
    )
  }
  /**
   * As faixas da tabela. Agrupa as LINHAS do TanStack (e não os dados crus)
   * porque é a `Row` que sabe desenhar célula, seleção, numeração e ações —
   * descer para `T` e voltar obrigaria a procurar cada linha de novo pelo dado.
   */
  const gruposDaTabela = useMemo(() => {
    if (!agrupamentoDaTabela?.valorDaLinha) return []
    const valorDaLinha = agrupamentoDaTabela.valorDaLinha
    return agruparLinhas(
      table.getRowModel().rows,
      (row) => valorDaLinha(row.original),
      subtotalDoGrupo ? (row) => subtotalDoGrupo(row.original) : undefined,
    )
  }, [agrupamentoDaTabela, subtotalDoGrupo, table])

  /**
   * As linhas na ORDEM DA TELA — a coordenada do modo Planilha.
   *
   * Com agrupamento ligado, a ordem é a das faixas, e grupo FECHADO não entra:
   * a seta para baixo tem de andar pelo que está à vista. Derivar isto de
   * `getRowModel().rows` (que ignora grupo e colapso) faria o foco cair dentro
   * de um grupo fechado e sumir da tela sem nada explicar — o operador só veria
   * o anel desaparecer.
   */
  const linhasVisiveis = agrupamentoDaTabela
    ? gruposDaTabela.flatMap((grupo) => (gruposFechados.includes(grupo.valor) ? [] : grupo.linhas))
    : table.getRowModel().rows

  /**
   * Sem `useMemo`, e MEDIDO: `table` é a mesma instância entre renders, então
   * um memo com ela na lista de dependências devolveria a lista da PRIMEIRA
   * render — a vazia, de antes de a consulta responder. O sintoma era todo
   * `data-celula` nascer `0:c`, dez linhas disputando o mesmo endereço, e a
   * seta para baixo não saindo do lugar. Numerar vinte linhas por render é
   * mais barato que a comparação que estaria errada.
   */
  const indiceVisual = new Map(linhasVisiveis.map((row, indice) => [row.id, indice]))

  /** As colunas de DADO, na ordem em que a linha as desenha. */
  const colunasDeDado = table.getVisibleLeafColumns()

  const modoPlanilha = useModoPlanilha({
    raiz: refDaTabela,
    ativo: planilha,
    linhas: linhasVisiveis.length,
    colunas: colunasDeDado.length,
    // A coluna PODE editar e a tela SABE gravar: as duas, ou Enter abre o
    // registro. Ver `aoEditarCelula`.
    editavel: (coluna) =>
      aoEditarCelula !== undefined && colunasDeDado[coluna]?.columnDef.meta?.editavel === true,
    aoAbrir: (linha) => {
      const row = linhasVisiveis[linha]
      if (row && aoAbrirLinha) aoAbrirLinha(row.original)
    },
    aoGravar: (celula, valor) => {
      const row = linhasVisiveis[celula.linha]
      const coluna = colunasDeDado[celula.coluna]
      if (row && coluna) aoEditarCelula?.(row.original, coluna.id, valor)
    },
  })

  /**
   * O que AUTORIZA o deslize das linhas (FLIP): agrupamento, ordenação e
   * colapso de grupo — os três gestos que movem uma linha para outro lugar sem
   * mudar o conjunto.
   *
   * A página NÃO entra: trocar de página troca as linhas, e animar a chegada de
   * vinte registros novos como se fossem os mesmos vinte de antes deslizando é
   * mentira visual. Ali o que muda é o conteúdo, e o esqueleto já conta isso.
   */
  const ordemDasLinhas = `${agruparPor}|${state.sort?.id ?? ''}|${state.sort?.desc ? 'desc' : 'asc'}|${gruposFechados.join(',')}`
  useFlipDasLinhas(refDaTabela, ordemDasLinhas)

  const temFiltro = (state.filtros?.length ?? 0) > 0
  // "Todas" é sempre "todas as DESTA PÁGINA" — ver o rótulo do checkbox do
  // cabeçalho.
  const algumaMarcada = selecionadas.length > 0
  const todasMarcadas = rows.length > 0 && selecionadas.length === rows.length

  /**
   * A barra de lote SAI, e sair leva 90ms — menos que os 200 de entrar
   * (pesquisa §8: "a saída também anima, e mais rápido que a entrada").
   *
   * Uma peça que aparece com movimento e desaparece num corte parece ter sido
   * fechada por um erro. O contrário — saída lenta — atrasa a tela depois de o
   * operador já ter decidido.
   *
   * A quantidade fica CONGELADA durante a saída: a seleção já é zero nesses
   * 90ms, e mostrar "0 selecionadas" enquanto a barra desliza para fora seria
   * um número errado no lugar onde o operador confere quantas linhas vão ser
   * afetadas.
   */
  const [barraSaindo, setBarraSaindo] = useState(false)
  const tinhaSelecao = useRef(false)
  const ultimaQuantidade = useRef(0)
  useEffect(() => {
    if (algumaMarcada) {
      tinhaSelecao.current = true
      ultimaQuantidade.current = selecionadas.length
      setBarraSaindo(false)
      return
    }
    if (!tinhaSelecao.current) return
    tinhaSelecao.current = false
    setBarraSaindo(true)
    const fim = setTimeout(() => setBarraSaindo(false), 90)
    return () => clearTimeout(fim)
  }, [algumaMarcada, selecionadas.length])

  function toggleSort(columnId: string) {
    updateState((s) => {
      const next: TableSort | null =
        s.sort?.id !== columnId
          ? { id: columnId, desc: false }
          : s.sort.desc
            ? null
            : { id: columnId, desc: true }
      return { ...s, sort: next, page: 1 }
    })
  }

  return (
    // O PAINEL da listagem (mockup, aba Listagem): UMA caixa de tinta com sombra
    // dura, e dentro dela as zonas — visões (tint do módulo), barra de filtro,
    // grade, rodapé — separadas por régua n-300. Decisão do user (2026-09-04):
    // "não enxergo as divisões"; a caixa era n-300 sobre n-300 e sumia.
    <div
      data-slot="painel-da-listagem"
      className="flex flex-col overflow-clip rounded-panel border-[1.5px] border-[var(--n-900)] bg-card shadow-[var(--hard-2)]"
    >
      {/* Não desenha nada: só mantém o endereço contando a mesma história que a
          barra. Fica sob `consultaNoEndereco` porque a janela de busca monta a
          MESMA tabela sobre a tela de trás. */}
      {consultaNoEndereco ? (
        <SincroniaComAUrl q={qNoEndereco} filtros={filtrosValidos(filtrosInput)} juncao={juncao} />
      ) : null}

      {/* As consultas salvas ficam ACIMA da barra, e não dentro dela: a barra
          responde "que pergunta estou montando", a tira responde "que perguntas
          esta tela já tem prontas". Empilhá-las no mesmo popover foi o que
          manteve a #92 a dois cliques de distância de quem precisava dela. */}
      {camposFiltraveis && camposFiltraveis.length > 0 ? (
        <AbasDeConsulta
          favoritos={favoritos}
          atual={consultaAtual}
          temConsulta={temConsulta}
          onAplicar={aplicarConsulta}
          onLimpar={limparConsulta}
          onSalvar={(nome) =>
            atualizarFavoritos([
              ...favoritos,
              {
                id: novoFavoritoId(),
                nome,
                filtros: consultaAtual.filtros,
                juncao,
                sort: state.sort,
                visao: visaoId,
                agruparPor,
                densidade,
                padrao: false,
              },
            ])
          }
          onRenomear={(id, nome) =>
            atualizarFavoritos(favoritos.map((f) => (f.id === id ? { ...f, nome } : f)))
          }
          onExcluir={(id) => atualizarFavoritos(favoritos.filter((f) => f.id !== id))}
          onTornarPadrao={(id) => atualizarFavoritos(comPadrao(favoritos, id))}
        />
      ) : null}

      <BarraDeFiltros
        busca={busca}
        textoDaBusca={qInput}
        onBuscaChange={setQInput}
        placeholderDaBusca={searchPlaceholder}
        {...(camposFiltraveis && camposFiltraveis.length > 0 ? { campos: camposFiltraveis } : {})}
        filtros={filtrosInput}
        juncao={juncao}
        onFiltrosChange={setFiltrosInput}
        onJuncaoChange={setJuncao}
        {...(filtroProprio ? { filtrosSlot: filtroProprio } : {})}
        // O chip `Agrupar` serve DOIS desenhos com um estado só (D10): na
        // visão que agrupa ele escolhe a COLUNA do quadro; na tabela, a FAIXA
        // — e é por serem o mesmo estado que alternar lista ⇄ quadro não troca
        // a pergunta no caminho. Quais campos entram, ver `camposDoChip`.
        {...(camposDoChip.length > 0
          ? {
              agrupamentos: camposDoChip,
              // O VALOR mostrado é o efetivo de cada desenho, e os dois não são
              // o mesmo: a tabela usa o estado cru (vazio = lista corrida, que
              // é como toda listagem abre), a visão que agrupa usa
              // `agrupamentoDaVisao`, que cai no primeiro campo — um quadro sem
              // campo não tem colunas, e o chip diria `Agrupar` sobre um quadro
              // já partido por Etapa.
              agruparPor: visaoAtiva?.agrupa ? agrupamentoDaVisao : agruparPor,
              onAgruparPorChange: (id: string) => {
                setAgruparPor(id)
                // Colapso é por VALOR do grupo, e trocar de campo troca os
                // valores: guardar a lista faria "Cancelado" fechado em
                // Situação reaparecer fechado num campo que nem tem esse valor
                // no dia em que os dois coincidissem.
                setGruposFechados([])
              },
            }
          : {})}
        ordenacao={ordenacaoDaBarra}
        onInverterOrdenacao={() =>
          updateState((s) =>
            s.sort ? { ...s, sort: { ...s.sort, desc: !s.sort.desc }, page: 1 } : s,
          )
        }
        onLimparOrdenacao={() => updateState((s) => ({ ...s, sort: null, page: 1 }))}
        colunas={colunasDoMenu}
        onAlternarColuna={alternarColuna}
        onReordenarColunas={setOrdemDasColunas}
        {...(entidade
          ? {
              colunasOpcionais: opcionaisForaDaGrade,
              onAlternarColunaOpcional: (id: string) =>
                setColunasExtras((atuais) =>
                  atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
                ),
            }
          : {})}
        {...(visaoAtiva
          ? {}
          : {
              densidades: DENSIDADES,
              densidade,
              onDensidadeChange: (id: string) => {
                const lida = densidadeLida(id)
                if (lida) setDensidade(lida)
              },
              // A dica só existe na PLANILHA, e some nas outras duas: uma
              // legenda de teclas parada na barra o dia inteiro vira parte do
              // cenário, e ninguém a lê no dia em que ela passa a valer.
              ...(planilha ? { dica: DICA_DA_PLANILHA } : {}),
            })}
        acoes={actions.map((action) => {
          // O filtro estruturado OCUPA o lugar do botão `Filtro` da barra
          // padrão (§9, padrão 4) em vez de somar um botão ao lado: a barra
          // tem a mesma ordem em oito telas, e dois caminhos para "filtrar"
          // lado a lado fariam o operador escolher qual dos dois é o de
          // verdade. Na barra 2.0 quem ocupa esse lugar são os chips, que
          // já estão montados acima — então o botão simplesmente sai.
          if (action.id === 'filtro' && camposFiltraveis && camposFiltraveis.length > 0) {
            return null
          }
          return (
            <Button
              key={action.id}
              variant={action.variant ?? 'outline'}
              size="sm"
              disabled={
                action.disabled === true || (action.needsSelection === true && selected === null)
              }
              title={
                // Ação de linha numa visão sem linha: o botão já ficava
                // desabilitado (nada selecionado) e MUDO, e um botão morto
                // sem motivo é lido como defeito. Aqui o motivo é o desenho
                // da tela, não a falta de um clique.
                action.needsSelection === true && visaoAtiva
                  ? `Só na visão Lista: ${visaoAtiva.rotulo} não tem linha para selecionar.`
                  : action.title
              }
              onClick={() => action.onClick?.(action.needsSelection ? selected : null)}
            >
              {action.icon ? <action.icon aria-hidden="true" className="text-modulo" /> : null}
              {action.label}
            </Button>
          )
        })}
        {...(visoes && visoes.length > 0
          ? {
              modos: (
                /* RÁDIO DE VERDADE, com pele de botão. As visões são
                   exclusivas, e o rádio nativo dá de graça o que um grupo de
                   botões pediria à mão: andar entre as opções com as setas, uma
                   única parada de Tab para o grupo inteiro e o estado dito a
                   quem ouve. O `<input>` fica em `sr-only` e o foco aparece no
                   rótulo, senão o anel ficaria num controle invisível. */
                <fieldset className="flex items-center gap-1">
                  <legend className="sr-only">Visão da listagem</legend>
                  {[{ id: VISAO_LISTA, rotulo: 'Lista', icon: Rows3 }, ...visoes].map((visao) => {
                    const ativa = visao.id === visaoId
                    return (
                      <label
                        key={visao.id}
                        className={cn(
                          buttonVariants({ variant: ativa ? 'default' : 'outline', size: 'sm' }),
                          'cursor-pointer has-[:focus-visible]:focus-ring',
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={grupoDeVisao}
                          value={visao.id}
                          checked={ativa}
                          onChange={() => {
                            // A seleção é da TABELA; ao sair dela não há linha
                            // marcada, e voltar com a seleção velha apontaria
                            // para uma linha que a consulta pode nem ter
                            // trazido de novo.
                            setSelecionadas([])
                            setVisaoId(visao.id)
                          }}
                        />
                        {visao.icon ? <visao.icon aria-hidden="true" /> : null}
                        {visao.rotulo}
                      </label>
                    )
                  })}
                </fieldset>
              ),
            }
          : {})}
      />

      {visaoAtiva ? (
        // A visão troca só o DESENHO. Carregando, falha e vazio continuam sendo
        // os mesmos três estados da mesma consulta — e são desenhados pelas
        // mesmas peças, porque um quadro que fica em branco onde a tabela
        // explicaria faria o operador achar que o funil está vazio.
        <div data-slot="visao" data-visao={visaoAtiva.id}>
          {query.isPending ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
              {SKELETON_ROWS.map((chave) => (
                <Skeleton key={chave} className="h-64 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="bg-card py-10">
              <FalhaDaConsulta erro={query.error} aoTentar={() => query.refetch()} />
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-card py-10">
              <VazioDaConsulta
                q={state.q}
                temFiltro={temFiltro}
                acao={acaoDoVazio}
                aoLimpar={limparBuscaEFiltros}
              />
            </div>
          ) : (
            visaoAtiva.render({ rows, agruparPor: agrupamentoDaVisao })
          )}
        </div>
      ) : (
        /* Caixa de DADO: UM traço fino em `n-300` e a sombra quieta — a
          listagem é o objeto sobre o plano, e por isso a moldura aparece uma
          vez, aqui. Enquanto a borda era 2px de tinta e cada linha também, a
          tela tinha vinte caixas empilhadas e nenhuma hierarquia entre elas
          (§Separação: card por fora, hairline por dentro).
          O recorte continua: sem ele, o canto arredondado do contêiner
          apareceria por baixo do cabeçalho quadrado da primeira fileira.
          `overflow-clip` e NÃO `overflow-hidden`, e a diferença é medida:
           `hidden` cria um scroll container, e `position: sticky` se prende ao
           scrollport mais próximo — o cabeçalho ficaria "fixo" dentro de uma
           caixa que não rola, ou seja, parado. `clip` recorta igual e não cria
           scrollport, então a fixação passa a valer contra a rolagem da PÁGINA,
           que é onde a listagem rola de verdade. */
        <div data-slot="grade" data-densidade={densidade} className="overflow-clip bg-card">
          {/* `tabular-nums` na TABELA inteira, e não coluna a coluna.
              Medido em `docs/design/medir-tabular.py`: no Inter do corpo o `1`
              avança 833/2048 de em e o `4`, 1323 — numa coluna de valores isso
              é meio caractere de diferença por linha, e a casa decimal deixa de
              formar coluna. A fonte publica `tnum`, então a utility resolve.
              No elemento inteiro porque a alternativa — marcar cada coluna
              numérica — falha na primeira tela que esquecer a `meta`, e falha
              MUDA: o número continua lá, só desalinhado. Data, código e
              telefone alinham junto, o que numa grade de ERP é ganho.
              `meta.numeric` segue existindo, e agora só decide ALINHAMENTO à
              direita, que é outra pergunta. */}
          <Table
            ref={refDaTabela}
            {...(planilha ? modoPlanilha.propsDaGrade : {})}
            className={cn(
              // `table-layout: fixed` (D33, pesquisa §10): a largura da coluna
              // deixa de ser calculada a partir do conteúdo da PÁGINA ATUAL.
              // Enquanto ela era automática, a mesma coluna de data media 96px
              // numa página e 140px na seguinte, e o operador que paginava
              // conferindo via a grade inteira se reorganizar debaixo do olho.
              // Quem manda nas larguras agora é o `<colgroup>` abaixo.
              'table-fixed tabular-nums',
              // A célula do shadcn traz `h-[52px]`; o seletor de descendente
              // ganha dela por especificidade, sem `!important` e sem tocar no
              // componente compartilhado — outras tabelas do app não mudam.
              compacta && '[&_td]:h-10',
            )}
          >
            {/* As larguras, em UM lugar. `<colgroup>` e não `width` por `<th>`:
                o cabeçalho agrupado tem `colSpan`, e uma largura declarada numa
                célula que abrange três colunas não diz nada sobre nenhuma
                delas. As colunas de SERVIÇO repetem aqui o que já vale nas
                classes (`w-10`, `w-[90px]`) porque em `fixed` quem não declara
                divide a sobra — e o checkbox ficaria com um sexto da tela. */}
            <colgroup>
              {marcavel ? <col style={{ width: 40 }} /> : null}
              {rowNumbers ? <col style={{ width: 40 }} /> : null}
              {colunasDeDado.map((coluna) => {
                const largura = LARGURA_DO_TIPO[coluna.columnDef.meta?.tipo ?? 'texto']
                return (
                  <col
                    key={coluna.id}
                    {...(largura !== undefined ? { style: { width: largura } } : {})}
                  />
                )
              })}
              {temAcoesDeLinha ? <col style={{ width: 90 }} /> : null}
            </colgroup>
            {/* Cabeçalho FIXO na rolagem (#198): numa listagem de cinquenta
                linhas o operador perde o nome da coluna antes da décima, e passa
                a contar posição no olho. O tint `n-50` é obrigatório junto do
                `sticky` — sem fundo opaco as linhas passam por baixo e o texto
                do cabeçalho se mistura ao dado —, e é também a separação entre
                header e corpo. §Separação: UMA ferramenta por fronteira — o
                tint separa, então não há borda por baixo dele. O mockup desenha
                as duas (tint + hairline); a régua da rodada é explícita
                ("header separado por tint n-50, não por borda") e vence. */}
            <TableHeader className="sticky top-0 z-10 bg-[var(--n-100)] [&_th]:h-10 [&_th]:border-b [&_th]:border-input [&_th]:text-[var(--n-700)]">
              {table.getHeaderGroups().map((headerGroup, hgIndex, headerGroups) => (
                // Cabeçalho agrupado: fileira de grupo separada das sub-colunas
                // por Fio (a sublinha forte fica na fileira das folhas).
                <TableRow
                  key={headerGroup.id}
                  className={cn(hgIndex < headerGroups.length - 1 && 'border-rule-hair!')}
                >
                  {marcavel && hgIndex === 0 ? (
                    <TableHead className="w-10" rowSpan={headerGroups.length}>
                      {/* Marcar tudo é marcar A PÁGINA, e o rótulo diz isso: a
                          consulta pode ter mil linhas e o operador vê vinte.
                          Prometer "todas" e agir sobre vinte seria a promessa
                          errada num botão que apaga cadastro. */}
                      <Checkbox
                        aria-label="Marcar todas as linhas desta página"
                        isSelected={todasMarcadas}
                        isIndeterminate={algumaMarcada && !todasMarcadas}
                        onChange={() => setSelecionadas(todasMarcadas ? [] : rows)}
                      />
                    </TableHead>
                  ) : null}
                  {rowNumbers && hgIndex === 0 ? (
                    <TableHead className="w-10" rowSpan={headerGroups.length} />
                  ) : null}
                  {headerGroup.headers.map((header) => {
                    const sortable =
                      header.column.columnDef.enableSorting !== false &&
                      'accessorKey' in header.column.columnDef
                    const active = state.sort?.id === header.column.id
                    const tipo = header.column.columnDef.meta?.tipo
                    const numeric =
                      header.column.columnDef.meta?.numeric === true ||
                      tipo === 'dinheiro' ||
                      tipo === 'progresso'
                    // A origem da coluna só existe onde a tela declarou a
                    // entidade do schema — nas outras a grade segue sem ponto,
                    // em vez de inventar um módulo para caber no desenho.
                    const modulo = entidade ? moduloDaColuna(entidade, header.column.id) : undefined
                    // Só a folha carrega largura: um cabeçalho agrupado abrange
                    // três colunas, e um `min-width` nele falaria de uma coluna
                    // que não existe.
                    const larguraDoCabecalho =
                      header.colSpan > 1 ? undefined : LARGURA_DO_TIPO[tipo ?? 'texto']
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        // A setinha diz a ordem só para quem enxerga; `aria-sort` é
                        // a mesma informação para quem ouve.
                        aria-sort={
                          sortable
                            ? active
                              ? state.sort?.desc
                                ? 'descending'
                                : 'ascending'
                              : 'none'
                            : undefined
                        }
                        // O `<colgroup>` dá a largura; o `min-width` aqui é o
                        // PISO. Em `table-layout: fixed` o navegador comprime
                        // as colunas declaradas quando a soma não cabe, e uma
                        // coluna de dinheiro espremida a 70px quebra o valor
                        // no meio — com o piso, quem cede é a coluna flexível,
                        // e abaixo disso aparece a rolagem horizontal que o
                        // contêiner da tabela já tem.
                        {...(larguraDoCabecalho !== undefined
                          ? { style: { minWidth: larguraDoCabecalho } }
                          : {})}
                        // `overflow-hidden` porque a largura agora é FIXA: o
                        // `--t-rotulo` é caixa alta com tracking, e "NOSSO
                        // CÓDIGO" não cabe nos 110px da coluna de id — sem
                        // isto ele atravessava o cabeçalho da coluna vizinha e
                        // as duas palavras se sobrepunham. O rótulo inteiro
                        // fica no `title`, como o valor da célula.
                        className={cn(
                          'overflow-hidden',
                          header.colSpan > 1 && 'text-center',
                          numeric && 'text-right',
                        )}
                      >
                        {/* Cabeçalho = ícone de TIPO + rótulo + seta. O ícone
                            diz a natureza da coluna antes de o olho ler a
                            palavra; à direita ele vem depois do rótulo, senão
                            ficaria colado no dado da coluna vizinha.
                            Sem caixa por célula: o `--t-rotulo` da §Hierarquia
                            não tem fundo nem borda próprios. */}
                        {header.isPlaceholder ? null : (
                          <span
                            className={cn(
                              'flex max-w-full items-center gap-1.5',
                              numeric && 'flex-row-reverse',
                            )}
                            {...(typeof header.column.columnDef.header === 'string'
                              ? { title: header.column.columnDef.header }
                              : {})}
                          >
                            {tipo ? (
                              <IconeDeTipo tipo={tipo} />
                            ) : (
                              <PontoDoModulo cor={modulo?.cor} />
                            )}
                            {sortable ? (
                              <button
                                type="button"
                                // `uppercase` REPETIDO aqui de propósito: o
                                // `text-transform` do `.t-rotulo` mora no `<th>`
                                // e seria herdado, não fosse o UA stylesheet
                                // declarar `text-transform: none` em `button` —
                                // o resultado media na tela como meia grade em
                                // caixa alta (as colunas sem ordenação) e meia
                                // em caixa mista (as com), sem nada no código
                                // dizendo por quê.
                                className="flex min-w-0 items-center gap-1 truncate uppercase hover:text-foreground focus-visible:focus-ring"
                                onClick={() => toggleSort(header.column.id)}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {active &&
                                  (state.sort?.desc ? (
                                    <ArrowDown className="size-3 text-foreground" />
                                  ) : (
                                    <ArrowUp className="size-3 text-foreground" />
                                  ))}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </span>
                        )}
                      </TableHead>
                    )
                  })}
                  {/* A coluna das ações de linha não tem rótulo: o que ela
                      contém aparece no hover, e um cabeçalho "Ações" ocuparia
                      permanentemente a largura para nomear o óbvio. Ela existe
                      no cabeçalho só para reservar a largura desde o primeiro
                      quadro — sem isso a grade se reorganiza quando o mouse
                      entra na primeira linha. */}
                  {temAcoesDeLinha && hgIndex === 0 ? (
                    <TableHead className="w-[90px]" rowSpan={headerGroups.length}>
                      <span className="sr-only">Ações da linha</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                /* ESQUELETO COM A FORMA DA PÁGINA (#201), e não uma barra por
                   linha. A barra única (`colSpan` de tudo) desenha uma grade
                   que não existe: a linha nasce inteira e se parte em cinco
                   quando o dado chega, com as colunas achando sua largura na
                   frente do operador. Uma célula por coluna reserva o lugar
                   certo desde o primeiro quadro — é a diferença entre esperar
                   e ver a tela pular.
                   As larguras VARIAM por coluna (nome longo, código curto):
                   cinco barras idênticas leem como barra de progresso, não
                   como tabela. */
                SKELETON_ROWS.map((rowKey, linha) => (
                  <TableRow key={rowKey} data-testid="linha-de-esqueleto">
                    {rowNumbers ? (
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                    ) : null}
                    {marcavel ? (
                      <TableCell>
                        <Skeleton className="size-4" />
                      </TableCell>
                    ) : null}
                    {table.getAllLeafColumns().map((coluna, indice) => (
                      <TableCell key={coluna.id} data-testid="celula-de-esqueleto">
                        <Skeleton className={LARGURAS_DE_ESQUELETO[(linha + indice) % 3]} />
                      </TableCell>
                    ))}
                    {/* A coluna das ações entra no esqueleto vazia: elas só
                        aparecem no hover, e uma barra cinza ali prometeria
                        conteúdo que nunca fica visível parado. */}
                    {temAcoesDeLinha ? <TableCell className="w-[90px]" /> : null}
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} className="py-8">
                    <FalhaDaConsulta erro={query.error} aoTentar={() => query.refetch()} />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColSpan} className="py-8">
                    <VazioDaConsulta
                      q={state.q}
                      temFiltro={temFiltro}
                      acao={acaoDoVazio}
                      aoLimpar={limparBuscaEFiltros}
                    />
                  </TableCell>
                </TableRow>
              ) : agrupamentoDaTabela ? (
                gruposDaTabela.map((grupo) => {
                  const fechado = gruposFechados.includes(grupo.valor)
                  const tom = agrupamentoDaTabela.tomDoValor?.(grupo.valor)
                  return (
                    <Fragment key={grupo.valor}>
                      <TableRow
                        data-slot="linha-de-grupo"
                        data-grupo={grupo.valor}
                        // TINT, e só ele: a faixa separa REGIÃO por natureza,
                        // que é a terceira ferramenta da §Hierarquia. Somar
                        // borda à tinta seria duas ferramentas na mesma
                        // fronteira — e a hairline entre linhas, que já existe,
                        // é a de baixo.
                        className={cn(
                          // `n-50` é a folha-2 do 2.0 — o mesmo tint do header
                          // da tabela, porque as duas faixas fazem o mesmo
                          // trabalho: dizer que ali não há dado. O hover fica
                          // preso: a faixa não é linha de registro e piscar sob
                          // o cursor prometeria uma seleção que não existe.
                          'bg-[var(--n-50)] hover:bg-[var(--n-50)]',
                          tom !== undefined && TINT_DO_GRUPO[tom],
                        )}
                      >
                        <TableCell colSpan={totalColSpan} className="h-9 bg-transparent p-0">
                          {/* O alvo é a FAIXA INTEIRA: colapsar é o gesto
                                repetido de quem agrupou para ver os totais, e
                                mirar um chevron de 16px trinta vezes é o que faz
                                a pessoa desistir do agrupamento. */}
                          <button
                            type="button"
                            className="flex h-9 w-full items-center gap-[var(--s-3)] px-3 text-left outline-none focus-visible:focus-ring"
                            aria-expanded={!fechado}
                            onClick={() =>
                              setGruposFechados((atuais) =>
                                atuais.includes(grupo.valor)
                                  ? atuais.filter((v) => v !== grupo.valor)
                                  : [...atuais, grupo.valor],
                              )
                            }
                          >
                            {fechado ? (
                              <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                            ) : (
                              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
                            )}
                            {/* O VALOR do grupo é carimbo quando é situação e
                                  texto de interface quando não é — agrupar por
                                  fornecedor não tem estado, e um carimbo neutro
                                  em volta de "Stella" faria de um nome próprio
                                  um estado do sistema. */}
                            {tom !== undefined ? (
                              <Stamp tom={tom} label={grupo.valor} />
                            ) : (
                              <span className="t-ui truncate">{grupo.valor}</span>
                            )}
                            {/* Contagem em `--t-dado-meta`: é número que se
                                  compara entre faixas (mono, tabular), não
                                  rótulo — e mono é dado, sem exceção.
                                  A UNIDADE é a da entidade quando a tela a
                                  declara (`2 ordens`, como no mockup) e cai em
                                  `itens` quando não — o schema de módulos já
                                  sabe o nome no singular e no plural, e "itens"
                                  numa tela de ordens é o sistema falando de si
                                  mesmo em vez de falar do trabalho. */}
                            <span className="t-dado-meta">
                              {grupo.linhas.length}{' '}
                              {grupo.linhas.length === 1
                                ? (entidade?.nome.toLocaleLowerCase('pt-BR') ?? 'item')
                                : (entidade?.plural.toLocaleLowerCase('pt-BR') ?? 'itens')}
                            </span>
                            {/* O subtotal é `--t-dado`, o mesmo degrau da coluna
                                  de dinheiro acima dele: é para ser comparado
                                  com ela, e um degrau diferente sugeriria outra
                                  natureza de número. */}
                            {grupo.subtotal !== null ? (
                              <span className="t-dado ml-auto">
                                {formatMoneyBRL(grupo.subtotal)}
                              </span>
                            ) : null}
                          </button>
                        </TableCell>
                      </TableRow>
                      {fechado
                        ? null
                        : grupo.linhas.map((row) =>
                            renderLinha(row, indiceVisual.get(row.id) ?? 0),
                          )}
                    </Fragment>
                  )
                })
              ) : (
                table
                  .getRowModel()
                  .rows.map((row) => renderLinha(row, indiceVisual.get(row.id) ?? 0))
              )}
            </TableBody>
          </Table>

          {/* O ANCORADOURO da barra de lote — altura ZERO, de propósito.
              Ele é o que faz a barra flutuar SEM empurrar a grade: no 1.x ela
              entrava no fluxo acima da tabela, e marcar uma linha descia a
              grade inteira alguns pixels — a linha que o operador acabou de
              mirar saía de baixo do cursor no exato instante em que ele a
              marcou. Com `h-0` o layout não sabe que a barra existe; quem a põe
              na tela é o `translate` do filho.
              `sticky bottom-3` e não `absolute`: numa consulta de cinquenta
              linhas o fim da grade está fora da janela, e uma barra presa ao
              rodapé do card só apareceria depois de rolar até lá. Grudada,
              ela acompanha a leitura. A caixa da grade usa `overflow-clip`, que
              recorta sem criar scrollport — então quem manda no `sticky` é a
              rolagem da PÁGINA, que é onde a listagem rola.
              A barra vive AQUI, dentro do card, e não no rodapé da tela: as
              visões alternativas (quadro) não têm linha para marcar, e uma
              pílula de lote pairando sobre um quadro sem seleção possível seria
              a promessa de uma ação que não existe ali. */}
          <div
            data-slot="ancora-da-barra-de-selecao"
            // `items-start` importa: num flex de altura zero o alinhamento
            // padrão (`stretch`) esticaria a pílula PARA zero, e aí o
            // `-translate-y-full` do filho — que é 100% da altura dele —
            // moveria zero pixel. A barra ficava colada no fim da caixa e
            // recortada pelo `overflow-clip`; só a captura mostrou.
            className="pointer-events-none sticky bottom-3 z-20 flex h-0 items-start justify-center"
          >
            {marcavel && (algumaMarcada || barraSaindo) ? (
              <div className="-translate-y-full pointer-events-auto pb-1">
                <BarraDeSelecao
                  quantidade={algumaMarcada ? selecionadas.length : ultimaQuantidade.current}
                  acoes={acoesDeSelecao ?? []}
                  linhas={selecionadas}
                  aoLimpar={() => setSelecionadas([])}
                  saindo={barraSaindo}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-input bg-[var(--n-50)] px-[var(--s-3)] py-2">
        {/* O rodapé responde DUAS perguntas, e por isso tem dois lados: à
            esquerda "o que estou vendo e quanto isso soma"; à direita "como
            ando por dentro disso". Antes havia só a contagem, e a soma da
            coluna de dinheiro — o número que o operador confere contra o
            fornecedor — não existia em tela nenhuma. */}
        <span className="t-meta" data-testid="contagem-da-grade">
          {/* Consulta que falhou não tem contagem: "0 registros" seria afirmar
              que a consulta voltou vazia, que é exatamente o que não se sabe. */}
          {query.isError ? (
            '— registros'
          ) : (
            <>
              <span className="t-dado">{rows.length}</span> de{' '}
              <span className="t-dado">{total}</span> registro{total === 1 ? '' : 's'}
              {soma !== null ? (
                <>
                  {' · '}
                  {/* "da página" quando há mais do que coube: chamar de "soma
                      filtrada" o total de vinte linhas de uma consulta de mil
                      seria um número certo com o nome errado — e ele acabaria
                      copiado para um relatório. */}
                  {total > rows.length ? 'soma da página ' : 'soma filtrada '}
                  <span className="t-dado">{formatMoneyBRL(soma)}</span>
                </>
              ) : null}
            </>
          )}
        </span>

        {visaoAtiva ? (
          // Não há paginação para esconder aqui: a visão pediu o conjunto
          // inteiro. O que pode faltar é o que passa do teto do contrato — e aí
          // o rodapé DIZ, porque um quadro cortado em silêncio é o mesmo defeito
          // da coluna falsa, só que sem controle nenhum na tela para desconfiar.
          !query.isError && total > rows.length ? (
            // `<output>` em vez de `role="status"`: é o mesmo anúncio educado
            // para leitor de tela, com o elemento que já significa isso.
            <output className="text-warn-foreground">
              Mostrando {rows.length} de {total}. Estreite o filtro para ver o resto.
            </output>
          ) : null
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <label htmlFor="vitra-page-size" className="t-meta">
              Por página
            </label>
            <select
              id="vitra-page-size"
              className="h-8 rounded-control border border-input bg-card px-2 t-ui tabular-nums outline-none focus-visible:focus-ring"
              value={state.pageSize}
              onChange={(e) =>
                updateState((s) => ({ ...s, pageSize: Number(e.target.value), page: 1 }))
              }
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            {/* A FAIXA, não o número da página: "1–20 de 340" diz onde o
                operador está dentro do conjunto; "Página 2 de 17" o obriga a
                multiplicar para saber a mesma coisa. */}
            <span className="t-dado-meta" data-testid="faixa-da-pagina">
              {total === 0
                ? '0 de 0'
                : `${(state.page - 1) * state.pageSize + 1}–${Math.min(
                    state.page * state.pageSize,
                    total,
                  )} de ${total}`}
            </span>
            {/* Seta SEM rótulo, e a mudança é deliberada: `Anterior`/`Próxima`
                escritos ocupavam metade do rodapé para dizer o que a direção já
                diz, e o par de setas encostado é o padrão que todo operador
                reconhece. O nome continua existindo para quem ouve
                (`aria-label`) e para quem para o mouse em cima (`title`) — o
                que não pode existir é seta MUDA. */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Página anterior"
                title="Página anterior"
                disabled={state.page <= 1}
                onClick={() => updateState((s) => ({ ...s, page: s.page - 1 }))}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Próxima página"
                title="Próxima página"
                disabled={state.page >= pageCount}
                onClick={() => updateState((s) => ({ ...s, page: s.page + 1 }))}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
