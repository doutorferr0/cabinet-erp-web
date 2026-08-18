import type { ActivityDtoKind } from '@/api/gerado'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import {
  DateField,
  SelectIdField,
  TextField,
  TextareaField,
} from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import {
  type Atividade,
  atividadeParaContrato,
  useAlterarAtividade,
  useCriarAtividade,
} from '@/data/atividades-api'
import { useColaboradoresParaEscolha } from '@/data/crm-api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

/**
 * O diálogo de agendar e de remarcar — o MESMO, porque os campos são os mesmos.
 *
 * `id` vazio = atividade nova (`POST`); com id, é alteração (`PUT`). Duas telas
 * para o mesmo conjunto de campos só multiplicariam o lugar onde um campo pode
 * ficar para trás — e o `PUT` substitui o registro inteiro, então campo esquecido
 * aqui é campo apagado no servidor.
 */

/**
 * TODO(contract): o Zod do codegen substituirá este schema na integração.
 *
 * **Todo campo do `ActivityWriteRequest` está declarado**, inclusive
 * `alvoTipo`/`alvoId`, que o diálogo não edita: Zod descarta o que não declara e
 * o `PUT` substitui o registro inteiro — a soma das duas coisas apaga dado sem
 * mudar nada na tela. É a classe de defeito que `cobertura-de-escrita.test.ts`
 * vigia.
 */
export const atividadeSchema = z.object({
  id: z.string(),
  alvoTipo: z.enum(['opportunity', 'partner', 'quote', 'purchaseOrder']),
  alvoId: z.string(),
  tipo: z.enum(['call', 'meeting', 'email', 'task'], {
    error: 'Escolha o tipo da atividade.',
  }),
  titulo: z.string().trim().min(1, 'Informe o que precisa ser feito.'),
  prazo: z.string(),
  responsavelId: z.string().nullable(),
  observacao: z.string(),
})

/**
 * Rótulo em PT-BR ↔ valor do contrato.
 *
 * O conjunto é fechado e vem do contrato (`ActivityDtoKind`) — a lista de lá é
 * PROPOSTA do front, e cresce por PR no contrato, não aqui. Este mapa só
 * traduz: gravar o rótulo mandaria português para o servidor.
 */
export const ROTULO_DO_TIPO: Record<ActivityDtoKind, string> = {
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  task: 'Tarefa',
}

/**
 * As opções do campo Tipo, na forma que o `SelectIdField` pede: o VALOR é o do
 * contrato, o rótulo é o que o operador lê. É a peça certa aqui e não o
 * `SelectField` — aquele grava a própria string listada, e gravar "Ligação"
 * mandaria português para o servidor.
 */
const OPCOES_DE_TIPO = (Object.keys(ROTULO_DO_TIPO) as ActivityDtoKind[]).map((valor) => ({
  id: valor,
  nome: ROTULO_DO_TIPO[valor],
}))

export function DialogoDeAtividade({
  aberto,
  atividade,
  onOpenChange,
}: {
  aberto: boolean
  /** Registro em edição — vazio (`id: ''`) para agendar uma nova. */
  atividade: Atividade
  onOpenChange: (aberto: boolean) => void
}) {
  const criar = useCriarAtividade()
  const alterar = useAlterarAtividade()
  const colaboradores = useColaboradoresParaEscolha()
  const editando = atividade.id !== ''
  const gravar = editando ? alterar : criar

  const form = useForm<Atividade>({
    resolver: zodResolver(atividadeSchema),
    defaultValues: atividade,
    // O registro muda entre uma abertura e outra (nova, depois a linha X):
    // sem isto o diálogo mostraria o que foi editado da vez anterior.
    values: atividade,
    resetOptions: { keepDirtyValues: false },
  })

  function submeter(campos: Atividade) {
    const corpo = atividadeParaContrato(campos)
    const aoConcluir = {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    }
    if (editando) alterar.mutate({ id: campos.id, corpo }, aoConcluir)
    else criar.mutate(corpo, aoConcluir)
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={onOpenChange} className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{editando ? 'Alterar atividade' : 'Nova atividade'}</DialogTitle>
        <DialogDescription>
          A atividade fica agendada sobre este registro e aparece no painel dele.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submeter)} className="flex flex-col gap-3">
          <TextField name="titulo" label="O que precisa ser feito" autoFocus />

          <div className="grid gap-3 sm:grid-cols-3">
            <SelectIdField
              name="tipo"
              label="Tipo"
              vazio="Escolha o tipo"
              opcoes={OPCOES_DE_TIPO}
            />
            <DateField name="prazo" label="Prazo" />
            <SelectIdField
              name="responsavelId"
              label="Responsável"
              carregando={colaboradores.isPending}
              vazio="Sem responsável"
              opcoes={(colaboradores.data ?? []).map((c) => ({ id: c.id, nome: c.name }))}
              {...(atividade.responsavelId
                ? { valorAtual: { id: atividade.responsavelId, nome: 'Responsável atual' } }
                : {})}
            />
          </div>

          <TextareaField name="observacao" label="Observação" rows={2} />

          <ErroDeGravacao erro={gravar.error} mensagem="Falha ao gravar a atividade." />

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isDisabled={gravar.isPending}>
              {gravar.isPending ? 'Gravando…' : 'Gravar'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Dialog>
  )
}
