import type { PurchaseArrivalRowDto } from '@/api/gerado'
import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { Nome } from '@/components/cabinet/nome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DESTINO_ROTULO, type DestinoDaCompra, usePrevisaoDeChegada } from '@/data/compras-api'
import { formatDateBR, formatQuantidade } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { useState } from 'react'

/**
 * PREVISÃO DE CHEGADA — `GET /api/purchases/arrival-forecast`.
 *
 * A consulta que o comprador abre de manhã, e a razão de ela não ser a listagem
 * de ordens com um filtro: **a linha aqui é o ITEM, não o documento**. Uma
 * ordem de dez peças com três atrasadas aparece como três linhas, porque é pelo
 * que falta que o fornecedor é cobrado — e porque uma das três pode estar
 * prometida a um cliente e as outras irem para o galpão.
 *
 * ## O que a tela mostra e não calcula
 *
 * `expectedAt` já vem sendo a data VÁLIDA (a reagendada, quando houve
 * reagendamento), `originalExpectedAt` só aparece quando houve, e `daysLate` é
 * contado pelo servidor. Refazer qualquer uma das três aqui daria dois números
 * para a mesma pergunta — e o que diverge é sempre o da tela, porque o fuso de
 * quem consulta não é o do banco.
 *
 * ## `null` em cliente NÃO é vazio, é "estoque"
 *
 * O contrato escreve isso em letra: "`null` na linha de reposição, e a tela
 * mostra 'estoque' — não vazio". Célula em branco lê como dado faltando, e
 * manda alguém procurar um cliente que nunca existiu.
 */
export function PrevisaoDeChegada() {
  const navigate = useNavigate()
  const [destino, setDestino] = useState<DestinoDaCompra | ''>('')
  const [soAtrasadas, setSoAtrasadas] = useState(false)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const consulta = usePrevisaoDeChegada({
    ...(destino ? { destino } : {}),
    ...(soAtrasadas ? { soAtrasadas: true } : {}),
    ...(de ? { de } : {}),
    ...(ate ? { ate } : {}),
  })

  if (consulta.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar a previsão de chegada."
        erro={consulta.error}
        refazer={() => consulta.refetch()}
      />
    )
  }

  const linhas = consulta.data?.rows ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="previsao-destino">Destino</Label>
          <select
            id="previsao-destino"
            className="flex h-9 border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
            value={destino}
            onChange={(evento) => setDestino(evento.target.value as DestinoDaCompra | '')}
          >
            <option value="">Tudo</option>
            <option value="stock">{DESTINO_ROTULO.stock}</option>
            <option value="sale">{DESTINO_ROTULO.sale}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="previsao-de">De</Label>
          <Input
            id="previsao-de"
            type="date"
            value={de}
            onChange={(evento) => setDe(evento.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="previsao-ate">Até</Label>
          <Input
            id="previsao-ate"
            type="date"
            value={ate}
            onChange={(evento) => setAte(evento.target.value)}
          />
        </div>
        <Button
          type="button"
          variant={soAtrasadas ? 'default' : 'outline'}
          size="sm"
          aria-pressed={soAtrasadas}
          onClick={() => setSoAtrasadas((valor) => !valor)}
        >
          <CalendarClock className="size-4" /> Só atrasadas
        </Button>
      </div>

      {consulta.isPending ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nada a chegar neste recorte. A previsão só mostra ordem ENVIADA — a que ainda está em
          montagem é intenção do comprador, não promessa do fornecedor.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Para quem</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Atraso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha: PurchaseArrivalRowDto, indice: number) => (
                <TableRow key={`${linha.purchaseOrderId}-${linha.description}-${indice}`}>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void navigate({
                          to: '/compras/ordens/$ordemId',
                          params: { ordemId: linha.purchaseOrderId },
                          search: { modo: 'consulta' as const },
                        })
                      }
                    >
                      {linha.purchaseOrderNumber}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Nome>{linha.supplierName}</Nome>
                  </TableCell>
                  <TableCell>
                    {linha.description}
                    {linha.finish || linha.size ? (
                      <span className="text-muted-foreground">
                        {' '}
                        {[linha.finish, linha.size].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatQuantidade(linha.quantity)}</TableCell>
                  <TableCell>{DESTINO_ROTULO[linha.destination]}</TableCell>
                  <TableCell>
                    {/* `null` é reposição, e a palavra é "estoque" — não vazio. */}
                    {linha.customerName ? (
                      <Nome>{linha.customerName}</Nome>
                    ) : (
                      <span className="text-muted-foreground">estoque</span>
                    )}
                    {linha.orderNumber ? (
                      <span className="text-muted-foreground"> · {linha.orderNumber}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDateBR(linha.sentAt) || '—'}</TableCell>
                  <TableCell>
                    {formatDateBR(linha.expectedAt) || '—'}
                    {/* A promessa ORIGINAL só aparece onde houve reagendamento:
                        posta em toda linha, ela deixaria de sinalizar o que
                        existe para sinalizar. */}
                    {linha.originalExpectedAt ? (
                      <span className="text-muted-foreground">
                        {' '}
                        (era {formatDateBR(linha.originalExpectedAt)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {linha.daysLate ? (
                      <span className="font-semibold text-warn">{linha.daysLate} d</span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
