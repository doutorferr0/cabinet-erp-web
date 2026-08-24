import { ErroDaApi, NAO_IMPLEMENTADO } from '@/data/api-provider'

/**
 * QUEM É O MÓDULO POR TRÁS DE UM 501, e o que nele já funciona.
 *
 * O contrato tem uma resposta só para esta fase — `NaoImplementado`,
 * `urn:cabinet:erro:nao-implementado`: o caminho está NO contrato e o servidor
 * ainda não serve ESTA parte dele. É a marca do `Proposto` em tempo de
 * execução, e é 501 e nunca 404 justamente para "não existe" continuar
 * significando "não existe".
 *
 * O que faltava era o outro lado. O operador que esbarra nisso recebia o bloco
 * de falha genérico — "a consulta não chegou ao servidor", com um `Tentar de
 * novo` ao lado. As duas coisas são mentira: a consulta CHEGOU, e repetir dá a
 * mesma resposta. O que não existe ainda é o pedaço do servidor.
 *
 * ## Por que um registro, e não a frase do servidor
 *
 * O `detail` do problem+json diz o que o servidor recusou, e ele continua sendo
 * mostrado. Mas **"o que já funciona" é conhecimento do FRONT** — é a nossa
 * tela que sabe quais abas gravam e quais não. O servidor não tem como dizer
 * isso, e sem dizê-lo o aviso vira só uma porta fechada: o operador não
 * descobre que pode seguir usando o resto do cadastro.
 *
 * ## O conteúdo NÃO é inventado
 *
 * Cada entrada abaixo transcreve a descrição de
 * `components/responses/NaoImplementado` em `contracts/openapi-v1.json`, que
 * enumera exatamente os campos que disparam o 501 em cada caminho. Módulo fora
 * da lista cai na frase genérica de propósito — nomear um módulo por chute sai
 * mais caro que não nomear nenhum, porque o operador acredita no nome.
 *
 * ## Como a lista cresce (e como ela morre)
 *
 * Entra caminho aqui quando o contrato passar a declarar `NaoImplementado`
 * nele; sai quando o backend implementar. É a mesma dívida deliberada de
 * `src/mocks/rotas-do-backend.ts`, medida do outro lado — lá está o que o
 * servidor JÁ faz, aqui o que ele ainda não faz.
 */
export interface ModuloEmConstrucao {
  /** Nome do módulo como o operador o conhece — o que a sidebar chama. */
  nome: string
  /** O que aquele caminho ainda recusa, na letra do contrato. */
  falta: string
  /** O que continua funcionando ali — para o operador não abandonar a tela. */
  funciona: string
}

/**
 * Por PREFIXO de caminho, na ordem em que se procura.
 *
 * Prefixo e não caminho exato porque o id viaja na URL
 * (`PUT /api/quotes/{id}`), e casar por igualdade deixaria de fora justamente a
 * alteração — metade das operações que hoje podem responder 501.
 */
const POR_CAMINHO: readonly (readonly [string, ModuloEmConstrucao])[] = [
  [
    '/api/partners',
    {
      nome: 'Cadastro de parceiro',
      falta:
        'a configuração de compras do fornecedor — prazo de entrega, faturamento mínimo, empresas compradoras e mínimos por grupo',
      funciona:
        'O resto do cadastro grava normalmente: identificação, documento, endereço, contatos e papéis.',
    },
  ],
  [
    '/api/quotes',
    {
      nome: 'Orçamento',
      falta: 'o desconto por grupo e os itens de serviço',
      funciona:
        'O orçamento com itens de produto grava normalmente, com desconto por item e no total.',
    },
  ],
  [
    '/api/orders',
    {
      nome: 'Pedido de venda',
      falta: 'o desconto por grupo e os itens de serviço',
      funciona:
        'O pedido com itens de produto grava normalmente, com desconto por item e no total.',
    },
  ],
]

/**
 * `true` quando o servidor respondeu **501** — o módulo está no contrato e o
 * backend ainda não o serve.
 *
 * O guarda é o STATUS, como em `ehSemPermissao`. O `type` do problem+json
 * confirma quando vem, mas nem todo `ErroDaApi` do repo carrega o corpo (há
 * pontos que montam o erro só com status e `detail`), e um 501 sem `type` é 501
 * do mesmo jeito. Exigir a URN faria o aviso sumir exatamente nos caminhos que
 * ainda não passaram por aqui.
 */
export function ehModuloEmConstrucao(erro: unknown): boolean {
  return erro instanceof ErroDaApi && erro.status === NAO_IMPLEMENTADO
}

/**
 * Qual módulo, a partir do caminho que o erro trouxe.
 *
 * `undefined` quando o caminho não veio ou não está no mapa — e aí quem desenha
 * o aviso usa a frase genérica. Devolver um módulo aproximado seria pior que
 * devolver nada: o operador leria o nome de uma tela que não é a dele.
 */
export function moduloDoErro(erro: unknown): ModuloEmConstrucao | undefined {
  if (!(erro instanceof ErroDaApi) || !erro.caminho) return undefined
  // Sem a query: `/api/quotes?page=1` é o mesmo módulo de `/api/quotes`.
  const caminho = erro.caminho.split('?')[0] ?? ''
  return POR_CAMINHO.find(([prefixo]) => caminho.startsWith(prefixo))?.[1]
}

/**
 * A frase de um 501 onde só cabe TEXTO — os diálogos de confirmar cancelamento
 * e desativação recebem `erro: string`, não o erro.
 *
 * Existe para o fallback do CHAMADOR não ser usado nesse caso. "Não foi
 * possível desativar. Tente de novo." é a frase certa para rede fora e a errada
 * para 501: o operador tentaria de novo, sempre, sem nunca chegar a lugar
 * nenhum. Aqui o `detail` do servidor vem primeiro, e a frase do módulo cobre
 * quando ele não veio.
 */
export function mensagemDeConstrucao(erro: unknown): string {
  const detalhe = erro instanceof ErroDaApi ? erro.detail : undefined
  if (detalhe) return detalhe

  const modulo = moduloDoErro(erro)
  return modulo
    ? `${modulo.nome}: o servidor ainda não guarda ${modulo.falta}. Nada foi alterado.`
    : 'O servidor ainda não atende esta parte do sistema. Nada foi alterado, e tentar de novo dá o mesmo resultado.'
}
