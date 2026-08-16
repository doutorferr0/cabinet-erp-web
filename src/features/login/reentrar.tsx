import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/data/sessao'
import { type EnvioInterrompido, envioInterrompido } from '@/data/sessao-expirada'
import { useId, useState } from 'react'

/**
 * Reentrada SEM sair da tela, quando a sessão vence no meio de um envio
 * (#124, ponto 3).
 *
 * ## Por que aqui e não no login
 *
 * Mandar ao `/login` desmonta o formulário, e é a desmontagem — não o 401 — que
 * apaga cinquenta campos preenchidos. A tela fica de pé, o operador se
 * reautentica neste bloco, e o MESMO payload é reenviado. Nada é redigitado.
 *
 * ## Por que não é um `<form>`
 *
 * Este bloco mora dentro do `<form>` da tela, e `<form>` aninhado é HTML
 * inválido — o browser fecha o de fora, e o Enter no campo de senha passaria a
 * submeter o cadastro inteiro em vez de reentrar. Por isso: `<div>`, botão
 * `type="button"` e Enter tratado à mão no campo.
 */
export function ReentrarNaSessao<TVars>({
  mutacao,
  aoReenviar,
}: {
  mutacao: Parameters<typeof envioInterrompido<TVars>>[0]
  /** Chamado depois do reenvio — a tela decide se fecha, avisa ou navega. */
  aoReenviar?: () => void
}) {
  const estado: EnvioInterrompido<TVars> = envioInterrompido(mutacao)
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const idEmail = useId()
  const idSenha = useId()

  if (!estado.expirou) return null

  function entrarEReenviar() {
    login.mutate(
      { email, password: senha },
      {
        onSuccess: () => {
          estado.reenviar()
          aoReenviar?.()
        },
      },
    )
  }

  return (
    // `role="alert"`: a sessão vencer no meio do envio é interrupção, e quem usa
    // leitor de tela precisa saber sem varrer a página atrás do bloco novo.
    <div
      role="alert"
      data-slot="reentrar-na-sessao"
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-card p-3"
    >
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">Sua sessão expirou antes de gravar.</p>
        <p className="text-muted-foreground text-xs">
          Nada do que você preencheu foi perdido. Entre de novo e o envio é refeito.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={idEmail}>E-mail</Label>
          <Input
            id={idEmail}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={idSenha}>Senha</Label>
          <Input
            id={idSenha}
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            // Enter aqui reentra, e NÃO submete o formulário da tela — que é o
            // que aconteceria por padrão, gravando com a sessão ainda vencida.
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                entrarEReenviar()
              }
            }}
          />
        </div>
      </div>

      {login.error ? <p className="text-destructive text-xs">{login.error.message}</p> : null}

      <Button type="button" onClick={entrarEReenviar} disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar e enviar de novo'}
      </Button>
    </div>
  )
}
