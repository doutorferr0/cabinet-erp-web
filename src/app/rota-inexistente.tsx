import { Ornamento } from '@/components/cabinet/ornamento'
import { buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Link } from '@tanstack/react-router'

/**
 * ROTA INEXISTENTE (404).
 *
 * Sem isto o TanStack Router mostra a mensagem crua dele, que fala de rota e de
 * árvore — vocabulário de quem escreveu o roteador, não de quem opera o sistema.
 *
 * Usa a mesma anatomia dos outros estados (`Empty`), e é o único lugar fora do
 * diálogo destrutivo onde o ornamento pode ser VERMELHO: aqui o significado é
 * erro mesmo. Não é falha de rede — a rede respondeu; o endereço é que não
 * existe —, então não leva o Tomato de indisponibilidade.
 *
 * A saída é uma só e é nomeada: voltar ao Boletim. Um 404 que só informa deixa
 * o operador com a barra de endereço na mão.
 */
export function RotaInexistente() {
  return (
    <Empty className="py-16">
      <EmptyMedia>
        <Ornamento shape="rota-inexistente" tom="erro" tamanho={128} />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Este endereço não existe</EmptyTitle>
        <EmptyDescription>
          A página que você tentou abrir não faz parte do sistema. Confira o endereço ou volte para
          o Boletim.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {/* `Link` do roteador com as classes do botão, e não o `LinkButton` da
            RAC: aquele usa `href` cru, que sob o TanStack Router recarrega a
            página inteira. Voltar ao Boletim é navegação interna. */}
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Ir para o Boletim
        </Link>
      </EmptyContent>
    </Empty>
  )
}
