import { TextField } from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useLogin } from '@/data/sessao'
import { PaginaDeAuth } from '@/features/login/pagina-de-auth'
import { destinoDepoisDoLogin } from '@/lib/rota-de-origem'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
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
 * Forma 2.0: página dividida (`PaginaDeAuth`) — bancada com a marca à esquerda,
 * card com os controles à direita. Quem não entrou não tem sistema para
 * navegar, então não há sidebar nem cabeçalho.
 *
 * Destino principal é o fluxo de senha provisória: `LoginOk.mustChangePassword
 * === true` manda para `/trocar-senha` em vez de `/`. O que ainda NÃO há:
 * `/auth/me` não carrega o flag, então quem pular a troca (fechar e voltar)
 * entra normal — a guarda não tem como saber. Pergunta ao backend registrada
 * na memória: o flag precisa vir na `SessaoAtual`.
 *
 * **Sem "manter conectado", e a ausência é deliberada.** O mockup pede a caixa,
 * mas a sessão é cookie opaco e `LoginRequest` é e-mail + senha: um checkbox
 * que não viaja no contrato ensinaria o operador que a sessão dura mais quando
 * nada mudou. Entra quando o contrato publicar o campo — PR neste repo, fora
 * da zona desta issue.
 */
export function LoginTela() {
  const navigate = useNavigate()
  // `from` fixo em `/login`: é a única rota que monta esta tela, e o search já
  // chega validado pela rota — destino externo nem aparece aqui.
  const { redirect } = useSearch({ from: '/login' })
  const login = useLogin()
  const form = useForm<LoginValores>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function entrar(valores: LoginValores) {
    login.mutate(valores, {
      onSuccess: (resultado) => {
        // Senha provisória vence o destino guardado: enquanto ela não trocar, o
        // backend recusa o resto com 403 e a rota preservada só mostraria a
        // guarda de novo. O destino é descartado aqui, de propósito — carregá-lo
        // por duas telas custaria mais do que vale o caso raro de sessão
        // provisória interrompida no meio de uma navegação profunda.
        if (resultado.mustChangePassword) return navigate({ to: '/trocar-senha' })
        // A entrada do sistema é o DASHBOARD (decisão do user): o que está em
        // curso, não o fechamento do dia. O `redirect` só desvia disso quando a
        // guarda de fato interrompeu uma navegação — é o destino que o operador
        // já tinha pedido, e mandá-lo ao Dashboard o obrigaria a refazer o
        // caminho à mão.
        navigate({ to: destinoDepoisDoLogin(redirect) })
      },
    })
  }

  return (
    <PaginaDeAuth titulo="Entrar" subtitulo="Use o e-mail da sua empresa.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(entrar)} className="flex flex-col gap-4">
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
            <p role="alert" className="t-meta text-[color:var(--bad)]">
              {login.error.message}
            </p>
          )}
          {/* A tecla: 40px de altura, largura inteira do card. É a única ação
              da tela, e o tamanho é o que diz isso sem precisar de cor. */}
          <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
          {/*
            A saída de quem não consegue entrar mora AQUI, e não numa página de
            ajuda: é neste ponto que a pessoa descobre que esqueceu a senha. Ao
            lado dela, o recado de que NÃO há auto-cadastro — sem ele, quem não
            tem conta procura um "criar conta" que nunca existiu.
          */}
          <div className="flex items-baseline justify-between gap-3">
            <Link
              to="/esqueci-senha"
              className="t-ui text-[color:var(--main-text)] underline-offset-4 hover:underline"
            >
              Esqueci a senha
            </Link>
            <span className="t-meta">Precisa de acesso? Fale com o administrador</span>
          </div>
        </form>
      </Form>
    </PaginaDeAuth>
  )
}
