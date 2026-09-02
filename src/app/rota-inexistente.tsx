import { Ornamento } from '@/components/cabinet/ornamento'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { Link } from '@tanstack/react-router'

/**
 * ROTA INEXISTENTE (404).
 *
 * Sem isto o TanStack Router mostra a mensagem crua dele, que fala de rota e de
 * árvore — vocabulário de quem escreveu o roteador, não de quem opera o sistema.
 *
 * ## O único estado que MANTÉM ornamento (D29)
 *
 * A D29 tirou o desenho de todos os outros: no vazio de listagem e na falha de
 * painel, o ornamento de 96/128px era o elemento mais alto de um bloco que mora
 * dentro de uma tela cheia de outras coisas, e ganhava da frase e da tecla.
 * Aqui não há outra coisa — o estado É a tela inteira, e o desenho é o que
 * impede que um endereço errado pareça um sistema quebrado. Reduzido de 128
 * para 72: continua sendo a primeira coisa que se vê, sem ser a única.
 *
 * A D28 já passou pelo ornamento e ele deixou de ser desenho de acervo: virou
 * UMA forma — os anéis concêntricos do login —, e o `shape` escolhe o matiz, não
 * o traço. Isso muda o argumento acima para melhor: o que o 404 mostra agora é a
 * MESMA marca que a tela de entrada mostra, em vermelho. Quem chegou a um
 * endereço que não existe vê a casa do sistema, não um pictograma de avaria.
 *
 * ## Gambarino, e é ele que gasta o da tela
 *
 * O título sai em `t-pagina` (Gambarino 28) num `h1`, e não no `EmptyTitle`
 * (Inter 600 13.5) dos outros estados: §Hierarquia dá um Gambarino por tela, e
 * numa tela que não tem cabeçalho de página o título do 404 é o título da
 * página. Um `EmptyTitle` com `t-pagina` por cima deixaria duas utilities de
 * tipo no mesmo elemento, e qual vence depende da ordem no CSS gerado.
 *
 * A saída é uma só, é nomeada e é a TECLA (primária): um 404 que só informa
 * deixa o operador com a barra de endereço na mão, e uma saída em `outline`
 * pesaria igual ao texto que a explica.
 */
export function RotaInexistente() {
  return (
    <Empty className="py-16">
      <EmptyMedia className="[&_svg]:size-auto">
        <Ornamento shape="rota-inexistente" tom="erro" tamanho={72} />
      </EmptyMedia>
      <div className="flex max-w-sm flex-col items-center gap-1.5">
        <h1 className="t-pagina">Este endereço não existe</h1>
        <EmptyDescription>
          A página que você tentou abrir não faz parte do sistema. Confira o endereço ou volte para
          o início.
        </EmptyDescription>
      </div>
      <EmptyContent>
        {/* `Link` do roteador com as classes do botão, e não o `LinkButton` da
            RAC: aquele usa `href` cru, que sob o TanStack Router recarrega a
            página inteira. Voltar ao início é navegação interna. */}
        <Link to="/" className={buttonVariants()}>
          Ir para o início
        </Link>
      </EmptyContent>
    </Empty>
  )
}
