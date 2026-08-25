import type { TaskDtoPriority, TaskDtoStatus } from '@/api/gerado'
import { DateField, TextField, TextareaField } from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { COLUNAS, useCriarTarefa } from '@/data/dashboard-api'
import { mensagemDoErro } from '@/lib/erros'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

/**
 * NOVA TAREFA — o diálogo do botão primário e do `+` de cada coluna.
 *
 * O `status` chega de fora porque o `+` da coluna já disse em qual coluna a
 * tarefa nasce: reperguntar seria desfazer o que o clique acabou de informar. O
 * campo continua na tela, editável — quem abriu pelo botão do cabeçalho precisa
 * escolher, e quem abriu pela coluna pode ter errado a coluna.
 *
 * Validação em Zod local (`// TODO(contract)`: os schemas Zod do codegen cobrem
 * o corpo, mas ainda não as regras de tela). Título obrigatório é a única regra
 * dura, e é a mesma que o handler cobra — inventar obrigatoriedade que o
 * servidor não tem faria a tela recusar dado que o backend aceita.
 */

const esquema = z.object({
  title: z.string().trim().min(1, 'Informe o título da tarefa.'),
  description: z.string().trim().optional(),
  status: z.enum(['todo', 'doing', 'review', 'done']),
  priority: z.enum(['high', 'medium', 'low']),
  dueOn: z.string().optional(),
})

type Campos = z.infer<typeof esquema>

/** Rótulo em PT-BR ↔ valor do contrato: o `<select>` do repo lista strings. */
const PRIORIDADE_POR_ROTULO: Record<string, TaskDtoPriority> = {
  Alta: 'high',
  Média: 'medium',
  Baixa: 'low',
}
const ROTULO_DA_PRIORIDADE: Record<TaskDtoPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}
const STATUS_POR_ROTULO = Object.fromEntries(
  COLUNAS.map((coluna) => [coluna.titulo, coluna.status]),
) as Record<string, TaskDtoStatus>
const ROTULO_DO_STATUS = Object.fromEntries(
  COLUNAS.map((coluna) => [coluna.status, coluna.titulo]),
) as Record<TaskDtoStatus, string>

export function NovaTarefa({
  aberto,
  statusInicial,
  onOpenChange,
}: {
  aberto: boolean
  statusInicial: TaskDtoStatus
  onOpenChange: (aberto: boolean) => void
}) {
  const criar = useCriarTarefa()

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      title: '',
      description: '',
      status: statusInicial,
      priority: 'medium',
      dueOn: '',
    },
    // A coluna do `+` muda entre uma abertura e outra; sem isto o formulário
    // guardaria a coluna da vez anterior.
    values: {
      title: '',
      description: '',
      status: statusInicial,
      priority: 'medium',
      dueOn: '',
    },
    resetOptions: { keepDirtyValues: true },
  })

  function gravar(campos: Campos) {
    criar.mutate(
      {
        title: campos.title,
        description: campos.description?.trim() ? campos.description : null,
        status: campos.status,
        priority: campos.priority,
        dueOn: campos.dueOn?.trim() ? campos.dueOn : null,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={onOpenChange} className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova tarefa</DialogTitle>
        <DialogDescription>A tarefa entra no quadro da empresa ativa.</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(gravar)} className="flex flex-col gap-3">
          <TextField name="title" label="Título" autoFocus />
          <TextareaField name="description" label="Descrição" rows={2} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectFieldTraduzido
              name="status"
              label="Coluna"
              rotulos={Object.keys(STATUS_POR_ROTULO)}
              paraRotulo={(v: string) => ROTULO_DO_STATUS[v as TaskDtoStatus] ?? ''}
              paraValor={(r: string) => STATUS_POR_ROTULO[r] ?? 'todo'}
              form={form}
            />
            <SelectFieldTraduzido
              name="priority"
              label="Prioridade"
              rotulos={Object.keys(PRIORIDADE_POR_ROTULO)}
              paraRotulo={(v: string) => ROTULO_DA_PRIORIDADE[v as TaskDtoPriority] ?? ''}
              paraValor={(r: string) => PRIORIDADE_POR_ROTULO[r] ?? 'medium'}
              form={form}
            />
            <DateField name="dueOn" label="Prazo" />
          </div>

          {criar.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {/* `error.message` do `ErroDaApi` é a frase do adaptador, não o
                  `detail`: o servidor dizia por que recusou e a caixa mostrava
                  "Falha ao criar a tarefa." por cima. */}
              {mensagemDoErro(criar.error, 'Falha ao criar a tarefa.')}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isDisabled={criar.isPending}>
              {criar.isPending ? 'Gravando…' : 'Gravar'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Dialog>
  )
}

/**
 * `SelectField` do repo, com tradução rótulo↔valor.
 *
 * O `SelectField` compartilhado lista STRINGS e grava a própria string: serve à
 * transcrição, onde a opção é o texto. Aqui o valor é enum do contrato
 * (`todo`/`doing`…) e o operador lê "A fazer" — gravar o rótulo mandaria
 * português para o servidor. A tradução fica neste arquivo em vez de virar
 * variante do componente compartilhado porque é o primeiro caso; se aparecer um
 * segundo, ela sobe para `form-controls`.
 */
function SelectFieldTraduzido({
  name,
  label,
  rotulos,
  paraRotulo,
  paraValor,
  form,
}: {
  name: 'status' | 'priority'
  label: string
  rotulos: string[]
  paraRotulo: (valor: string) => string
  paraValor: (rotulo: string) => string
  form: ReturnType<typeof useForm<Campos>>
}) {
  const valor = form.watch(name)
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
        {label}
        <select
          className="mt-1 flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 font-sans text-sm normal-case tracking-normal outline-none focus-visible:focus-ring"
          value={paraRotulo(valor)}
          onChange={(evento) =>
            form.setValue(name, paraValor(evento.target.value) as Campos[typeof name])
          }
        >
          {rotulos.map((rotulo) => (
            <option key={rotulo} value={rotulo}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
