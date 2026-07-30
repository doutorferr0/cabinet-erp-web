import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { type DefaultValues, type FieldValues, type Resolver, useForm } from 'react-hook-form'
import type { z } from 'zod'

export interface CadastroFormProps<T extends FieldValues> {
  /** TODO(contract): o Zod do codegen substituirá estes schemas na integração. */
  schema: z.ZodTypeAny
  defaultValues: DefaultValues<T>
  onGravar: (values: T) => void
  onCancelar: () => void
  /**
   * Modo `Consul.` da barra de ações (§9 padrão 8): mesma tela, sem edição.
   * Desabilita TODO o conteúdo via `<fieldset disabled>` — inclusive botões de
   * busca e de incluir linha nas grades — e o rodapé vira só `Fechar`.
   */
  readOnly?: boolean
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
  readOnly = false,
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
        {/* `disabled` no fieldset cobre todo descendente sem prop por campo. */}
        <fieldset disabled={readOnly} className="min-h-0 flex-1 border-0 p-0">
          {children}
        </fieldset>
        {/* Rodapé é Documento (`bg-card`): senta na folha; régua superior em
            Régua Forte (DESIGN.md) — separa a tira de ações do conteúdo. */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-rule-strong border-t bg-card pt-3">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={onCancelar}>
              <X />
              Fechar
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onCancelar}>
                <X />
                Cancelar
              </Button>
              <Button type="submit">
                <Check />
                Gravar
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  )
}
