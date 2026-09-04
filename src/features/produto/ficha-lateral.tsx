import type { ParDoCartao } from '@/components/cabinet/cartao-lateral'
import type { Produto } from '@/mocks/produtos'

/**
 * A LATERAL do produto (D19, #487) — e o que falta nela é decisão, não esquecimento.
 *
 * A especificação pede "identidade (foto) · custos · movimentação recente".
 * Medido contra `contracts/openapi-v1.json`:
 *
 * - **Foto não existe.** `ProductDto` tem `code`, `description`, os dois
 *   códigos alternativos, o par de unidades, tipo/marca/fábrica, `specs`,
 *   `suppliers`, `relatedProducts` e `active`. Nenhum campo de imagem. O
 *   monograma do `BlocoIdentidade` é o que a identidade pode mostrar hoje.
 * - **Custo não existe no produto.** O que o contrato guarda é PREÇO, e por
 *   VARIANTE (`listPriceCents` na grade de Valores). Somar variantes para
 *   inventar "o custo do produto" seria número novo com cara de dado do
 *   servidor.
 * - **Movimentação é da VARIANTE, não do produto.** O kardex é
 *   `estoque-api.ts` › `kardex(variantId)`. Um produto com seis variantes não
 *   tem uma movimentação: tem seis. Escolher uma delas para a lateral seria a
 *   tela decidindo por conta própria qual conta.
 *
 * O que sobra é o que o registro carrega e responde "que produto é este":
 * classificação, unidades, quantas variantes e quantos fornecedores.
 */
export function resumoDoProduto(produto: Produto): ParDoCartao[] {
  const pares: ParDoCartao[] = []

  if (produto.tipoProduto) pares.push({ rotulo: 'Tipo', valor: produto.tipoProduto })
  if (produto.marca) pares.push({ rotulo: 'Marca', valor: produto.marca })
  if (produto.fabrica) pares.push({ rotulo: 'Fábrica', valor: produto.fabrica })

  const entrada = [produto.unidadeEntradaQuantidade, produto.unidadeEntradaUnidade]
    .filter(Boolean)
    .join(' ')
  const saida = [produto.unidadeSaidaQuantidade, produto.unidadeSaidaUnidade]
    .filter(Boolean)
    .join(' ')
  if (entrada || saida) {
    pares.push({
      rotulo: 'Entrada › saída',
      valor: <span className="t-dado">{[entrada || '—', saida || '—'].join(' › ')}</span>,
    })
  }

  const variantes = produto.variantes?.length ?? 0
  if (variantes > 0) {
    pares.push({ rotulo: 'Variantes', valor: <span className="t-dado">{variantes}</span> })
  }

  const fornecedores = produto.fornecedores?.length ?? 0
  if (fornecedores > 0) {
    pares.push({ rotulo: 'Fornecedores', valor: <span className="t-dado">{fornecedores}</span> })
  }

  return pares
}
