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
  validateSearch: (busca: Record<string, unknown>): { redirect?: string | undefined } => {
    // `redirect: undefined` EXPLÍCITO, e não um objeto sem a chave.
    //
    // A busca de um match é o MERGE com a do pai, e a raiz não valida nada:
    // devolver `{}` não removia o `redirect` — deixava passar o do pai, cru.
    // Medido em 25/08, na bateria da tela de definir senha: um destino que esta
    // função recusa chegava inteiro ao componente.
    //
    // O caso `destino que sai do site é ignorado` ficava verde assim mesmo, e é
    // o que faz esta linha valer a nota: ele mede o EFEITO (cair no Dashboard),
    // e o efeito acontecia por outro motivo — `navigate` com `//host/x` não
    // acha rota interna e cai no Dashboard de todo jeito. Guarda desligada e
    // teste verde é o par que este comentário existe para não deixar voltar.
    return { redirect: rotaDeOrigemValida(busca.redirect) ? busca.redirect : undefined }
  },
})
