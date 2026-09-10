import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A FAMÍLIA DE ESTOQUE do contrato, e quem a consome — medido, não declarado.
 *
 * ## O defeito que esta guarda existe para impedir
 *
 * O G12 pede cinco telas de estoque: kardex, entrada, saída, ajuste e
 * transferência entre depósitos. Quatro delas cabem no contrato de hoje, porque
 * `CreateStockMovement` é uma escrita genérica — sinal e motivo bastam. **A
 * quinta não cabe, e a diferença não é de tamanho: é de ATOMICIDADE.**
 *
 * Transferir são DOIS movimentos (a saída da origem e a entrada no destino), e
 * o api já sabe fazê-los na MESMA transação: `src/modules/estoque/
 * transferencia.ts` existe desde a migração `0042`, com documento próprio, para
 * que não haja instante em que a peça não esteja em lugar nenhum. **Esse módulo
 * não tem rota** — nenhuma operação do contrato o alcança, e função sem chamador
 * não está medida. A tela só poderia transferir com dois `POST` seguidos, e aí:
 *
 * 1. Falha entre um e outro deixa a peça sumida — saiu da origem e não entrou
 *    em lugar nenhum. Não há transação do lado do navegador para desfazer.
 * 2. Os dois movimentos nasceriam `manual`, ligados apenas pelo `reason`, que é
 *    TEXTO LIVRE digitado por gente. O cabeçalho de `transferencia.ts` escreve
 *    exatamente isto: "um estorno que casa texto livre é um estorno que erra a
 *    linha".
 *
 * Ou seja: a tela reintroduziria, do lado de fora, o defeito que o documento do
 * servidor foi criado para eliminar. Por isso ela **não foi construída** — e por
 * isso a ausência precisa de guarda, em vez de virar um parágrafo que envelhece
 * calado numa PR.
 *
 * ## Por que a guarda é sobre o CONTRATO, e não sobre a tela
 *
 * Uma asserção do tipo "a tela não tem botão de transferir" fica verde para
 * sempre: nada a invalida no dia em que a rota nascer, e a tarefa some. Esta
 * lê `contracts/openapi-v1.json`, que é o arquivo que MUDA quando alguém
 * resolve o problema — e reprova assim que a família de estoque ganhar operação
 * nova. Vermelho aqui é a tarefa aparecendo, não regressão.
 *
 * O mesmo vale para o que o contrato já publica e ninguém consome: o par de
 * escrita de DEPÓSITO (`CreateStockLocation`/`UpdateStockLocation`) está no
 * contrato desde a #291 e nenhuma tela o chama. Está na tabela abaixo com o
 * motivo, e não escondido.
 */

type Caminhos = Record<string, Record<string, { operationId?: string }>>

const VERBOS = ['get', 'post', 'put', 'patch', 'delete']

/**
 * A família: tudo o que o contrato publica sobre estoque.
 *
 * Casa por CAMINHO e não por nome de operação porque nome é escolha de quem
 * escreve o contrato, e a próxima operação pode se chamar `MoveStock` ou
 * `PostInventoryTransfer` — o caminho, esse, tem de dizer estoque para o
 * roteador funcionar. Os relatórios (`/api/reports/stock-*`) ficam de fora: são
 * leitura de gestão, com outra tela e outro dono.
 */
function familiaDeEstoque(): string[] {
  const caminhos = (contrato as unknown as { paths: Caminhos }).paths
  const operacoes: string[] = []
  for (const [caminho, verbos] of Object.entries(caminhos)) {
    const deEstoque =
      caminho.startsWith('/api/stock-') || /^\/api\/variants\/\{[^}]+\}\/stock-/.test(caminho)
    if (!deEstoque) continue
    for (const verbo of VERBOS) {
      const operacao = verbos[verbo]?.operationId
      if (operacao) operacoes.push(operacao)
    }
  }
  return operacoes.sort()
}

/**
 * O estado de cada operação da família, com o motivo escrito.
 *
 * `consome` é o arquivo onde a chamada tem de aparecer — e o teste confere o
 * TEXTO do arquivo, não uma lista à parte. Declaração de consumo que não é o
 * próprio consumo mente na primeira refatoração: foi assim que as duas telas de
 * compras chegaram a 25/08 registradas como entregues, com `console.info('[mock]
 * Gravar…')` no lugar da chamada.
 */
const FAMILIA: Record<string, { consome: string | null; motivo: string }> = {
  ListStockLocations: {
    consome: 'src/data/estoque-api.ts',
    motivo: 'os depósitos da empresa, para resolver o NOME que saldo e kardex não trazem',
  },
  ListStockBalances: {
    consome: 'src/data/estoque-api.ts',
    motivo: 'o saldo por depósito da variante escolhida',
  },
  ListStockMovements: {
    consome: 'src/data/estoque-api.ts',
    motivo: 'o kardex, paginado pelo servidor',
  },
  CreateStockMovement: {
    consome: 'src/data/estoque-api.ts',
    motivo: 'as TRÊS escritas do G12 — entrada, saída e ajuste são esta operação com sinais',
  },
  CreateStockLocation: {
    consome: null,
    motivo:
      'cadastro de DEPÓSITO não é item do G12 e não tem tela; o depósito padrão nasce no servidor, sob demanda, no primeiro movimento',
  },
  UpdateStockLocation: {
    consome: null,
    motivo: 'mesma razão de CreateStockLocation — o par de escrita do depósito espera tela própria',
  },
}

describe('família de estoque do contrato', () => {
  it('não ganhou operação que esta tabela não conhece', () => {
    // ESTE é o caso que vigia a transferência. Ele fica VERMELHO no dia em que
    // o contrato publicar `CreateStockTransfer` (ou o nome que ela receber), e
    // o próximo passo está escrito na mensagem — não numa issue que ninguém
    // relê. Enquanto isso, a ausência está medida em vez de suposta.
    expect(familiaDeEstoque()).toEqual(Object.keys(FAMILIA).sort())
  })

  it('a transferência entre depósitos continua SEM rota — e é por isso que não há tela', () => {
    // O api tem o par atômico pronto (`src/modules/estoque/transferencia.ts`,
    // migração 0042) e nenhuma porta HTTP. Enquanto for assim, transferir pela
    // tela seriam dois POST soltos: falha no meio some com a peça, e as duas
    // pontas ficariam ligadas só pelo `reason`, que é texto livre.
    const transferencia = familiaDeEstoque().filter((operacao) => /transfer/i.test(operacao))
    expect(transferencia).toEqual([])
  })

  it('toda operação declarada como consumida aparece MESMO no arquivo que a declara', () => {
    for (const [operacao, { consome }] of Object.entries(FAMILIA)) {
      if (consome === null) continue
      // O cliente gerado nomeia a função com a inicial minúscula da operação.
      const funcao = operacao[0]?.toLowerCase() + operacao.slice(1)
      const fonte = readFileSync(join(import.meta.dirname, '..', '..', consome), 'utf8')
      expect(fonte, `${operacao} declarada em ${consome} e ausente dele`).toContain(funcao)
    }
  })

  it('operação sem consumidor tem MOTIVO escrito, nunca uma linha muda', () => {
    for (const [operacao, { consome, motivo }] of Object.entries(FAMILIA)) {
      if (consome !== null) continue
      expect(motivo.length, `${operacao} sem consumidor e sem motivo`).toBeGreaterThan(40)
    }
  })
})
