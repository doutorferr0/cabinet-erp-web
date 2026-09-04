import type { QuoteDto } from '@/api/gerado'
import { ProblemType } from '@/api/gerado'
import { FormaDoModulo } from '@/components/cabinet/forma'
import { Nome } from '@/components/cabinet/nome'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useConverterEmPedido } from '@/data/quotes-api'
import { type FrasesDeRecusa, mensagemDaRecusa, typeDoErro } from '@/lib/erros'
import { Link, useNavigate } from '@tanstack/react-router'

/**
 * GERAR O PEDIDO a partir do orçamento — o gesto pelo qual quase todo pedido
 * nasce.
 *
 * **99,8% dos pedidos do legado vêm de um orçamento.** A tela de pedido existe
 * e sabe incluir um documento em branco, mas esse é o caminho da exceção: o
 * caminho normal é o vendedor abrir a listagem de orçamentos, achar o que o
 * cliente aprovou, e convertê-lo. Sem este botão, a tela de pedido é uma tela
 * de digitação para um documento que ninguém digita.
 *
 * ## Por que a confirmação existe, se converter não apaga nada
 *
 * O orçamento fica intacto — e mesmo assim a conversão é de mão única: o
 * contrato responde 409 à segunda tentativa, e não publica caminho para
 * desfazer o pedido gerado (só cancelá-lo, que é situação, não desfazimento).
 * Um clique sem parada geraria um pedido a mais no primeiro clique errado, e o
 * erro só apareceria quando a compra saísse dobrada.
 *
 * ## As duas recusas do caminho, e por que só uma tem saída
 *
 * `pedido-ja-convertido` diz "já aconteceu" — a saída seria abrir o pedido que
 * existe, e ela **não é alcançável do front hoje**: `QuoteDto` não tem
 * `orderId`, e `quoteId` está fora da whitelist de `filters` de `/api/orders`.
 * Não há caminho do orçamento para o pedido que ele gerou. Em vez de inventar
 * uma busca que não é essa (procurar pelo nome do cliente devolve os pedidos
 * DELE, não este), a caixa manda o operador para a listagem de pedidos e diz o
 * que ele vai procurar. Fechar esse buraco é PR de contrato, não de tela.
 *
 * O outro 409 é o orçamento CANCELADO, e a tela o antecipa: com a situação já
 * na mão, ela não oferece o gesto — erro conhecido não se transforma em erro do
 * operador. A tradução dele continua aqui porque a situação pode ter mudado na
 * sessão de outra pessoa entre a listagem carregar e o clique acontecer.
 */
const RECUSAS: FrasesDeRecusa = {
  [ProblemType['urn:cabinet:erro:pedido-ja-convertido']]:
    'Este orçamento já virou pedido. Gerar um segundo faria a mesma venda sair duas vezes.',
}

/**
 * O que a caixa precisa saber do orçamento — três campos, e é de propósito
 * (D19, #487).
 *
 * Ela pedia o `QuoteDto` inteiro enquanto a listagem era o único lugar que a
 * abria. A FICHA a abre agora pela próxima ação do cabeçalho, e ali o documento
 * está na forma da tela (`Orcamento`), não na do contrato — exigir o DTO
 * obrigaria a rota a remontar um objeto de quinze campos para usar três, e os
 * doze inventados iriam parar aqui com cara de dado do servidor.
 */
export interface OrcamentoParaConverter {
  id: string
  number: QuoteDto['number']
  status: QuoteDto['status']
  /** O nome que a recusa `pedido-ja-convertido` manda o operador procurar. */
  customerName: QuoteDto['customerName']
}

export interface GerarPedidoProps {
  /** O orçamento escolhido — na listagem ou na ficha. `null` mantém a caixa fechada. */
  orcamento: OrcamentoParaConverter | null
  onFechar: () => void
}

export function GerarPedido({ orcamento, onFechar }: GerarPedidoProps) {
  const navigate = useNavigate()
  const converter = useConverterEmPedido()

  const cancelado = orcamento?.status === 'cancelled'
  const jaConvertido =
    typeDoErro(converter.error) === ProblemType['urn:cabinet:erro:pedido-ja-convertido']
  const erro = mensagemDaRecusa(
    converter.error,
    'Não foi possível gerar o pedido de venda.',
    RECUSAS,
  )

  function fechar() {
    onFechar()
    // O `reset` é o que impede a recusa da tentativa anterior de aparecer já
    // dentro da caixa na PRÓXIMA abertura, sobre um orçamento que não é o
    // mesmo — um erro herdado acusando o documento errado.
    converter.reset()
  }

  return (
    <AlertDialog isOpen={orcamento !== null} onOpenChange={(open) => !open && fechar()}>
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          <AlertDialogMedia>
            <FormaDoModulo tamanho={40} />
          </AlertDialogMedia>
          {/* O título acompanha a RECUSA. Continuar perguntando "gerar?" com o
              corpo dizendo que já foi gerado deixaria a caixa afirmando duas
              coisas opostas, e a pergunta é a que o olho lê primeiro. */}
          <AlertDialogTitle>
            {cancelado
              ? `O orçamento ${orcamento?.number} está cancelado`
              : jaConvertido
                ? `O orçamento ${orcamento?.number} já virou pedido`
                : `Gerar pedido do orçamento ${orcamento?.number}?`}
          </AlertDialogTitle>
        </div>
        <AlertDialogDescription>
          {jaConvertido ? (
            <>
              Este orçamento já tem um pedido. O documento que existe é o que vale — gerar outro
              faria a mesma venda sair duas vezes.
            </>
          ) : cancelado ? (
            <>
              Orçamento cancelado não vira pedido. Para retomar esta venda, emita um novo orçamento
              — nada será enviado ao servidor.
            </>
          ) : (
            <>
              O pedido nasce como <strong>cópia</strong> deste orçamento — cabeçalho, ambientes e
              itens, com o preço <strong>congelado agora</strong>, e não recalculado pelo catálogo
              de hoje. O <Nome peso="forte">orçamento {orcamento?.number}</Nome> continua na
              listagem, do jeito que está. <strong>A conversão acontece uma vez só</strong>: o mesmo
              orçamento não gera um segundo pedido.
            </>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {erro ? (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-xs text-destructive">
            {erro}
          </p>
          {jaConvertido ? (
            // Não é um link para O pedido: é o link para a LISTAGEM, porque o
            // contrato não dá ao front como chegar neste. Dizer pelo que
            // procurar é o máximo honesto — prometer "abrir o pedido" e cair
            // numa lista inteira seria pior que a frase.
            <p className="text-xs text-muted-foreground">
              <Link
                to="/vendas/pedidos"
                className="font-semibold underline underline-offset-2"
                onClick={fechar}
              >
                Abrir a listagem de Pedidos de Venda
              </Link>{' '}
              e procurar o pedido de {orcamento?.customerName}.
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={fechar}>
          {cancelado ? 'Fechar' : 'Voltar'}
        </AlertDialogCancel>
        {cancelado || jaConvertido ? null : (
          <AlertDialogAction
            type="button"
            variant="default"
            disabled={converter.isPending}
            onClick={() => {
              if (!orcamento) return
              converter.mutate(orcamento.id, {
                onSuccess: (pedido) => {
                  onFechar()
                  // Navega para o pedido NOVO, e não de volta para a listagem
                  // de orçamentos: o documento que acabou de existir é o que o
                  // operador vai conferir e completar. Voltar para a lista de
                  // onde ele veio deixaria a tela igual à de antes do clique,
                  // que é também como um clique sem efeito parece.
                  void navigate({
                    to: '/vendas/pedidos/$pedidoId',
                    params: { pedidoId: pedido.id },
                  })
                },
              })
            }}
          >
            {converter.isPending ? 'Gerando…' : 'Gerar pedido'}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialog>
  )
}
