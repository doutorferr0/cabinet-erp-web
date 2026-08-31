import { PageHeader } from '@/components/cabinet/page-header'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import { PAGE_SIZE_MAX } from '@/data/api-provider'
import { useFilaDeSeparacao } from '@/data/entrega-api'
import { agruparEmCargas, estaAtrasada } from '@/features/carga/agrupamento'
import { CargaDoPedido } from '@/features/carga/carga-do-pedido'
import { diaLocalISO } from '@/lib/datas'
import { mensagemDoErro } from '@/lib/erros'
import { formatDateBR, formatQuantidade } from '@/lib/formatters'
import { useState } from 'react'

/**
 * QUADRO DE CARGAS — os pedidos agrupados pelo que ainda tem de sair do galpão.
 *
 * É a Fase C do G13 (`api#164`) sobre os dados do G4: uma LEITURA da fila de
 * separação (`GET /api/picking-queue`), agrupada por pedido, com o painel da
 * carga escolhida ao lado. Quem separa não pensa em linha solta — pensa em
 * "quais pedidos eu carrego hoje", e é o agrupamento que transforma uma lista de
 * itens nessa pergunta.
 *
 * ## Duas coisas se chamam "Quadro de Cargas", e esta é a de ENTREGA
 *
 * No legado, `RltQuadroCargas` (item 230 do menu Vendas) é **dimensionamento
 * ELÉTRICO** — soma `Pro_Consumo` por ambiente e lê `Pro_Tensao`. Não é esta
 * tela, e a confusão passa por qualquer revisão que só leia o nome: aquela
 * depende de consumo e tensão em `product_tenant`, que o contrato não publica.
 * Esta aqui é o agrupamento de pedidos para entrega, que é o que a `api#164`
 * pede em letra ("agrupamento de pedidos para entrega — leitura sobre dados do
 * G4"). O dia em que a elétrica for construída, ela precisa de OUTRO nome de
 * rota, não desta.
 *
 * ## A ordem é do SERVIDOR, e a tela não a refaz
 *
 * A fila chega ordenada por data prometida com `NULLS LAST`, número do pedido
 * como desempate: o que atrasa aparece em cima, e item sem data combinada não
 * fura a fila de quem tem uma. O quadro agrupa preservando essa ordem — quem
 * reordenasse aqui apagaria a regra do contrato com uma preferência de tela.
 *
 * ## Por que a fila vem INTEIRA (no teto do contrato)
 *
 * Agrupar sobre uma página monta grupo falso: o pedido de 12 linhas apareceria
 * com 10 se a página cortasse no meio, e o operador leria "faltam 10" onde
 * faltam 12. Por isso o teto, e por isso o rodapé DIZ quando o teto cortou — é a
 * mesma regra do padrão 9 (visão que não é tabela pede o conjunto inteiro e
 * declara o corte).
 */
export function QuadroDeCargas({ pedidoInicial = null }: { pedidoInicial?: string | null } = {}) {
  // `pedidoInicial` é o `?pedido=` da rota — quem chega do documento de venda já
  // escolheu, e refazer a escolha aqui perderia o pedido no caminho. É estado
  // INICIAL de propósito: depois disso quem manda é o clique na fila, senão a
  // URL travaria a escolha e o quadro deixaria de ser um quadro.
  const [orderId, setOrderId] = useState<string | null>(pedidoInicial)
  const fila = useFilaDeSeparacao()

  const linhas = fila.data?.rows ?? []
  const total = fila.data?.total ?? 0
  const cargas = agruparEmCargas(linhas)
  const hoje = diaLocalISO()

  // A carga escolhida pode sumir da fila — é o que ACONTECE quando alguém separa
  // a última linha dela. O painel continua aberto de propósito: é ali que estão
  // o romaneio e a entrega, que vêm DEPOIS da separação. Fechá-lo sozinho tiraria
  // a tela de quem acabou de terminar de separar e ia carregar o caminhão.
  const escolhida = cargas.find((c) => c.orderId === orderId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Quadro de Cargas"
        contexto="Os pedidos com peça liberada esperando sair do galpão, agrupados por documento."
      />

      <Painel titulo="Fila de separação" modulo="vendas">
        {fila.isPending ? (
          <p className="text-muted-foreground text-sm">Carregando a fila…</p>
        ) : fila.error ? (
          <p className="text-destructive text-sm" role="alert">
            {mensagemDoErro(fila.error, 'A fila de separação não chegou.')}
          </p>
        ) : cargas.length === 0 ? (
          // Fila vazia é estado LEGÍTIMO e frequente: ou tudo já saiu, ou nada
          // foi liberado ainda. As duas coisas pedem a mesma frase — o que não
          // pode é a tela parecer quebrada.
          <p className="text-muted-foreground text-sm">
            Nenhuma peça liberada esperando separação. Libere itens na situação do pedido para eles
            aparecerem aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cargas.map((carga) => {
              const atrasada = estaAtrasada(carga, hoje)
              return (
                <Button
                  key={carga.orderId}
                  type="button"
                  variant={carga.orderId === orderId ? 'default' : 'outline'}
                  className="h-auto justify-between px-3 py-2 text-left"
                  onClick={() => setOrderId(carga.orderId)}
                  data-testid={`carga-${carga.orderNumber}`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm">
                      Pedido {carga.orderNumber} · {carga.customerName}
                    </span>
                    <span className="text-xs opacity-80">
                      {carga.linhas.length} {carga.linhas.length === 1 ? 'linha' : 'linhas'} ·{' '}
                      {formatQuantidade(carga.pendingPick)} a separar
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-xs">
                      {carga.scheduledDeliveryAt
                        ? formatDateBR(carga.scheduledDeliveryAt)
                        : 'sem data'}
                    </span>
                    {/* "Atrasada" é a única marca da fila, e ela não é decoração:
                        é o motivo pelo qual esta carga está no topo. */}
                    {atrasada ? (
                      <span className="font-mono text-xs uppercase tracking-[0.06em]">
                        atrasada
                      </span>
                    ) : null}
                  </span>
                </Button>
              )
            })}
            {total > linhas.length ? (
              <p className="text-muted-foreground text-xs">
                A fila tem {total} linhas e o quadro mostra as {linhas.length} primeiras (teto de{' '}
                {PAGE_SIZE_MAX} do contrato). Filtre por pedido para ver o resto.
              </p>
            ) : null}
          </div>
        )}
      </Painel>

      {orderId ? (
        <CargaDoPedido orderId={orderId} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Escolha uma carga acima para ver a situação do pedido, liberar, separar e montar o
          romaneio.
        </p>
      )}

      {/* A carga escolhida que saiu da fila: dizê-lo evita que o operador ache
          que clicou errado quando o painel continua aberto e o botão sumiu. */}
      {orderId && !escolhida && cargas.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Este pedido não tem mais nada esperando separação — o painel segue aberto para a entrega.
        </p>
      ) : null}
    </div>
  )
}
