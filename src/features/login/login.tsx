import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { TextField } from '@/components/cabinet/form-controls'
import { Ornamento } from '@/components/cabinet/ornamento'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useLogin } from '@/data/sessao'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.email('E-mail inválido.').min(1, 'Informe o e-mail.'),
  password: z.string().min(1, 'Informe a senha.'),
})

type LoginValores = z.infer<typeof loginSchema>

/**
 * Tela de entrada — a única fora do shell e da guarda.
 *
 * Forma: uma folha (Regra da Folha) centrada no Papel, sem sidebar nem
 * cabeçalho — quem não entrou não tem sistema para navegar. Mesma anatomia do
 * `DocumentoHeader`: título em Headline, etiqueta em Meta, régua forte
 * fechando o bloco.
 *
 * Destino principal é o fluxo de senha provisória: `LoginOk.mustChangePassword
 * === true` manda para `/trocar-senha` em vez de `/`. O que ainda NÃO há:
 * `/auth/me` não carrega o flag, então quem pular a troca (fechar e voltar)
 * entra normal — a guarda não tem como saber. Pergunta ao backend registrada
 * na memória: o flag precisa vir na `SessaoAtual`.
 */
export function LoginTela() {
  const navigate = useNavigate()
  const login = useLogin()
  const form = useForm<LoginValores>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function entrar(valores: LoginValores) {
    login.mutate(valores, {
      onSuccess: (resultado) =>
        navigate({ to: resultado.mustChangePassword ? '/trocar-senha' : '/' }),
    })
  }

  return (
    // Papel com grade + folha em caixa preta e sombra dura: a tela de sessão é
    // uma folha como qualquer outra.
    <div className="bg-paper-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-panel border-2 border-border bg-card p-4 shadow-el3">
        <div className="mb-4 flex items-center gap-3">
          {/* A MARCA do sistema, no lugar do Stipple. O login é a única tela
              onde a memória prevê composição de ornamentos — e é onde ela cabe:
              não há módulo (a sessão ainda não existe, então `data-modulo` não
              foi declarado), não há dado com que competir, e é aqui que o
              operador vê o sistema se apresentar.
              Três shapes empilhados, em roxo de marca com dois pastéis por trás
              — a única cor possível fora de módulo. `aria-hidden` vem do próprio
              `<Ornamento>`: quem diz o nome é a banda ao lado. */}
          <span className="relative inline-flex size-10 shrink-0 items-center justify-center">
            <Ornamento
              shape="marca-base"
              tom="modulo-suave"
              tamanho={40}
              className="absolute inset-0"
            />
            <Ornamento
              shape="marca-apoio"
              tom="info"
              tamanho={28}
              className="absolute opacity-70"
            />
            <Ornamento shape="marca" tom="marca" tamanho={22} className="relative" />
          </span>
          <BandaDeIdentidade titulo="Cabinet" contexto="Entrar" className="flex-1" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(entrar)} className="flex flex-col gap-3">
            <TextField
              name="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              // autoFocus: a tela tem um único propósito; o cursor já chega no campo.
              autoFocus
            />
            <TextField
              name="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
            />
            {login.error && (
              <p role="alert" className="text-xs text-destructive">
                {login.error.message}
              </p>
            )}
            <Button type="submit" disabled={login.isPending} className="mt-1">
              {login.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
