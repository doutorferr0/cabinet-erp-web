import { TextField } from '@/components/cabinet/form-controls'
import { PageHeader } from '@/components/cabinet/page-header'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useTrocarSenha } from '@/data/sessao'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const trocaSenhaSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    // Sem regra de complexidade inventada: a política de senha é do backend,
    // que responde 400 com `detail` quando a senha nova não serve.
    newPassword: z.string().min(1, 'Informe a senha nova.'),
    // Confirmação é validação de digitação, só existe no cliente — não viaja
    // no contrato (`ChangePasswordRequest` é currentPassword + newPassword).
    confirmacao: z.string().min(1, 'Confirme a senha nova.'),
  })
  .refine((v) => v.newPassword === v.confirmacao, {
    message: 'A confirmação não confere com a senha nova.',
    path: ['confirmacao'],
  })

type TrocaSenhaValores = z.infer<typeof trocaSenhaSchema>

/**
 * Troca de senha — fora do shell (quem está trocando ainda não tem sistema
 * para navegar) mas ATRÁS da guarda: sem sessão o endpoint responde 401.
 *
 * Destino principal é o fluxo de senha provisória: o login responde
 * `mustChangePassword: true` e manda para cá. A mesma tela serve para troca
 * voluntária — a rota é pública no sentido de não precisar do flag.
 */
export function TrocarSenhaTela() {
  const navigate = useNavigate()
  const trocar = useTrocarSenha()
  const form = useForm<TrocaSenhaValores>({
    resolver: zodResolver(trocaSenhaSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmacao: '' },
  })

  function confirmar({ currentPassword, newPassword }: TrocaSenhaValores) {
    // Mesmo destino do login: trocada a senha, o operador entra onde entraria.
    trocar.mutate(
      { currentPassword, newPassword },
      { onSuccess: () => navigate({ to: '/dashboard' }) },
    )
  }

  return (
    // Mesma folha da tela de entrar — sem Stipple: aqui o operador está no meio
    // de uma tarefa obrigatória, não na porta de entrada.
    <div className="bg-paper-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-panel border-2 border-border bg-card p-4 shadow-el3">
        <div className="mb-4">
          <PageHeader titulo="Cabinet" contexto="Trocar senha" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(confirmar)} className="flex flex-col gap-3">
            <TextField
              name="currentPassword"
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            <TextField
              name="newPassword"
              label="Senha nova"
              type="password"
              autoComplete="new-password"
            />
            <TextField
              name="confirmacao"
              label="Confirmar senha nova"
              type="password"
              autoComplete="new-password"
            />
            {trocar.error && (
              <p role="alert" className="text-xs text-destructive">
                {trocar.error.message}
              </p>
            )}
            <Button type="submit" disabled={trocar.isPending} className="mt-1">
              {trocar.isPending ? 'Trocando…' : 'Trocar senha'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
