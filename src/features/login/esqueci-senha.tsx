import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { TextField } from '@/components/cabinet/form-controls'
import { Button, buttonVariants } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { usePedirRecuperacao } from '@/data/sessao'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const esqueciSenhaSchema = z.object({
  // `z.email()` e não `z.string().email()`: no Zod 4 o segundo é o legado, e a
  // mesma forma que `/login` usa — dois jeitos de dizer a mesma regra divergem
  // na primeira atualização.
  email: z.email('E-mail inválido.').min(1, 'Informe o e-mail.'),
})

type EsqueciSenhaValores = z.infer<typeof esqueciSenhaSchema>

/**
 * ESQUECI A SENHA — o pedido do link.
 *
 * **A tela NÃO diz se a conta existe**, e essa é a decisão inteira: o servidor
 * responde 202 exista ela ou não, e uma tela que mostrasse "e-mail não
 * cadastrado" desfaria a defesa — bastaria digitar endereços para descobrir
 * quem tem conta aqui. Por isso o aviso de sucesso é redigido no condicional:
 * *"se houver conta com esse e-mail"*.
 *
 * Pública e fora do shell, como o login: quem chega aqui não tem sessão.
 */
export function EsqueciSenhaTela() {
  const pedir = usePedirRecuperacao()
  const form = useForm<EsqueciSenhaValores>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: '' },
  })

  return (
    <div className="bg-paper-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-panel border-2 border-border bg-card p-4 shadow-el3">
        <div className="mb-4">
          <BandaDeIdentidade titulo="Cabinet" contexto="Esqueci a senha" />
        </div>

        {pedir.isSuccess ? (
          <>
            {/* `<output>` e não `<p role="status">`: o elemento já carrega o
                papel, e o leitor de tela anuncia a mudança sem depender de um
                atributo posto à mão. */}
            <output className="block text-sm text-muted-foreground">
              Se houver uma conta com esse e-mail, o link para escolher uma senha nova chegou nela.
              O link vale por 1 hora e só pode ser usado uma vez.
            </output>
            <Link
              to="/login"
              className={buttonVariants({ variant: 'outline', className: 'mt-4 w-full' })}
            >
              Voltar para a entrada
            </Link>
          </>
        ) : (
          <Form {...form}>
            {/*
              `noValidate`: com `type="email"`, o browser barra o envio ANTES do
              Zod e mostra uma bolha própria, em inglês e fora do desenho —
              medido, o `handleSubmit` nem chegava a rodar. A validação é do
              schema, e a mensagem tem de sair no mesmo lugar das outras.
            */}
            <form
              noValidate
              onSubmit={form.handleSubmit(({ email }) => pedir.mutate(email))}
              className="flex flex-col gap-3"
            >
              <p className="text-sm text-muted-foreground">
                Informe o e-mail com que você entra. Mandaremos um link para escolher uma senha
                nova.
              </p>
              <TextField
                name="email"
                label="E-mail"
                type="email"
                autoComplete="username"
                autoFocus
              />
              {pedir.error && (
                <p role="alert" className="text-xs text-destructive">
                  {pedir.error.message}
                </p>
              )}
              <Button type="submit" disabled={pedir.isPending} className="mt-1">
                {pedir.isPending ? 'Enviando…' : 'Enviar link'}
              </Button>
              <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Voltar para a entrada
              </Link>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
