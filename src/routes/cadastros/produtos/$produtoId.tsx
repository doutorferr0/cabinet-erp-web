import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ProdutoForm } from '@/features/produto/produto-form'
import { detalheDoErro } from '@/lib/erros'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/produtos/$produtoId')({
  component: ProdutoEditPage,
  validateSearch: validateModoSearch,
})

function ProdutoEditPage() {
  const { produtoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = produtoId === 'novo'

  // `produtoId` é o uuid do contrato, carregado como veio da URL — o id do
  // produto é chave técnica, não número (`docs/integracao.md`).
  const query = useQuery({
    queryKey: ['produto', produtoId],
    queryFn: () => (isNovo ? data.produtos.empty() : data.produtos.get(produtoId)),
  })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Falhou ≠ não existe: 404 chega como `null` (o produto não está lá), qualquer
  // outra falha chega como erro. Tratar os dois como "não encontrado" mandaria o
  // operador procurar um registro que existe.
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2 text-muted-foreground">
        Não foi possível carregar o produto.
        {detalheDoErro(query.error) ? (
          <span className="max-w-prose text-[0.75rem]">{detalheDoErro(query.error)}</span>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (!query.data) {
    return <p className="text-muted-foreground">Produto não encontrado.</p>
  }

  return (
    <ProdutoForm
      produto={query.data}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : query.data.nossaDescricao}
      aviso={<CoberturaDaTela />}
    />
  )
}

/**
 * O contrato cobre 4 campos das 5 abas da §6 mais a grade de Valores. Sem este
 * aviso, aba em branco se lê como cadastro incompleto e campo sem destino se lê
 * como gravado — o operador preencheria o que o servidor não guarda. Sai quando
 * o DTO cobrir a tela (`docs/integracao.md`).
 *
 * Mudou com a escrita de variante: a grade **passou a viajar**, mas não inteira
 * (`Índice` e `Tipo de Valor` não existem no contrato) e sem exclusão — não há
 * `DELETE` de variante, então tirar a linha da tela não a tira do servidor.
 */
function CoberturaDaTela() {
  return (
    <AvisoDeCobertura>
      <p>
        O Gravar envia <strong>Nosso Código</strong>, <strong>Nossa Descrição</strong>,{' '}
        <strong>Ativo</strong> e a grade de <strong>Valores</strong> (Acabamento, Tamanho, Valor de
        Tabela, Est.Mínimo e o Ativo da linha). Os demais campos aparecem em branco e{' '}
        <strong>Gravar não os envia</strong> — inclusive <strong>Índice</strong> e{' '}
        <strong>Tipo de Valor</strong>, que a grade mostra e o contrato não tem.
      </p>
      <p>
        <strong>Excluir linha</strong> tira a variante da tela, não do servidor: o contrato não tem
        exclusão de variante. Para tirá-la de circulação, desmarque o <strong>Ativo</strong> da
        linha e grave. O <strong>estoque atual</strong> não se edita aqui — ele é saldo de
        movimento, e o lançamento ainda não tem tela.
      </p>
    </AvisoDeCobertura>
  )
}
