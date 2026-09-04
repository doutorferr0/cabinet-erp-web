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
import { useRevisarOrcamento } from '@/data/quotes-api'
import { type FrasesDeRecusa, mensagemDaRecusa, typeDoErro } from '@/lib/erros'
import { useNavigate } from '@tanstack/react-router'

/**
 * REVISAR o orçamento — o gesto que faltava para o caso mais banal da mesa.
 *
 * **O caso real:** o cliente mudou de ideia e o vendedor emitiu DOIS orçamentos
 * no mesmo dia. No legado nada no dado dizia que o segundo substitui o primeiro
 * — quem lia a listagem contava dois negócios onde havia um, e a pergunta "qual
 * é a versão vigente?" não tinha resposta em lugar nenhum.
 *
 * A revisão é documento NOVO apontando para o anterior, e não uma edição. O que
 * o cliente tem na mão é o orçamento que saiu pela porta: editá-lo apagaria a
 * proposta apresentada, e a pergunta "o que mudou entre uma e outra?" perderia
 * as duas pontas.
 *
 * ## Por que a confirmação existe, se revisar não apaga nada
 *
 * Pelo mesmo motivo do `Gerar Pedido`, que é o precedente desta caixa: o
 * orçamento fica intacto, e mesmo assim o gesto é de mão única. O contrato
 * responde 409 à segunda revisão do MESMO documento e não publica caminho para
 * desfazer a que nasceu — ela só pode ser cancelada, que é situação e não
 * desfazimento. Um clique sem parada criaria um documento a mais no primeiro
 * clique errado, e o número saltado só apareceria depois.
 *
 * ## As duas recusas, e por que a tela antecipa uma e traduz a outra
 *
 * `orcamento-ja-revisado` diz "já aconteceu", e aqui a saída EXISTE — ao
 * contrário do `pedido-ja-convertido`, que não tem como chegar no pedido
 * gerado. A cadeia é navegável do original para a revisão pelo `filters` de
 * `revisionOfId`... e não é: `revisionOfId` está fora da whitelist de `filters`
 * de `/api/quotes`, medido no contrato. Então a caixa faz o que é honesto —
 * manda para a listagem e diz que a revisão está lá, com número maior. Fechar
 * esse buraco é PR de contrato, não de tela.
 *
 * O orçamento CANCELADO é a outra, e a tela a antecipa: com a situação já na
 * mão, ela não oferece o gesto. Revisar o que foi retirado da mesa é
 * ressuscitar por outro nome. A tradução continua aqui porque a situação pode
 * ter mudado na sessão de outra pessoa entre a listagem carregar e o clique
 * acontecer — e nesse caso o servidor responde `transicao-invalida`, a URN
 * única da máquina de estados, não uma própria da revisão.
 */
const RECUSAS: FrasesDeRecusa = {
  [ProblemType['urn:cabinet:erro:orcamento-ja-revisado']]:
    'Este orçamento já tem uma revisão. A próxima sai da mais recente — senão a cadeia de versões vira árvore, e "qual vale" fica sem resposta.',
  [ProblemType['urn:cabinet:erro:transicao-invalida']]:
    'A situação atual não permite revisar. Recarregue a listagem para ver como o documento está agora.',
}

export interface RevisarOrcamentoProps {
  /** O orçamento selecionado na listagem. `null` mantém a caixa fechada. */
  orcamento: QuoteDto | null
  onFechar: () => void
}

export function RevisarOrcamento({ orcamento, onFechar }: RevisarOrcamentoProps) {
  const navigate = useNavigate()
  const revisar = useRevisarOrcamento()

  const cancelado = orcamento?.status === 'cancelled'
  const jaRevisado =
    typeDoErro(revisar.error) === ProblemType['urn:cabinet:erro:orcamento-ja-revisado']
  const erro = mensagemDaRecusa(revisar.error, 'Não foi possível revisar o orçamento.', RECUSAS)

  function fechar() {
    onFechar()
    // O `reset` é o que impede a recusa da tentativa anterior de aparecer já
    // dentro da caixa na PRÓXIMA abertura, sobre um orçamento que não é o
    // mesmo — um erro herdado acusando o documento errado.
    revisar.reset()
  }

  // `revision` é opcional no contrato: documento gravado antes de a revisão
  // existir não traz o campo, e ele é o original.
  const atual = orcamento?.revision ?? 1

  return (
    <AlertDialog isOpen={orcamento !== null} onOpenChange={(open) => !open && fechar()}>
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          <AlertDialogMedia>
            <FormaDoModulo tamanho={40} />
          </AlertDialogMedia>
          {/* O título acompanha a RECUSA, como no `Gerar Pedido`: continuar
              perguntando "revisar?" com o corpo dizendo que já foi revisado
              deixaria a caixa afirmando duas coisas opostas, e a pergunta é a
              que o olho lê primeiro. */}
          <AlertDialogTitle>
            {cancelado
              ? `O orçamento ${orcamento?.number} está cancelado`
              : jaRevisado
                ? `O orçamento ${orcamento?.number} já tem revisão`
                : `Revisar o orçamento ${orcamento?.number}?`}
          </AlertDialogTitle>
        </div>
        <AlertDialogDescription>
          {jaRevisado ? (
            <>
              Este orçamento já foi revisado. A próxima revisão sai da <strong>mais recente</strong>
              , e não desta — a cadeia de versões é uma fila, não uma árvore.
            </>
          ) : cancelado ? (
            <>
              Orçamento cancelado não se revisa: seria ressuscitá-lo por outro nome. Para retomar
              esta venda, emita um novo orçamento — nada será enviado ao servidor.
            </>
          ) : (
            <>
              Nasce um orçamento <strong>novo</strong> — cópia do cabeçalho, dos ambientes e dos
              itens —, marcado como <strong>revisão {atual + 1}</strong> e apontando para este. O{' '}
              <Nome peso="forte">orçamento {orcamento?.number}</Nome> continua na listagem{' '}
              <strong>como foi apresentado ao cliente</strong>: é ele que está na mão de quem
              recebeu a proposta.
            </>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {erro ? (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-xs text-destructive">
            {erro}
          </p>
          {jaRevisado ? (
            // Não é um link para A revisão: `revisionOfId` está fora do
            // `filters` de `/api/quotes`, então o front não tem como pedir "a
            // revisão deste". Dizer pelo que procurar é o máximo honesto —
            // prometer "abrir a revisão" e cair na lista inteira seria pior que
            // a frase.
            <p className="text-xs text-muted-foreground">
              A revisão está nesta mesma listagem, com número maior que {orcamento?.number} e o
              mesmo cliente ({orcamento?.customerName}).
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={fechar}>
          {cancelado ? 'Fechar' : 'Voltar'}
        </AlertDialogCancel>
        {cancelado || jaRevisado ? null : (
          <AlertDialogAction
            type="button"
            variant="default"
            disabled={revisar.isPending}
            onClick={() => {
              if (!orcamento) return
              revisar.mutate(orcamento.id, {
                onSuccess: (revisao) => {
                  onFechar()
                  // Navega para a revisão NOVA, e não de volta para a listagem:
                  // o documento que acabou de existir é o que o operador vai
                  // conferir e ajustar — revisar existe porque algo mudou, e o
                  // que mudou ainda não está lá dentro. Voltar para a lista
                  // deixaria a tela igual à de antes do clique, que é também
                  // como um clique sem efeito parece.
                  void navigate({
                    to: '/vendas/orcamentos/$orcamentoId',
                    params: { orcamentoId: revisao.id },
                  })
                },
              })
            }}
          >
            {revisar.isPending ? 'Revisando…' : 'Revisar orçamento'}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialog>
  )
}
