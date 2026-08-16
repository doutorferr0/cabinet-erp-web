import { LoginTela } from '@/features/login/login'
import { rotaDeOrigemValida } from '@/lib/rota-de-origem'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginTela,
  /**
   * `redirect` é a rota que a guarda interrompeu — para onde voltar depois de
   * entrar. Validado AQUI, na fronteira, e não na tela: a busca vem da barra de
   * endereço, então é entrada de fora, e um destino externo despejaria o
   * operador em outro site com a sessão recém-criada (open redirect).
   *
   * Destino recusado some da busca em vez de virar erro de rota: o link
   * continua abrindo o login normalmente, e o operador cai no Dashboard.
   * Reprovar a navegação faria de uma URL malformada uma tela de erro.
   */
  validateSearch: (busca: Record<string, unknown>): { redirect?: string } =>
    rotaDeOrigemValida(busca.redirect) ? { redirect: busca.redirect } : {},
})
