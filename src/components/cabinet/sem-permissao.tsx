import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { detalheDoErro } from '@/lib/erros'

/**
 * O que a tela mostra quando o servidor recusa por PERMISSÃO (403).
 *
 * Existe separado do erro genérico por causa do que ele NÃO tem: botão de
 * tentar de novo. Repetir a mesma requisição com a mesma sessão dá 403 outra
 * vez — o botão prometeria uma saída que a tela não pode cumprir, e o operador
 * clicaria três vezes antes de desconfiar.
 *
 * A frase padrão diz o essencial (não é falha do sistema, e não adianta
 * insistir) e nomeia a saída real: **pedir acesso a quem administra**. O
 * `detail` do servidor entra por cima quando existe, porque é ele que sabe qual
 * permissão faltou — a tela genérica não tem como adivinhar.
 *
 * Recusa por permissão NÃO é o mesmo que sessão vencida: 401 é a guarda que
 * manda para o login (#124, ponto 1). Quem chega aqui está autenticado e mesmo
 * assim não pode — mandar essa pessoa para o login faria um laço, porque entrar
 * de novo não muda a permissão.
 */
export function SemPermissao({ erro, contexto }: { erro?: unknown; contexto?: string }) {
  return (
    <Empty data-slot="sem-permissao">
      <EmptyHeader>
        <EmptyTitle>Sem permissão</EmptyTitle>
        <EmptyDescription>
          {detalheDoErro(erro) ??
            `Sua conta não tem acesso ${contexto ? `a ${contexto}` : 'a esta tela'}. Peça a quem administra o sistema para liberar.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
