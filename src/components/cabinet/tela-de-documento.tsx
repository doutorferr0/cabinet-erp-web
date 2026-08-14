import { DocumentoHeader } from '@/components/cabinet/documento'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import type { DocumentoProvider } from '@/data/provider'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

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
}

/**
 * Esqueleto comum às telas de documento (Orçamento, Ordem de Compra, Pedido de
 * Compra — transcrição §9 padrão 6): busca por id ou registro em branco,
 * skeleton enquanto carrega, "não encontrado" quando o id não existe, e o
 * `DocumentoHeader` por cima do form específico de cada documento.
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
    return <p className="text-muted-foreground">{naoEncontrado}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentoHeader
        titulo={titulo}
        {...(modo ? { modo } : {})}
        numero={isNovo ? undefined : numero(query.data)}
      />
      {children(query.data)}
    </div>
  )
}
