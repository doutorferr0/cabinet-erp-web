import type { ProblemDetails, ProblemFieldError, ProblemType } from '@/api/gerado'
import { HttpResponse } from 'msw'

/**
 * O erro do servidor falso, num lugar só — RFC 9457 Problem Details.
 *
 * Nasceu duplicado em `handlers.ts` e `crm.ts` (cópia deliberada, para não criar
 * ciclo: `handlers.ts` importa `crm.ts`). Sai daqui pela mesma razão que a
 * `aplicarFiltros` saiu: **o formato de erro é UM só, e formato em duas cópias
 * vira dois formatos.** Este módulo é folha — não importa nada do mock — então o
 * ciclo que justificava a duplicação não existe mais.
 *
 * E a cópia voltou: `obras.ts`, `contatos.ts`, `atividades.ts` e `quotes.ts`
 * nasceram, depois, com uma `problemaJson` local cada — as quatro mandando
 * `title: 'Erro'`, que é o defeito que este arquivo tinha sido criado para
 * matar. Elas foram embora aqui. O ciclo que cada uma alegava não existe: quem
 * importa `crm.ts`/`obras.ts` é o `handlers.ts`, e este módulo não importa
 * ninguém.
 *
 * ## O `type` é o que DISTINGUE o erro, e o vocabulário é do contrato
 *
 * O mock mandava `about:blank` em 100% das respostas e um `title` deduzido do
 * status. Nenhum dos dois distinguia nada: 409 é o conflito de sete coisas, e a
 * tela que quiser oferecer uma saída (vincular ao cadastro que já existe, abrir
 * o pedido que já saiu, mandar escolher empresa) precisa saber qual delas foi.
 *
 * O vocabulário agora está DECLARADO em `ProblemType` — o `TIPO` daqui é só o
 * apelido curto de cada URN, e o `satisfies` prova, em tempo de compilação, que
 * nenhum deles foi inventado aqui. URN nova entra pelo contrato e chega pelo
 * codegen; escrita à mão neste arquivo, ela nunca chegaria ao servidor de
 * verdade e o mock passaria a mentir com cara de dado.
 *
 * ## O `title` vem do TIPO, não da ocorrência nem do status
 *
 * O contrato fixa um título canônico por `type` (tabela do `ProblemType`) e é
 * ele que sai daqui — `TITULO_POR_TIPO` é `Record<…, string>` de propósito:
 * tipo novo no contrato sem título aqui não compila. `about:blank` é o único que
 * cai no status, porque nele o tipo É o status.
 *
 * ## O que este mock NÃO manda: `instance`
 *
 * O contrato o declara opcional e o backend real preenche com a URL da
 * requisição. Aqui ele ficaria fora do alcance: quem monta a resposta são 118
 * pontos de handler, e passar a `request` por todos eles para preencher um
 * membro que nenhuma tela lê seria churn com zero leitor. Divergência conhecida,
 * escrita: o dia em que a tela precisar da instância, ela precisa do backend.
 */

/** Os apelidos das URNs do contrato. O `satisfies` é a guarda — ver o cabeçalho. */
export const TIPO = {
  generico: 'about:blank',
  semSessao: 'urn:cabinet:erro:sem-sessao',
  senhaPrecisaTrocar: 'urn:cabinet:erro:senha-precisa-trocar',
  semVinculoComEmpresa: 'urn:cabinet:erro:sem-vinculo-com-empresa',
  papelInsuficiente: 'urn:cabinet:erro:papel-insuficiente',
  camposInvalidos: 'urn:cabinet:erro:campos-invalidos',
  ordenacaoInvalida: 'urn:cabinet:erro:ordenacao-invalida',
  paginacaoInvalida: 'urn:cabinet:erro:paginacao-invalida',
  filtroInvalido: 'urn:cabinet:erro:filtro-invalido',
  papelInvalido: 'urn:cabinet:erro:papel-invalido',
  hierarquiaEmLaco: 'urn:cabinet:erro:hierarquia-em-laco',
  senhaAtualInvalida: 'urn:cabinet:erro:senha-atual-invalida',
  senhaFraca: 'urn:cabinet:erro:senha-fraca',
  tokenInvalido: 'urn:cabinet:erro:token-invalido',
  tokenExpirado: 'urn:cabinet:erro:token-expirado',
  emailNaoEnviado: 'urn:cabinet:erro:email-nao-enviado',
  naoEncontrado: 'urn:cabinet:erro:nao-encontrado',
  semEmpresaAtiva: 'urn:cabinet:erro:sem-empresa-ativa',
  documentoJaCadastrado: 'urn:cabinet:erro:documento-ja-cadastrado',
  emailJaCadastrado: 'urn:cabinet:erro:email-ja-cadastrado',
  codigoJaCadastrado: 'urn:cabinet:erro:codigo-ja-cadastrado',
  vinculoJaExiste: 'urn:cabinet:erro:vinculo-ja-existe',
  papelDeSistema: 'urn:cabinet:erro:papel-de-sistema',
  pedidoJaConvertido: 'urn:cabinet:erro:pedido-ja-convertido',
  valorNaoParcelavel: 'urn:cabinet:erro:valor-nao-parcelavel',
  parcelasAcimaDoTeto: 'urn:cabinet:erro:parcelas-acima-do-teto',
  parcelaAbaixoDoMinimo: 'urn:cabinet:erro:parcela-abaixo-do-minimo',
  transicaoInvalida: 'urn:cabinet:erro:transicao-invalida',
  demonstracaoEmAberto: 'urn:cabinet:erro:demonstracao-em-aberto',
  orcamentoJaRevisado: 'urn:cabinet:erro:orcamento-ja-revisado',
  faturamentoMinimoNaoAtingido: 'urn:cabinet:erro:faturamento-minimo-nao-atingido',
  itemJaEmOrdem: 'urn:cabinet:erro:item-ja-em-ordem',
  ordemJaEnviada: 'urn:cabinet:erro:ordem-ja-enviada',
  fornecedorDivergente: 'urn:cabinet:erro:fornecedor-divergente',
  // A escada FÍSICA da venda (G4). SEIS, e não uma: cada uma tem uma saída
  // diferente na tela — corrigir a quantidade, liberar antes, separar antes,
  // abrir outro romaneio, cancelar em vez de fechar, trocar o romaneio. Um 409
  // genérico em cima delas devolveria à tela o que o status já disse.
  liberacaoAcimaDoVendido: 'urn:cabinet:erro:liberacao-acima-do-vendido',
  separacaoSemLiberacao: 'urn:cabinet:erro:separacao-sem-liberacao',
  entregaSemSeparacao: 'urn:cabinet:erro:entrega-sem-separacao',
  entregaFechada: 'urn:cabinet:erro:entrega-fechada',
  entregaVazia: 'urn:cabinet:erro:entrega-vazia',
  entregaDeOutroPedido: 'urn:cabinet:erro:entrega-de-outro-pedido',
} as const satisfies Record<string, ProblemType>

/**
 * O título canônico de cada tipo, como o contrato o escreve.
 *
 * `resposta-nao-json` está na tabela por completude do `Record` — quem o emite é
 * o CLIENTE (`src/api/http.ts`), quando a resposta não é do contrato, e nenhum
 * servidor o manda.
 */
const TITULO_POR_TIPO: Record<Exclude<ProblemType, 'about:blank'>, string> = {
  'urn:cabinet:erro:sem-sessao': 'Sem sessão',
  'urn:cabinet:erro:senha-precisa-trocar': 'Senha precisa ser trocada',
  'urn:cabinet:erro:sem-vinculo-com-empresa': 'Sem vínculo com a empresa',
  'urn:cabinet:erro:papel-insuficiente': 'Papel insuficiente',
  'urn:cabinet:erro:campos-invalidos': 'Campos inválidos',
  'urn:cabinet:erro:ordenacao-invalida': 'Ordenação inválida',
  'urn:cabinet:erro:paginacao-invalida': 'Paginação inválida',
  'urn:cabinet:erro:filtro-invalido': 'Filtro inválido',
  'urn:cabinet:erro:papel-invalido': 'Papel inválido',
  'urn:cabinet:erro:hierarquia-em-laco': 'Hierarquia em laço',
  'urn:cabinet:erro:senha-atual-invalida': 'Senha atual não confere',
  'urn:cabinet:erro:senha-fraca': 'Senha fraca',
  'urn:cabinet:erro:token-invalido': 'Link inválido',
  'urn:cabinet:erro:token-expirado': 'Link expirado',
  'urn:cabinet:erro:email-nao-enviado': 'E-mail não enviado',
  'urn:cabinet:erro:nao-encontrado': 'Não encontrado',
  'urn:cabinet:erro:sem-empresa-ativa': 'Sem empresa ativa',
  'urn:cabinet:erro:documento-ja-cadastrado': 'Documento já cadastrado',
  'urn:cabinet:erro:email-ja-cadastrado': 'E-mail já cadastrado',
  'urn:cabinet:erro:codigo-ja-cadastrado': 'Código já cadastrado',
  'urn:cabinet:erro:vinculo-ja-existe': 'Vínculo já existe',
  'urn:cabinet:erro:papel-de-sistema': 'Papel de sistema',
  'urn:cabinet:erro:pedido-ja-convertido': 'Pedido já gerado',
  'urn:cabinet:erro:valor-nao-parcelavel': 'Valor não parcelável',
  'urn:cabinet:erro:parcelas-acima-do-teto': 'Parcelas acima do teto',
  'urn:cabinet:erro:parcela-abaixo-do-minimo': 'Parcela abaixo do mínimo',
  'urn:cabinet:erro:transicao-invalida': 'Transição inválida',
  'urn:cabinet:erro:demonstracao-em-aberto': 'Demonstração em aberto',
  'urn:cabinet:erro:orcamento-ja-revisado': 'Orçamento já revisado',
  'urn:cabinet:erro:faturamento-minimo-nao-atingido': 'Faturamento mínimo não atingido',
  'urn:cabinet:erro:item-ja-em-ordem': 'Item já está em uma ordem',
  'urn:cabinet:erro:ordem-ja-enviada': 'Ordem já enviada',
  'urn:cabinet:erro:fornecedor-divergente': 'Fornecedor divergente',
  'urn:cabinet:erro:periodo-ja-fechado': 'Período já fechado',
  'urn:cabinet:erro:origem-ja-paga': 'Origem já paga',
  'urn:cabinet:erro:participante-ja-apurado': 'Participação já apurada',
  'urn:cabinet:erro:profissional-exige-transferencia': 'Troca de profissional exige transferência',
  'urn:cabinet:erro:reserva-ja-lancada': 'Reserva técnica já lançada',
  // A escada FÍSICA da venda (G4). Seis, e não uma: cada uma tem uma ação
  // diferente na tela — corrigir o campo, liberar, separar, abrir outro romaneio,
  // cancelar em vez de fechar, trocar o romaneio. Um 409 genérico em cima delas
  // devolveria à tela a informação que o status já deu.
  'urn:cabinet:erro:liberacao-acima-do-vendido': 'Liberação acima do vendido',
  'urn:cabinet:erro:separacao-sem-liberacao': 'Separação sem liberação',
  'urn:cabinet:erro:entrega-sem-separacao': 'Entrega sem separação',
  'urn:cabinet:erro:entrega-fechada': 'Entrega fechada',
  'urn:cabinet:erro:entrega-vazia': 'Entrega vazia',
  'urn:cabinet:erro:entrega-de-outro-pedido': 'Entrega de outro pedido',
  'urn:cabinet:erro:nao-implementado': 'Não implementado',
  'urn:cabinet:erro:resposta-nao-json': 'Resposta não é da API',
}

/** O rótulo do `about:blank`, em que o tipo É o status. */
const TITULO_GENERICO: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Sem permissão',
  404: 'Não encontrado',
  409: 'Conflito',
  500: 'Erro interno',
}

/** O título que o contrato manda mandar para este par tipo+status. */
export function tituloDoProblema(tipo: ProblemType, status: number): string {
  if (tipo !== 'about:blank') return TITULO_POR_TIPO[tipo]
  return TITULO_GENERICO[status] ?? 'Erro'
}

/**
 * Os MEMBROS DE EXTENSÃO da RFC, e o contrato declara dois. Extensão nova entra
 * no schema primeiro — solta aqui, o front a descobriria por acidente.
 */
export type Extensoes = {
  fields?: ProblemFieldError[]
  existingPartnerId?: string
}

/**
 * Resposta de erro no formato do contrato.
 *
 * O corpo é tipado como `ProblemDetails` de propósito: membro que o schema
 * exige e não sai daqui reprova no `tsc`, em vez de sumir na resposta.
 */
export function problemaJson(
  status: number,
  detail: string,
  extras: Extensoes = {},
  tipo: ProblemType = TIPO.generico,
) {
  const corpo: ProblemDetails = {
    type: tipo,
    title: tituloDoProblema(tipo, status),
    status,
    detail,
    ...extras,
  }
  return HttpResponse.json(corpo, {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

/**
 * Os erros COM NOME, espelhando os do backend real (`core/http/problema.ts`).
 *
 * Existem para que o `type` certo não dependa de cada handler lembrar da URN:
 * 26 chamadas de 404 escritas à mão dariam 26 chances de mandar `about:blank`
 * onde o servidor de verdade manda `nao-encontrado`, e a divergência só
 * apareceria na integração.
 */

/** Sem sessão. Nunca para "logado, mas não pode" — isso é 403. */
export const semSessao = () => problemaJson(401, 'Não autenticado.', {}, TIPO.semSessao)

/**
 * O recurso EXIGE empresa e a sessão não tem uma. 409 e não 400: falta uma AÇÃO
 * da pessoa. **Listagem não usa isto** — ela devolve `{rows:[],total:0}`.
 */
export const semEmpresaAtiva = () =>
  problemaJson(409, 'Nenhuma empresa ativa na sessão.', {}, TIPO.semEmpresaAtiva)

export const naoEncontrado = (detail: string) => problemaJson(404, detail, {}, TIPO.naoEncontrado)

/**
 * Validação por campo. A frase de topo é sempre a mesma e não tenta resumir o
 * que deu errado — quem diz isso é `fields[]`, ao lado de cada controle.
 */
export const camposInvalidos = (fields: ProblemFieldError[]) =>
  problemaJson(400, 'Confira os campos destacados.', { fields }, TIPO.camposInvalidos)

export const conflito = (
  detail: string,
  tipo: ProblemType = TIPO.generico,
  extras: Extensoes = {},
) => problemaJson(409, detail, extras, tipo)
