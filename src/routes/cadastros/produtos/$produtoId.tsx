import type { ProductDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { CabecalhoDoRegistro, LayoutDoRegistro } from '@/components/cabinet/documento'
import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { BlocoIdentidade } from '@/components/cabinet/ficha/bloco-identidade'
import { data } from '@/data'
import { useDesativarProduto, useGravarProduto } from '@/data/produtos-api'
import { resumoDoProduto } from '@/features/produto/ficha-lateral'
import { ProdutoForm } from '@/features/produto/produto-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Produto } from '@/mocks/produtos'
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
  // `Desativar` relê o DETALHE antes do `PUT` (o integral apagaria `specs`), e
  // por isso tem mutação própria na fronteira. `Ativar` é o mesmo `PUT` com o
  // `ativo` invertido, e cabe no Gravar de sempre.
  const desativar = useDesativarProduto()
  const ativar = useGravarProduto()

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

  const produto = query.data
  const alternando = desativar.isPending || ativar.isPending

  return (
    // Fronteiras entre regiões da página = espaço `--s-5` (24), sem linha
    // (§Hierarquia, separação nº 1).
    <div className="flex min-w-0 flex-col gap-6">
      <CabecalhoDoRegistro
        // A entidade no SINGULAR: o cabeçalho 2.0 é do registro aberto, não da
        // tela. "Cadastro de Produtos" dizia onde o operador está — ele já sabe.
        titulo="Produto"
        {...(produto.nossoCodigo ? { id: produto.nossoCodigo } : {})}
        badge={produto.ativo ? { tom: 'open', label: 'Ativo' } : { tom: 'void', label: 'Inativo' }}
        {...(readOnly ? { meta: 'Consulta' } : isNovo ? { meta: 'Incluir' } : {})}
        // Em `Incluir` não há registro a ativar: o próximo passo é gravar, e
        // quem oferece isso é o rodapé do formulário.
        {...(isNovo
          ? {}
          : {
              proximaAcao: {
                id: 'alternar-ativo',
                label: produto.ativo ? 'Desativar' : 'Ativar',
                disabled: alternando,
                onClick: () =>
                  produto.ativo
                    ? desativar.mutate(paraLinhaDoContrato(produto))
                    : ativar.mutate({ values: { ...produto, ativo: true }, original: produto }),
              },
            })}
      />

      <LayoutDoRegistro
        principal={
          <ProdutoForm produto={produto} readOnly={readOnly} aviso={<CoberturaDaTela />} />
        }
        lateral={
          isNovo ? undefined : (
            <aside aria-label="Apoio do produto" className="flex flex-col gap-4">
              <BlocoIdentidade
                nome={produto.nossaDescricao}
                {...(produto.nossoCodigo ? { documento: produto.nossoCodigo } : {})}
                {...(produto.marca ? { cidade: produto.marca } : {})}
              />
              <CartaoLateral titulo="Resumo" tint="sand" pares={resumoDoProduto(produto)} />
            </aside>
          )
        }
      />
    </div>
  )
}

/**
 * O `Produto` da tela na forma de linha do contrato, só para a DESATIVAÇÃO.
 *
 * `useDesativarProduto` relê o detalhe pelo `id` e monta o corpo a partir dele —
 * o que ele precisa daqui é o id e o código para a mensagem de erro. Os demais
 * campos existem porque `ProductDto` os exige; nenhum deles chega ao `PUT`.
 */
function paraLinhaDoContrato(produto: Produto): ProductDto {
  return {
    id: produto.id,
    code: produto.nossoCodigo,
    description: produto.nossaDescricao,
    active: produto.ativo,
  }
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
        <strong>Excluir linha</strong> tira a variante da tela, não do servidor: o contrato não tem
        exclusão de variante. Para tirá-la de circulação, desmarque o <strong>Ativo</strong> da
        linha e grave. O <strong>estoque atual</strong> não se edita aqui — ele é saldo de
        movimento, e o lançamento ainda não tem tela.
      </p>
    </AvisoDeCobertura>
  )
}
