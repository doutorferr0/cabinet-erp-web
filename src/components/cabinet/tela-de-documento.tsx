import { DocumentoHeader } from '@/components/cabinet/documento'
import { Skeleton } from '@/components/ui/skeleton'
import type { ResourceProvider } from '@/data/provider'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export interface TelaDeDocumentoProps<T> {
  provider: ResourceProvider<T>
  /** Prefixo da query key (ex.: 'orcamento', 'ordem-compra', 'pedido-compra'). */
  queryKeyBase: string
  /** Valor cru do param de rota — 'novo' ou o id numérico como string. */
  idParam: string
  titulo: string
  modo?: string | undefined
  numero: (doc: T) => string | number | undefined
  naoEncontrado: string
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
  children,
}: TelaDeDocumentoProps<T>) {
  const isNovo = idParam === 'novo'
  const id = Number(idParam)

  const query = useQuery({
    queryKey: [queryKeyBase, idParam],
    queryFn: () => (isNovo ? provider.empty(Date.now() % 100000) : provider.get(id, 0)),
  })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
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
