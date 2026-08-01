import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import { ProdutoForm } from '@/features/produto/produto-form'
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
        {query.error instanceof ErroDaApi && query.error.detail ? (
          <span className="max-w-prose text-[0.75rem]">{query.error.detail}</span>
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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de produtos - Banco Principal{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${query.data.nossaDescricao}`}
      </h1>
      <AvisoDeCobertura />
      <ProdutoForm produto={query.data} readOnly={readOnly} />
    </div>
  )
}

/**
 * O contrato v1 cobre 4 campos das 5 abas da §6 na LEITURA, e a ESCRITA é menor
 * ainda: o `ProductWriteRequest` tem 3 campos (sem a grade de variantes). Sem
 * este aviso, aba em branco se lê como cadastro incompleto e edição na grade se
 * lê como gravada — o operador iria preencher o que o servidor nem guarda. Sai
 * quando o DTO cobrir a tela (`docs/integracao.md`).
 */
function AvisoDeCobertura() {
  return (
    <p className="max-w-prose text-[0.75rem] text-muted-foreground">
      O Gravar envia apenas <strong>Nosso Código</strong>, <strong>Nossa Descrição</strong> e{' '}
      <strong>Ativo</strong>. A grade de <strong>Valores</strong> vem do servidor mas ainda não tem
      escrita; os demais campos aparecem em branco e <strong>Gravar não os envia</strong>.
    </p>
  )
}
