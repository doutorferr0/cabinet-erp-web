import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { type Oportunidade, useGerarOrcamento } from '@/data/crm-api'
import { Link, useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'

/**
 * GERAR O ORÇAMENTO da oportunidade, ou ir até o que já existe.
 *
 * ## A amarra do núcleo, e o que ela decide na tela
 *
 * A oportunidade **não congela** especificação nem preço — quem congela é o
 * orçamento. Por isso o documento nasce SEM ITEM, com cliente e nome do projeto
 * copiados, e o operador o preenche depois. Copiar o `Valor previsto` para um
 * item inventado daria um documento com preço que ninguém cotou, e é justamente
 * o número que o cliente leria como proposta.
 *
 * ## Por que o botão some depois, em vez de desabilitar
 *
 * Com `quoteId` preenchido a peça vira LINK para o documento. Não é economia de
 * pixel: um botão desabilitado convida a perguntar "por que não posso?", e a
 * resposta ("porque já existe") é exatamente o que o link já responde levando
 * lá. Gerar um segundo é 409 no contrato — dois documentos para o mesmo negócio
 * é o que o vínculo existe para impedir.
 *
 * ## Lead sem cadastro não vira orçamento
 *
 * O orçamento exige `customerId`, e lead com contato solto não tem parceiro. O
 * servidor responde 400; a tela **antecipa** — desabilita e diz o que fazer, em
 * vez de deixar o operador descobrir clicando. É a mesma regra do campo fora da
 * whitelist: erro conhecido não se transforma em erro do operador.
 */
export function GerarOrcamento({ readOnly }: { readOnly: boolean }) {
  const navigate = useNavigate()
  const gerar = useGerarOrcamento()
  const { setValue } = useFormContext<Oportunidade>()

  const id = useWatch<Oportunidade, 'id'>({ name: 'id' })
  const orcamentoId = useWatch<Oportunidade, 'orcamentoId'>({ name: 'orcamentoId' })
  const parceiroId = useWatch<Oportunidade, 'parceiroId'>({ name: 'parceiroId' })

  if (orcamentoId) {
    return (
      <p className="text-sm">
        Orçamento gerado:{' '}
        <Link
          to="/vendas/orcamentos/$orcamentoId"
          params={{ orcamentoId }}
          className="font-semibold underline underline-offset-2"
        >
          abrir o documento
        </Link>
      </p>
    )
  }

  // Oportunidade ainda não gravada não tem id para o servidor converter. Não é
  // caso de erro: é ordem — gravar primeiro, gerar depois.
  const semRegistro = !id
  const semParceiro = !parceiroId

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={readOnly || semRegistro || semParceiro || gerar.isPending}
        onClick={() =>
          gerar.mutate(id, {
            onSuccess: (orcamento) => {
              // O vínculo já está gravado no servidor; refletir no formulário
              // evita que um `Gravar` seguinte mande `quoteId: null` e desfaça
              // o que acabou de acontecer — `PUT` substitui o registro inteiro.
              setValue('orcamentoId', orcamento.id, { shouldDirty: false })
              void navigate({
                to: '/vendas/orcamentos/$orcamentoId',
                params: { orcamentoId: orcamento.id },
              })
            },
          })
        }
      >
        <FileText className="text-modulo" />
        {gerar.isPending ? 'Gerando…' : 'Gerar orçamento'}
      </Button>

      {semRegistro ? (
        <span className="text-[0.75rem] text-muted-foreground">
          Grave a oportunidade antes de gerar o orçamento.
        </span>
      ) : semParceiro ? (
        <span className="text-[0.75rem] text-muted-foreground">
          Lead sem cadastro não vira orçamento — escolha o cliente acima.
        </span>
      ) : (
        <span className="text-[0.75rem] text-muted-foreground">
          O documento nasce sem itens: a oportunidade não congela preço.
        </span>
      )}

      <ErroDeGravacao erro={gerar.error} mensagem="Falha ao gerar o orçamento." />
    </div>
  )
}
