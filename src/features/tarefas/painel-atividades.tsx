import type { ActivityDto } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Nome } from '@/components/cabinet/nome'
import { Painel } from '@/components/cabinet/painel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type AlvoDaAtividade,
  type Atividade,
  atividadeAtrasada,
  atividadeDoContrato,
  atividadeVazia,
  useAtividades,
  useConcluirAtividade,
} from '@/data/atividades-api'
import { diaDoInstante } from '@/lib/datas'
import { formatDateBR } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Check, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { DialogoDeAtividade, ROTULO_DO_TIPO } from './atividade-dialogo'

/**
 * PAINEL DE ATIVIDADES — o que está agendado sobre ESTE registro.
 *
 * Monta em qualquer tela de registro que o contrato cubra (oportunidade,
 * parceiro, orçamento, pedido de compra): a tabela `activities` é polimórfica
 * (#66) e o painel recebe o alvo por propriedade, não por importação. É por isso
 * que ele mora em `features/tarefas/` e não dentro do CRM — atividade não é do
 * módulo onde aparece.
 *
 * ## O que o painel mostra, e o que ele NÃO faz
 *
 * Pendentes primeiro, concluídas depois, na ORDEM QUE O SERVIDOR MANDOU: o
 * contrato publica essa ordem, e reordenar aqui faria a tela discordar da
 * paginação no dia em que a lista passar de uma página. A separação visual é
 * uma partição da mesma lista, que preserva a ordem recebida.
 *
 * **Concluir é botão, não checkbox.** Checkbox promete os dois sentidos e o
 * contrato só tem um: atividade concluída é registro do que aconteceu, e o que
 * se refaz é uma atividade nova. Oferecer o clique de volta seria oferecer um
 * 409.
 *
 * **O painel diz quando não está mostrando tudo.** A consulta pede o teto do
 * contrato (100); se o registro tiver mais, o rodapé fala. Recorte silencioso
 * viraria "não existe" para o operador.
 */
export function PainelDeAtividades({ alvo }: { alvo: AlvoDaAtividade }) {
  const query = useAtividades(alvo)
  const concluir = useConcluirAtividade()
  const [emEdicao, setEmEdicao] = useState<Atividade | null>(null)

  const linhas = query.data?.rows ?? []
  const pendentes = linhas.filter((a) => !a.doneAt)
  const concluidas = linhas.filter((a) => a.doneAt)
  const total = query.data?.total ?? 0

  return (
    <Painel
      titulo="Atividades"
      tinta="warn"
      acao={
        <Button size="sm" onClick={() => setEmEdicao(atividadeVazia(alvo))}>
          <Plus />
          Nova atividade
        </Button>
      }
    >
      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {['a1', 'a2', 'a3'].map((chave) => (
            <Skeleton key={chave} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <FalhaDoPainel
          titulo="As atividades não carregaram"
          erro={query.error}
          aoTentar={() => query.refetch()}
        />
      ) : linhas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nada agendado neste registro. O que ficar combinado aqui aparece nesta lista.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendentes.map((atividade) => (
            <LinhaDeAtividade
              key={atividade.id}
              atividade={atividade}
              concluindo={concluir.isPending && concluir.variables === atividade.id}
              aoConcluir={() => concluir.mutate(atividade.id)}
              aoAlterar={() => setEmEdicao(atividadeDoContrato(atividade))}
            />
          ))}

          {concluidas.length > 0 ? (
            <li>
              <h3 className="mt-2 border-t pt-2 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
                Concluídas
              </h3>
            </li>
          ) : null}

          {concluidas.map((atividade) => (
            <LinhaDeAtividade
              key={atividade.id}
              atividade={atividade}
              concluindo={false}
              aoConcluir={() => undefined}
              aoAlterar={() => setEmEdicao(atividadeDoContrato(atividade))}
            />
          ))}
        </ul>
      )}

      {concluir.isError ? (
        <p role="alert" className="text-[0.75rem] text-destructive">
          Falha ao concluir a atividade.
        </p>
      ) : null}

      {total > linhas.length ? (
        <p className="text-[0.75rem] text-muted-foreground">
          Mostrando {linhas.length} de {total} atividades deste registro.
        </p>
      ) : null}

      {emEdicao ? (
        <DialogoDeAtividade
          aberto
          atividade={emEdicao}
          onOpenChange={(aberto) => {
            if (!aberto) setEmEdicao(null)
          }}
        />
      ) : null}
    </Painel>
  )
}

/**
 * Uma linha: o que é, quando vence, de quem é — e as duas ações.
 *
 * O atraso fala por TEXTO ("atrasada"), não só por cor: cor sozinha não chega a
 * quem não a distingue, e é a mesma regra que a etapa apodrecida do funil segue.
 */
function LinhaDeAtividade({
  atividade,
  concluindo,
  aoConcluir,
  aoAlterar,
}: {
  atividade: ActivityDto
  concluindo: boolean
  aoConcluir: () => void
  aoAlterar: () => void
}) {
  const concluida = Boolean(atividade.doneAt)
  const atrasada = atividadeAtrasada(atividade)

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-2 last:border-b-0">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
        {ROTULO_DO_TIPO[atividade.kind]}
      </span>

      <span className={cn('font-semibold', concluida && 'text-muted-foreground line-through')}>
        {atividade.title}
      </span>

      <span className="text-[0.75rem] text-muted-foreground tabular-nums">
        {/* `doneAt` é INSTANTE (o servidor carimba com hora); `dueDate` é dia.
            Passar o instante direto ao `formatDateBR` daria "14T12:00:00Z" no
            lugar do dia — o corte para o fuso local é `diaDoInstante`. */}
        {concluida
          ? `concluída em ${formatDateBR(diaDoInstante(atividade.doneAt as string))}`
          : atividade.dueDate
            ? formatDateBR(atividade.dueDate)
            : 'sem prazo'}
      </span>

      {atrasada ? (
        <span className="font-semibold text-[0.75rem] text-destructive">atrasada</span>
      ) : null}

      {atividade.assigneeName ? (
        <span className="text-[0.75rem] text-muted-foreground">
          <Nome>{atividade.assigneeName}</Nome>
        </span>
      ) : null}

      <span className="ml-auto flex items-center gap-1">
        {concluida ? null : (
          <Button
            size="sm"
            variant="outline"
            isDisabled={concluindo}
            onClick={aoConcluir}
            aria-label={`Concluir: ${atividade.title}`}
          >
            <Check />
            Concluir
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={aoAlterar}
          aria-label={`Alterar: ${atividade.title}`}
        >
          <Pencil />
          Alterar
        </Button>
      </span>
    </li>
  )
}
