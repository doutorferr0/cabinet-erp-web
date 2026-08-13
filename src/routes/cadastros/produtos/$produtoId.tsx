import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { data } from '@/data'
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
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (o produto não está lá), qualquer
  // outra falha chega como erro. Tratar os dois como "não encontrado" mandaria o
  // operador procurar um registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o produto."
        erro={query.error}
        refazer={() => query.refetch()}
      />
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
 * O contrato cobre a aba 1 quase inteira e a aba 2 INTEIRA, mais a grade de
 * Valores — eram 4 campos até 2026-08-13, quando a engenharia reversa do legado
 * destravou os outros dois códigos, o par de unidades, a classificação
 * (Tipo/Marca/Fábrica) e a ficha técnica da §6.2. Sem este aviso, aba em branco se lê como cadastro
 * incompleto e campo sem destino se lê como gravado — o operador preencheria o
 * que o servidor não guarda. Sai quando o DTO cobrir a tela
 * (`docs/integracao.md`).
 *
 * Mudou com a escrita de variante: a grade **passou a viajar**, mas não inteira
 * (`Índice` e `Tipo de Valor` não existem no contrato) e sem exclusão — não há
 * `DELETE` de variante, então tirar a linha da tela não a tira do servidor.
 */
function CoberturaDaTela() {
  return (
    <AvisoDeCobertura>
      <p>
        O Gravar envia <strong>Nosso Código</strong>, <strong>Código Especial</strong>,{' '}
        <strong>Código Reduzido</strong>, <strong>Nossa Descrição</strong>, o par de{' '}
        <strong>Unidade e Quantidade de Entrada e Saída</strong>, <strong>Ativo</strong> e a grade
        de <strong>Valores</strong> (Acabamento, Tamanho, Valor de Tabela, Est.Mínimo e o Ativo da
        linha). A aba <strong>Outros Dados</strong> inteira também viaja — medidas, peso, watts,
        volts, lúmen, garantia. Os demais campos aparecem em branco e{' '}
        <strong>Gravar não os envia</strong> — inclusive <strong>Índice</strong> e{' '}
        <strong>Tipo de Valor</strong>, que a grade mostra e o contrato não tem.
      </p>
      <p>
        <strong>Tipo de Produto</strong>, <strong>Marca</strong> e <strong>Fábrica</strong> são
        exceção e merecem leitura: a tela <strong>mostra</strong> o que o servidor gravou e{' '}
        <strong>não deixa trocar</strong> — o combo escolhe pelo nome e o servidor guarda por
        código. Trocar a classificação ainda é pelo cadastro de apoio.
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
