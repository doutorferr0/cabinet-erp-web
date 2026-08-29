import {
  buscarSaldosDaVariante,
  invalidarEstoqueDaVariante,
  lancarMovimento,
  saldosDoDeposito,
  somaDosSaldos,
} from '@/data/estoque-api'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * INVENTÁRIO — a contagem por depósito, e o ajuste que ela produz.
 *
 * ## O contrato foi re-medido, e a metade que falta é a de cima
 *
 * `contracts/openapi-v1.json` em `origin/main` (149 caminhos, 205 operações,
 * medido em 28/08) publica CINCO operações de estoque: `ListStockLocations`,
 * `Create`/`UpdateStockLocation`, `ListStockBalances` e `List`/
 * `CreateStockMovement`. **Nenhuma delas é uma contagem.** Não há
 * `/api/stock-counts`, não há sessão de contagem, não há folha — abrir, digitar
 * o contado e fechar não têm onde ser gravados.
 *
 * O que EXISTE é justamente o fim do ciclo: `CreateStockMovement` é a escrita
 * genérica de estoque, e o ajuste de inventário é ela com o `delta` que a
 * diferença determinou. Por isso este arquivo se divide em dois pedaços com
 * épocas diferentes, e o corte é explícito:
 *
 * | pedaço | onde vive | época |
 * |---|---|---|
 * | abrir, acrescentar item, digitar o contado | **aqui, no navegador** | `spring-pendente` |
 * | aplicar o ajuste (um movimento por linha divergente) | `CreateStockMovement` | servido hoje |
 *
 * **`spring-pendente` é a marca da leva front40**: o api Node está congelado, a
 * lacuna de servidor é preenchida pelo front, e a operação que falta nasce no
 * backend Spring. Não inventamos caminho HTTP para ela — rota fora do contrato
 * é proibida, e um `POST /api/stock-counts` no MSW ensinaria à tela um servidor
 * que não vai existir com essa forma. A contagem é provider local, como cidades
 * e boletim: a tela pede daqui e não sabe a diferença, e no dia em que a
 * operação for publicada troca-se o corpo destas funções, não a tela.
 *
 * Quem invalida a declaração é `src/data/familia-de-estoque.test.ts`: ele
 * compara a família INTEIRA do contrato com a tabela que conhece e fica
 * vermelho na primeira operação de contagem que alguém publicar. Declaração de
 * ausência sem guarda fica verde para sempre — foi assim que a transferência
 * entre depósitos ganhou a dela.
 *
 * ## O que se PERDE por a contagem ser local, e a tela diz
 *
 * A folha não sobrevive ao recarregar a página, não é vista por outro operador
 * e não deixa histórico. São exatamente as três coisas que a operação de
 * servidor traria — e por isso a tela avisa, em vez de deixar quem fechou o
 * galpão supor que a contagem ficou guardada.
 *
 * ## A contagem é de UM depósito, e o depósito é obrigatório
 *
 * `CreateStockMovement` aceita `locationId` nulo, que o servidor lê como "o
 * padrão da empresa" e cria sob demanda. Aqui não: contar exige saber ONDE se
 * contou, e o saldo de referência sai de `ListStockBalances` recortado por
 * depósito. Com `null` o recorte somaria TODOS os depósitos, e a diferença
 * acusaria falta de peça que está na outra prateleira.
 */

/** A época desta parte da fronteira — ver o cabeçalho. */
export const EPOCA_DA_CONTAGEM = 'spring-pendente' as const

/** Uma linha da folha: a peça, o que o sistema diz e o que se contou. */
export interface ItemDaContagem {
  variantId: string
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  /** Acabamento e tamanho, como a tela de estoque os escreve. `Padrão` quando não há. */
  variante: string
  /**
   * O saldo do depósito no instante em que a linha ENTROU na folha.
   *
   * Congelado de propósito: é contra este número que o operador conferiu a
   * prateleira. O saldo de agora pode ser outro — e quando for, quem diz é a
   * aplicação, que o relê.
   */
  sistema: number
  /** `null` = ainda não contado. Zero é resposta legítima, e por isso não é o vazio. */
  contado: number | null
}

/** O resultado de aplicar — quantos movimentos saíram, e o que mudou embaixo. */
export interface AplicacaoDaContagem {
  aplicadaEm: string
  /** Movimentos efetivamente lançados. */
  movimentos: number
  /** Linhas que bateram com o sistema e não geraram movimento nenhum. */
  semDiferenca: number
  /**
   * Linhas cujo saldo MUDOU entre a contagem e o ajuste — alguém movimentou a
   * peça no meio. O ajuste levou o saldo ao contado assim mesmo; o que não se
   * pode é calar sobre a base ter mudado.
   */
  mudouNoMeio: string[]
}

export interface Contagem {
  id: string
  locationId: string
  depositoNome: string
  abertaEm: string
  itens: ItemDaContagem[]
  /** `null` enquanto aberta. */
  aplicacao: AplicacaoDaContagem | null
}

/**
 * A contagem corrente — UMA por vez, no módulo.
 *
 * Uma por vez porque contar é um turno de trabalho: quem está no galpão está
 * num depósito, e duas folhas abertas ao mesmo tempo são duas chances de
 * digitar o contado na errada. Abrir outra exige descartar a de agora, e a tela
 * cobra isso.
 */
let corrente: Contagem | null = null

/** Zera o estado — para o teste entre casos, e para mais nada. */
export function limparContagem(): void {
  corrente = null
}

export const CHAVES_INVENTARIO = {
  contagem: ['inventario', 'contagem'] as const,
}

/**
 * Publica a contagem no cache, com identidade NOVA a cada gesto.
 *
 * O objeto do módulo é a verdade; o cache é a cópia que faz o React redesenhar.
 * Sem o clone, `setQueryData` receberia a mesma referência e a tela não
 * mudaria — o defeito clássico de estado mutável atrás do Query.
 */
function publicar(cliente: QueryClient): void {
  cliente.setQueryData(CHAVES_INVENTARIO.contagem, corrente ? { ...corrente } : null)
}

/**
 * A diferença de uma linha: contado − sistema. `null` enquanto não se contou.
 *
 * Não confunde "contei zero" com "ainda não contei": o primeiro é uma diferença
 * de menos o saldo inteiro, o segundo não é diferença nenhuma. É por isso que
 * `contado` é `number | null` e não um número com zero por padrão.
 */
export function diferencaDoItem(item: ItemDaContagem): number | null {
  if (item.contado === null) return null
  return item.contado - item.sistema
}

/** As linhas que geram movimento: contadas E diferentes do sistema. */
export function itensParaAjustar(contagem: Contagem): ItemDaContagem[] {
  return contagem.itens.filter((item) => {
    const diferenca = diferencaDoItem(item)
    return diferenca !== null && diferenca !== 0
  })
}

/** O que o rodapé mostra, sem recontar a folha em três lugares da tela. */
export function resumoDaContagem(contagem: Contagem): {
  linhas: number
  contadas: number
  pendentes: number
  divergentes: number
  ajusteLiquido: number
} {
  const contadas = contagem.itens.filter((item) => item.contado !== null)
  const divergentes = itensParaAjustar(contagem)
  return {
    linhas: contagem.itens.length,
    contadas: contadas.length,
    pendentes: contagem.itens.length - contadas.length,
    divergentes: divergentes.length,
    ajusteLiquido: divergentes.reduce((soma, item) => soma + (diferencaDoItem(item) ?? 0), 0),
  }
}

/**
 * O saldo da variante NAQUELE depósito — zero quando ela nunca esteve lá.
 *
 * `ListStockBalances` devolve uma linha por depósito onde a peça esteve, e
 * depósito sem linha não vem com zero (decisão escrita em `estoque-api.ts`:
 * "nunca esteve aqui" diz outra coisa de "zerou aqui"). Para a contagem os dois
 * valem o mesmo — a prateleira está vazia nos dois casos —, e por isso a soma
 * de um recorte vazio é o zero certo.
 */
export async function saldoNoDeposito(variantId: string, locationId: string): Promise<number> {
  const saldos = await buscarSaldosDaVariante(variantId)
  return somaDosSaldos(saldosDoDeposito(saldos, locationId))
}

/**
 * A contagem corrente e os gestos que a alteram.
 *
 * Os gestos são síncronos porque a contagem é local: não há rede entre digitar
 * o contado e o número aparecer. Os dois assíncronos — acrescentar item e
 * aplicar — moram em mutações próprias, porque precisam de pendente e erro.
 */
export function useContagem() {
  const cliente = useQueryClient()
  const consulta = useQuery({
    queryKey: CHAVES_INVENTARIO.contagem,
    queryFn: () => corrente,
    // Estado local: não há servidor que o mude por baixo, e refetch em foco só
    // faria a folha piscar enquanto o operador digita.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

  return {
    contagem: consulta.data ?? null,

    abrir(deposito: { id: string; name: string }) {
      corrente = {
        id: `cont-${Date.now()}`,
        locationId: deposito.id,
        depositoNome: deposito.name,
        abertaEm: new Date().toISOString(),
        itens: [],
        aplicacao: null,
      }
      publicar(cliente)
    },

    descartar() {
      corrente = null
      publicar(cliente)
    },

    /** Digitar o contado. `null` devolve a linha para "ainda não contada". */
    contar(variantId: string, contado: number | null) {
      if (!corrente) return
      corrente = {
        ...corrente,
        itens: corrente.itens.map((item) =>
          item.variantId === variantId ? { ...item, contado } : item,
        ),
      }
      publicar(cliente)
    },

    remover(variantId: string) {
      if (!corrente) return
      corrente = {
        ...corrente,
        itens: corrente.itens.filter((item) => item.variantId !== variantId),
      }
      publicar(cliente)
    },
  }
}

/**
 * Acrescentar uma peça à folha — a única leitura de servidor do ciclo de cima.
 *
 * O saldo entra CONGELADO na linha: é a base contra a qual o operador conferiu
 * a prateleira. Variante que já está na folha não entra duas vezes, e a linha
 * existente fica como está — reentrar apagaria o contado que a pessoa acabou de
 * digitar.
 */
export function useAcrescentarItem() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (entrada: Omit<ItemDaContagem, 'sistema' | 'contado'>) => {
      if (!corrente) throw new Error('Não há contagem aberta.')
      if (corrente.itens.some((item) => item.variantId === entrada.variantId)) return
      const sistema = await saldoNoDeposito(entrada.variantId, corrente.locationId)
      // Relido do módulo e não da variável capturada: o `await` acima é uma
      // janela em que o operador pode ter descartado a folha, e escrever no
      // objeto antigo ressuscitaria uma contagem fechada.
      if (!corrente) return
      corrente = { ...corrente, itens: [...corrente.itens, { ...entrada, sistema, contado: null }] }
    },
    onSettled: () => publicar(cliente),
  })
}

/**
 * APLICAR — um `CreateStockMovement` por linha divergente, na ordem da folha.
 *
 * ## Por que o saldo é RELIDO aqui
 *
 * Entre contar e aplicar passa tempo — o bastante para uma venda baixar a peça.
 * O `sistema` da linha diz contra o que se conferiu; quem manda no `delta` é o
 * saldo de AGORA, porque o ajuste tem um trabalho só: deixar o depósito com o
 * que o operador contou. Usar o congelado deixaria o saldo final diferente do
 * contado toda vez que alguém movimentasse no meio — e em silêncio, que é o
 * pior. As linhas em que isso aconteceu voltam em `mudouNoMeio`, e a tela as
 * nomeia.
 *
 * ## Falha no meio não desfaz o que já passou, e não precisa
 *
 * Movimento é append-only e não há transação do lado do navegador — o mesmo
 * motivo pelo qual a transferência entre depósitos não foi construída
 * (`familia-de-estoque.test.ts`). A diferença é que aqui **repetir conserta**: a
 * segunda passada relê o saldo, e a linha já ajustada dá `delta` zero e é
 * pulada. Por isso a falha propaga com o erro do servidor e o botão continua
 * disponível, em vez de a tela inventar um estorno.
 */
export function useAplicarContagem() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (motivo: string) => {
      if (!corrente) throw new Error('Não há contagem aberta.')
      const contagem = corrente
      const alvos = itensParaAjustar(contagem)
      const mudouNoMeio: string[] = []
      let movimentos = 0
      for (const item of alvos) {
        const atual = await saldoNoDeposito(item.variantId, contagem.locationId)
        if (atual !== item.sistema) mudouNoMeio.push(item.variantId)
        const delta = (item.contado as number) - atual
        if (delta === 0) continue
        await lancarMovimento(item.variantId, {
          locationId: contagem.locationId,
          delta,
          reason: motivo,
        })
        movimentos += 1
        invalidarEstoqueDaVariante(cliente, item.variantId)
      }
      const aplicacao: AplicacaoDaContagem = {
        aplicadaEm: new Date().toISOString(),
        movimentos,
        semDiferenca: contagem.itens.length - alvos.length,
        mudouNoMeio,
      }
      corrente = { ...contagem, aplicacao }
      return aplicacao
    },
    onSettled: () => publicar(cliente),
  })
}
