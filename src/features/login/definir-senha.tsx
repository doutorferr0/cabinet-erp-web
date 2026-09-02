import { TextField } from '@/components/cabinet/form-controls'
import { Button, buttonVariants } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { type LinkDeCredencial, useDefinirSenha, useLinkDeCredencial } from '@/data/sessao'
import { PaginaDeAuth } from '@/features/login/pagina-de-auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const definirSenhaSchema = z
  .object({
    // Sem regra de complexidade inventada: a política de senha é do backend,
    // que responde 400 `senha-fraca` com o `detail` quando ela não serve. Um
    // piso escrito aqui viraria a segunda autoridade sobre a mesma regra.
    password: z.string().min(1, 'Informe a senha.'),
    // Confirmação é conferência de digitação, e só existe no cliente — não
    // viaja no contrato (`SetPasswordRequest` é token + password).
    confirmacao: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((v) => v.password === v.confirmacao, {
    message: 'A confirmação não confere com a senha.',
    path: ['confirmacao'],
  })

type DefinirSenhaValores = z.infer<typeof definirSenhaSchema>

/**
 * DEFINIR SENHA pelo link — o destino do convite e o da recuperação.
 *
 * Uma tela para os dois porque o ATO é o mesmo: alguém que provou posse de um
 * endereço escolhe a própria senha. O que muda é o texto, e ele vem do
 * `purpose` que o servidor devolve — não de duas rotas que divergiriam na
 * primeira correção feita numa só.
 *
 * **Pública, e sem sessão nenhuma**: quem chega aqui é justamente quem não tem
 * senha. A autenticação desta tela é o TOKEN, e ele vale uma vez.
 *
 * **Lê o link ANTES de mostrar o formulário.** Sem isso, quem clicou num link
 * vencido escolhe e confirma a senha duas vezes para só então descobrir que
 * não valia.
 */
export function DefinirSenhaTela({ token }: { token?: string | undefined }) {
  const link = useLinkDeCredencial(token)

  if (!token) return <Aviso titulo="Link incompleto" recusa="invalido" />
  if (link.isPending) {
    return (
      <PaginaDeAuth titulo="Definir senha">
        <p className="t-meta">Conferindo o link…</p>
      </PaginaDeAuth>
    )
  }
  if (link.isError) {
    return (
      <PaginaDeAuth titulo="Definir senha">
        <p role="alert" className="t-meta text-[color:var(--bad)]">
          Não foi possível conferir o link. Tente de novo em alguns instantes.
        </p>
      </PaginaDeAuth>
    )
  }
  if ('recusa' in link.data) return <Aviso titulo="Link inválido" recusa={link.data.recusa} />

  return <Formulario token={token} link={link.data} />
}

function Formulario({ token, link }: { token: string; link: LinkDeCredencial }) {
  const navigate = useNavigate()
  const definir = useDefinirSenha()
  const form = useForm<DefinirSenhaValores>({
    resolver: zodResolver(definirSenhaSchema),
    defaultValues: { password: '', confirmacao: '' },
  })
  const convite = link.purpose === 'invite'

  function confirmar({ password }: DefinirSenhaValores) {
    // Para o LOGIN, e não para o dashboard: definir a senha não cria sessão —
    // se criasse, o link do e-mail valeria como login e um encaminhamento por
    // engano entregaria a conta.
    definir.mutate({ token, password }, { onSuccess: () => navigate({ to: '/login' }) })
  }

  return (
    <PaginaDeAuth titulo={convite ? 'Bem-vindo' : 'Nova senha'}>
      <p className="t-meta">
        {convite ? (
          <>
            Olá, <strong className="font-semibold text-[color:var(--n-900)]">{link.name}</strong>.
            Escolha a senha que você vai usar para entrar.
          </>
        ) : (
          <>
            Escolha a nova senha de{' '}
            <strong className="font-semibold text-[color:var(--n-900)]">{link.email}</strong>.
          </>
        )}
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(confirmar)} className="flex flex-col gap-4">
          <TextField
            name="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            autoFocus
          />
          <TextField
            name="confirmacao"
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
          />
          {definir.error && (
            <p role="alert" className="t-meta text-[color:var(--bad)]">
              {definir.error.message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={definir.isPending} className="w-full">
            {definir.isPending ? 'Gravando…' : 'Definir senha'}
          </Button>
        </form>
      </Form>
    </PaginaDeAuth>
  )
}

/**
 * O link não vale. **Expirado e inválido têm saídas diferentes**, e é para isso
 * que o contrato publica duas URNs: o vencido oferece pedir outro, num botão; o
 * inválido não tem o que oferecer, e fingir que tem faria a pessoa repetir uma
 * ação que nunca vai funcionar.
 */
function Aviso({ titulo, recusa }: { titulo: string; recusa: 'invalido' | 'expirado' }) {
  return (
    <PaginaDeAuth titulo={recusa === 'expirado' ? 'Link expirado' : titulo}>
      <p role="alert" className="t-meta">
        {recusa === 'expirado'
          ? 'Este link venceu. Peça outro e ele chegará no seu e-mail.'
          : 'Este link não vale mais — ele já foi usado, ou foi substituído por um pedido mais novo.'}
      </p>
      {recusa === 'expirado' ? (
        <Link to="/esqueci-senha" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Pedir outro link
        </Link>
      ) : (
        <Link
          to="/login"
          className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
        >
          Voltar para a entrada
        </Link>
      )}
    </PaginaDeAuth>
  )
}
