import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type DefaultValues, type FieldValues, type Resolver, useForm } from 'react-hook-form'
import type { z } from 'zod'

export interface CadastroFormProps<T extends FieldValues> {
  /** TODO(contract): o Zod do codegen substituirá estes schemas na integração. */
  schema: z.ZodTypeAny
  defaultValues: DefaultValues<T>
  onGravar: (values: T) => void
  onCancelar: () => void
  children: React.ReactNode
}

/**
 * Padrão "form com abas" da transcrição (§9): shadcn Tabs + RHF, 1 form por
 * tela (as abas ficam em `children`), rodapé fixo Gravar/Cancelar.
 */
export function CadastroForm<T extends FieldValues>({
  schema,
  defaultValues,
  onGravar,
  onCancelar,
  children,
}: CadastroFormProps<T>) {
  const form = useForm<T>({
    // zodResolver tipa pelo schema; com T genérico o casamento é garantido pelo caller.
    resolver: zodResolver(schema as unknown as z.ZodType<T, FieldValues>) as unknown as Resolver<T>,
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onGravar)} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0 flex-1">{children}</div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background pt-3">
          <Button type="button" variant="outline" onClick={onCancelar}>
            ✖ Cancelar
          </Button>
          <Button type="submit">✔ Gravar</Button>
        </div>
      </form>
    </Form>
  )
}
