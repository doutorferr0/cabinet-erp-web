import {
  AcaoDoRodape,
  type FonteDeItens,
  GradeDeItens,
  type LinhaDaGrade,
} from '@/components/cabinet/grade-de-itens'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  linhasAbertasParaOrdem,
  subtotalDaOrdem,
  usePedidosComLinhaAberta,
} from '@/data/compras-api'
import { tabelas } from '@/data/tabelas'
import { formatDateBR, formatMoneyBRL, formatPercent, parseQuantidade } from '@/lib/formatters'
import { List } from 'lucide-react'
import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { type LinhaNoFormulario, linhaParaFormulario } from './ordem-compra-form'

/**
 * ITENS DA ORDEM DE COMPRA na grade 2.0 (D17, #485).
 *
 * **A ordem não tem `+ Adicionar item`, e isso não é omissão da rodada de
 * design.** Toda linha da ordem veio de um pedido de compra em aberto — é o
 * que o `pedidoOrigemId` obrigatório do schema diz, e uma linha digitada à mão
 * seria recusada na gravação. O rodapé mostra a origem que a ordem realmente
 * tem (`De pedidos`) e nada mais: botão que abre uma linha inválida é pior que
 * botão ausente.
 */

/** Quanto vale a linha da ordem: quantidade × CUSTO unitário, em centavos. */
function totalDaLinhaDaOrdem(linha: LinhaDaGrade): number {
  const quantidade = parseQuantidade(String(linha.quantidade ?? '')) ?? 0
  const custo = typeof linha.custoUnitarioCentavos === 'number' ? linha.custoUnitarioCentavos : 0
  return Math.round(quantidade * custo)
}

/**
 * "Produtos Pedidos" do legado, agora em FOLHA: traz as linhas ainda abertas
 * dos pedidos do fornecedor escolhido.
 *
 * Só as `open` aparecem — a linha já levada por outra ordem seria recusada com
 * `item-ja-em-ordem`, e oferecê-la seria montar uma ordem que só falha ao
 * gravar. Gaveta e não diálogo (mockup): o operador traz linhas de dois ou três
 * pedidos seguidos, e o modal centralizado cobre a grade que ele está enchendo.
 */
function FolhaDePedidosAbertos({
  fornecedorId,
  jaNaOrdem,
  adicionar,
}: {
  fornecedorId: string
  jaNaOrdem: readonly LinhaNoFormulario[]
  adicionar: (linhas: LinhaDaGrade[]) => void
}) {
  const [aberta, setAberta] = useState(false)
  const { data: pedidos, isPending, isError } = usePedidosComLinhaAberta(fornecedorId, aberta)

  function trazer(indice: number) {
    const pedido = pedidos?.[indice]
    if (!pedido) return
    const candidatas = linhasAbertasParaOrdem(pedido, fornecedorId)
      .filter(
        (linha) =>
          !jaNaOrdem.some(
            (existente) =>
              existente.pedidoOrigemId === linha.pedidoOrigemId &&
              existente.linhaDeOrigem === linha.linhaDeOrigem,
          ),
      )
      .map(linhaParaFormulario)
    adicionar(candidatas as unknown as LinhaDaGrade[])
    setAberta(false)
  }

  return (
    <>
      <AcaoDoRodape
        onClick={() => {
          if (fornecedorId) setAberta(true)
        }}
      >
        <List className="size-4 text-modulo" /> De pedidos
      </AcaoDoRodape>
      {aberta ? (
        <Sheet
          isOpen={aberta}
          onOpenChange={setAberta}
          side="right"
          className="data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Pedidos em aberto deste fornecedor</SheetTitle>
            <SheetDescription>
              A ordem não tem linha própria: toda linha vem de um pedido de compra que ainda não foi
              levado por outra ordem.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            {isPending ? (
              <p className="text-muted-foreground text-sm">Carregando…</p>
            ) : isError ? (
              <p className="text-sm text-warn">Não foi possível consultar os pedidos de compra.</p>
            ) : (pedidos ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum pedido com linha em aberto para este fornecedor.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(pedidos ?? []).map((pedido, indice) => (
                  <li key={pedido.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-semibold">{pedido.numero}</span>{' '}
                      <span className="text-muted-foreground">
                        {formatDateBR(pedido.dataEmissao)}
                        {pedido.cliente ? ` · ${pedido.cliente}` : ' · estoque'}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => trazer(indice)}
                    >
                      Trazer linhas
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

export function ItensDaOrdem({ fornecedorId }: { fornecedorId: string }) {
  const itens = (useWatch({ name: 'itens' }) as LinhaNoFormulario[] | undefined) ?? []
  const desconto = (useWatch({ name: 'descontoPercentual' }) as number) ?? 0
  const acrescimo = (useWatch({ name: 'acrescimoCentavos' }) as number) ?? 0

  const subtotal = subtotalDaOrdem(itens)
  // O desconto é percentual com 4 casas implícitas sobre um subtotal em
  // centavos: `10000` = 1%, então o divisor é 1.000.000 e a conta fecha em
  // inteiro sem passar por nenhum float intermediário.
  const descontoEmCentavos = Math.round((subtotal * desconto) / 1_000_000)

  const fontes: FonteDeItens[] = [
    {
      id: 'pedidos',
      render: (adicionar) => (
        <FolhaDePedidosAbertos
          fornecedorId={fornecedorId}
          jaNaOrdem={itens}
          adicionar={adicionar}
        />
      ),
    },
  ]

  return (
    <GradeDeItens
      name="itens"
      semAdicionar
      vazio="Nenhuma linha ainda — traga do pedido de compra pelo rodapé."
      fontes={fontes}
      colunas={[
        {
          // A VOLTA para o pedido: qual documento originou esta linha. Código,
          // não texto — é o que o operador copia para procurar o outro lado.
          key: 'pedidoOrigemNumero',
          rotulo: 'Ped. Compra',
          papel: 'calculada',
          calcular: (linha) => String(linha.pedidoOrigemNumero ?? '') || '—',
        },
        {
          key: 'descricao',
          rotulo: 'Descrição do Produto',
          papel: 'descricao',
          // Acabamento e tamanho descem para o subtítulo: duas colunas de
          // texto curto viravam duas colunas quase vazias na largura toda.
          subtituloKey: 'acabamento',
        },
        { key: 'tamanho', rotulo: 'Tamanho' },
        { key: 'quantidade', rotulo: 'Quantidade', papel: 'quantidade' },
        { key: 'unidade', rotulo: 'Unidade', papel: 'select', opcoes: tabelas.unidades },
        { key: 'custoUnitarioCentavos', rotulo: 'Custo Unit.', papel: 'money' },
        {
          key: 'valorTotal',
          rotulo: 'Valor Total',
          papel: 'calculada',
          calcular: (linha) => formatMoneyBRL(totalDaLinhaDaOrdem(linha)),
        },
        {
          key: 'destinoRotulo',
          rotulo: 'Destino',
          papel: 'calculada',
          calcular: (linha) => String(linha.destinoRotulo ?? '') || '—',
        },
      ]}
      linhaNova={{}}
      totais={{
        totalDaLinha: totalDaLinhaDaOrdem,
        ajustes: [
          {
            rotulo: `Desconto (${formatPercent(desconto)}%)`,
            valorCentavos: descontoEmCentavos,
            sinal: -1,
          },
          { rotulo: 'Acréscimo', valorCentavos: acrescimo, sinal: 1 },
        ],
      }}
    />
  )
}
