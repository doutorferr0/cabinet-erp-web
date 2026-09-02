import {
  type FilaDeAutosave,
  GuardaDeAutosave,
  useAutosave,
} from '@/components/cabinet/alteracoes-nao-salvas'
import { AvisoDadosDeExemplo } from '@/components/cabinet/aviso-dados-de-exemplo'
import type { TomDeBadge } from '@/components/cabinet/badge'
import { CabecalhoDoRegistro, LayoutDoRegistro } from '@/components/cabinet/documento'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import type { AcaoDeCabecalho } from '@/components/cabinet/page-header'
import type { DocumentoProvider } from '@/data/provider'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext } from 'react'

/**
 * O que o cabeçalho mostra sobre ESTE registro, neste estado.
 *
 * Vem por função do documento, e não por props soltas, porque tudo aqui muda
 * junto: uma ordem `Enviada` tem badge de informação, meta com a data de envio
 * e "Confirmar recebimento" na primária; a mesma ordem cancelada não tem
 * próxima ação nenhuma. Espalhar isso em seis props deixaria a tela livre para
 * combinar um estado com a ação de outro.
 */
export interface DadosDoCabecalho {
  /** Situação do registro — o carimbo ao lado do id. */
  badge?: { tom: TomDeBadge; label: string }
  /**
   * Procedência: "Mister LED · criada 20/08/2026 por Henrique · reagendada 1×".
   *
   * Texto, e não nó: é o `subtitulo` do `PageHeader`, que a §Hierarquia define
   * como uma linha de `.t-meta`. Aceitar marcação aqui abriria a porta para a
   * segunda voz tipográfica dentro do cabeçalho que a D5 acabou de unificar.
   */
  meta?: string
  /** Ações fracas, à vista — Imprimir, Duplicar. */
  acoes?: readonly AcaoDeCabecalho[]
  /** Atrás do `···`: cancelar, excluir — o raro e o perigoso. */
  menu?: readonly AcaoDeCabecalho[]
  /**
   * **O PRÓXIMO PASSO DO FLUXO**, não "Gravar". É o que muda com o estado do
   * documento: rascunho → "Enviar orçamento"; enviado → "Confirmar
   * recebimento"; fechado → nenhuma. Devolver `undefined` é a resposta certa
   * para o registro que não tem para onde ir — botão morto no lugar mais forte
   * da tela ensina que aquele lugar não vale a leitura.
   */
  proximaAcao?: AcaoDeCabecalho
}

export interface AutosaveDaTela {
  /** Grava o registro; recebe os campos que provocaram a rodada. */
  salvar: (campos: readonly string[]) => Promise<unknown>
  /** Só para teste: encurtar o debounce. */
  debounceMs?: number
  /** Recarrega o registro — a saída do diálogo de conflito. */
  onRecarregar?: () => void
}

/**
 * A fila do registro aberto, para o formulário que mora dentro desta tela.
 *
 * Vai por contexto e não por render prop porque quem agenda é o CAMPO, lá no
 * fundo do formulário, e passar a fila de mão em mão até ele obrigaria cada
 * bloco no caminho a declarar uma prop que não usa.
 */
const ContextoDeAutosave = createContext<FilaDeAutosave | null>(null)

/**
 * A fila de autosave do registro aberto, ou `null` fora de uma tela de
 * documento — e `null` é resposta legítima: o mesmo bloco de formulário serve
 * cadastro (que grava por botão) e documento (que grava sozinho).
 */
export function useAutosaveDoRegistro(): FilaDeAutosave | null {
  return useContext(ContextoDeAutosave)
}

export interface TelaDeDocumentoProps<T> {
  /**
   * Só o que esta tela usa: abrir por id, ou em branco. Pedir o
   * `ResourceProvider` inteiro obrigaria o tipo da LINHA a ser o do DOCUMENTO —
   * e nos recursos HTTP eles divergem de propósito.
   */
  provider: DocumentoProvider<T>
  /** Prefixo da query key (ex.: 'orcamento', 'ordem-compra', 'pedido-compra'). */
  queryKeyBase: string
  /** Valor cru do param de rota — 'novo' ou o id numérico como string. */
  idParam: string
  titulo: string
  modo?: string | undefined
  numero: (doc: T) => string | number | undefined
  naoEncontrado: string
  /** Mensagem do braço de erro — "Não foi possível carregar o X." */
  erroAoCarregar: string
  children: (doc: T) => ReactNode
  /** Situação, procedência e ações do registro — ver `DadosDoCabecalho`. */
  cabecalho?: (doc: T) => DadosDoCabecalho
  /**
   * A coluna de 320px: o que se CONSULTA enquanto se preenche o documento —
   * fornecedor, andamento, pagamento. Sem ela a tela fica de uma coluna só, que
   * é o certo para documento que não tem o que orbitar.
   */
  lateral?: (doc: T) => ReactNode
  /**
   * Liga a gravação automática (#483). Sem isto a tela não fala de gravação
   * nenhuma: quem ainda grava por botão mostra o botão do formulário, e um
   * "salvo há 12 s" ao lado dele seria mentira.
   */
  autosave?: AutosaveDaTela
  /**
   * O que NÃO pertence ao registro: painel de atividades, histórico, qualquer
   * coisa com gravação própria. Fica DEPOIS das duas colunas.
   *
   * O nome é do desenho anterior (a moldura-mãe da fusão v5, que a 2.0
   * removeu — ver `DocumentoBloco`) e sobrevive porque renomear a prop mexeria
   * nas rotas, que são zona de outra issue. O que ele quer dizer não mudou: o
   * que está aqui não é o documento.
   */
  foraDaMoldura?: (doc: T) => ReactNode
}

/**
 * ESQUELETO DA FICHA 2.0 (#483) — cabeçalho do registro em cima, principal e
 * lateral embaixo.
 *
 * Serve as telas de documento (Orçamento, Ordem de Compra, Pedido de Compra —
 * transcrição §9 padrão 6): busca por id ou registro em branco, skeleton
 * enquanto carrega, "não encontrado" quando o id não existe.
 *
 * ## O que a rodada 2.0 mudou aqui
 *
 * 1. **A moldura-mãe saiu.** Ela envolvia o documento inteiro num retângulo de
 *    traço grosso com etiqueta sobreposta para dizer onde a entidade começava e
 *    acabava. Era uma quinta ferramenta de separação, por cima das quatro da
 *    §Hierarquia, e a fronteira que ela desenhava agora é a COLUNA: o que é do
 *    documento fica na principal, o que só o acompanha vai para a lateral.
 * 2. **`Gravar`/`Cancelar` sumiram do rodapé.** A ficha grava sozinha e o lugar
 *    forte do cabeçalho passa a ser o próximo passo do fluxo (`proximaAcao`).
 * 3. **O número virou id ao lado do título**, em mono, no lugar da caixa preta.
 *    Ele é dado que se copia e se compara — não um cartaz.
 */
export function TelaDeDocumento<T>({
  provider,
  queryKeyBase,
  idParam,
  titulo,
  modo,
  numero,
  naoEncontrado,
  erroAoCarregar,
  children,
  cabecalho,
  lateral,
  autosave,
  foraDaMoldura,
}: TelaDeDocumentoProps<T>) {
  const isNovo = idParam === 'novo'

  const query = useQuery({
    queryKey: [queryKeyBase, idParam],
    // O `idParam` vai CRU. Quem converte é o provider, que conhece a forma do
    // próprio id — o esqueleto fazia `Number(idParam)` e, no primeiro recurso
    // HTTP a passar por aqui, isso viraria `NaN` e "não encontrado" para um
    // documento que existe.
    queryFn: () => (isNovo ? provider.empty() : provider.get(idParam, 0)),
  })

  // O hook é incondicional (regra dos hooks) e inofensivo sem `autosave`: sem
  // ninguém chamando `agendar`, a fila nasce ociosa e nunca dispara nada.
  const fila = useAutosave({
    salvar: autosave?.salvar ?? (() => Promise.resolve()),
    ...(autosave?.debounceMs !== undefined ? { debounceMs: autosave.debounceMs } : {}),
  })

  if (query.isPending) {
    return <EsqueletoDeCarregamento />
  }

  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem={erroAoCarregar}
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!query.data) {
    return <p className="t-corpo text-muted-foreground">{naoEncontrado}</p>
  }

  const doc = query.data
  const numeroDoDocumento = isNovo ? undefined : numero(doc)
  const dados = cabecalho?.(doc) ?? {}
  const colunaLateral = lateral?.(doc)

  return (
    // Fronteiras entre regiões da página = espaço `--s-5` (24), sem linha
    // (§Hierarquia, separação).
    <div className="flex flex-col gap-6">
      {/* O aviso não é do documento, é SOBRE ele. Ninguém o liga por rota —
          quem sabe se o registro é fixture é o `provider` que esta tela já
          recebe, e recurso que migrar para HTTP apaga o aviso sozinho. */}
      <AvisoDadosDeExemplo origem={provider.origem} />

      <CabecalhoDoRegistro
        titulo={titulo}
        {...(numeroDoDocumento !== undefined ? { id: numeroDoDocumento } : {})}
        {...(dados.badge ? { badge: dados.badge } : {})}
        // O modo (`Incluir`, `Consulta`) é RÓTULO ao lado do título, não parte
        // dele: colados, o leitor de tela anunciava "Orçamento — Incluir" como
        // se fosse o nome do documento.
        {...(modo ? { modo } : {})}
        {...(dados.meta ? { meta: dados.meta } : {})}
        {...(autosave ? { autosave: fila.estado, onTentarDeNovo: fila.tentarDeNovo } : {})}
        {...(dados.acoes ? { acoes: dados.acoes } : {})}
        {...(dados.menu ? { menu: dados.menu } : {})}
        {...(dados.proximaAcao ? { proximaAcao: dados.proximaAcao } : {})}
      />

      <ContextoDeAutosave.Provider value={autosave ? fila : null}>
        <LayoutDoRegistro
          principal={children(doc)}
          {...(colunaLateral ? { lateral: colunaLateral } : {})}
        />
        {/* A guarda só existe no regime de autosave, e por isso monta aqui e
            não sempre: `useBlocker` exige router, e a tela sem autosave é
            montável em teste de componente isolado. */}
        {autosave ? (
          <GuardaDeAutosave
            autosave={fila}
            {...(autosave.onRecarregar ? { onRecarregar: autosave.onRecarregar } : {})}
          />
        ) : null}
      </ContextoDeAutosave.Provider>

      {foraDaMoldura?.(doc)}
    </div>
  )
}
