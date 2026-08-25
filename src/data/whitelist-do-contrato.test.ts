import { ORDENAVEIS_ATIVIDADE } from '@/data/atividades-api'
import {
  FILTRAVEIS_OPORTUNIDADE,
  ORDENAVEIS_FUNIL,
  ORDENAVEIS_MOTIVO_DE_PERDA,
  ORDENAVEIS_OPORTUNIDADE,
} from '@/data/crm-api'
import {
  FILTRAVEIS as FILTRAVEIS_PARCEIRO,
  ORDENAVEIS as ORDENAVEIS_PARCEIRO,
} from '@/data/parceiros-api'
import {
  FILTRAVEIS as FILTRAVEIS_PRODUTO,
  ORDENAVEIS as ORDENAVEIS_PRODUTO,
} from '@/data/produtos-api'
import { FILTRAVEIS_ORCAMENTO, ORDENAVEIS_ORCAMENTO } from '@/data/quotes-api'
import { ORDENAVEIS_CONCESSAO } from '@/data/suporte-api'
import { ORDENAVEIS_PAPEL as ORDENAVEIS_PAPEL_MOCK } from '@/mocks/api/acesso'
import { ORDENAVEIS as ORDENAVEIS_ATIVIDADE_MOCK } from '@/mocks/api/atividades'
import {
  ORDENAVEIS_ORDEM_DE_COMPRA,
  ORDENAVEIS_PEDIDO_DE_COMPRA,
  ORDENAVEIS_PREVISAO,
  ORDENAVEIS_REPOSICAO,
} from '@/mocks/api/compras'
import { ORDENAVEIS as ORDENAVEIS_CONTATO_MOCK } from '@/mocks/api/contatos'
import {
  FILTRAVEIS_OPORTUNIDADE as FILTRAVEIS_OPORTUNIDADE_MOCK,
  ORDENAVEIS_COLABORADOR as ORDENAVEIS_COLABORADOR_MOCK,
  ORDENAVEIS_FUNIL as ORDENAVEIS_FUNIL_MOCK,
  ORDENAVEIS_MOTIVO as ORDENAVEIS_MOTIVO_MOCK,
  ORDENAVEIS_OPORTUNIDADE as ORDENAVEIS_OPORTUNIDADE_MOCK,
} from '@/mocks/api/crm'
import { ORDENAVEIS_DEPOSITO, ORDENAVEIS_SALDO } from '@/mocks/api/depositos'
import {
  FILTRAVEIS_PARCEIRO as FILTRAVEIS_PARCEIRO_MOCK,
  FILTRAVEIS_PRODUTO as FILTRAVEIS_PRODUTO_MOCK,
  ORDENAVEIS_LOOKUPS as ORDENAVEIS_LOOKUPS_MOCK,
  ORDENAVEIS_MOVIMENTO as ORDENAVEIS_MOVIMENTO_MOCK,
  ORDENAVEIS_PARCEIRO as ORDENAVEIS_PARCEIRO_MOCK,
  ORDENAVEIS_PRODUTO as ORDENAVEIS_PRODUTO_MOCK,
} from '@/mocks/api/handlers'
import { FILTRAVEIS as FILTRAVEIS_OBRA, ORDENAVEIS as ORDENAVEIS_OBRA } from '@/mocks/api/obras'
import { ORDENAVEIS_CONDICAO } from '@/mocks/api/pagamento'
import {
  FILTRAVEIS as FILTRAVEIS_ORCAMENTO_MOCK,
  ORDENAVEIS as ORDENAVEIS_ORCAMENTO_MOCK,
} from '@/mocks/api/quotes'
import {
  ORDENAVEIS_ANIVERSARIANTES,
  ORDENAVEIS_ATENDENTE,
  ORDENAVEIS_COMPARATIVO,
  ORDENAVEIS_CURVA_ABC,
  ORDENAVEIS_DIAS_SEM_VENDA,
  ORDENAVEIS_ESTOQUE_VALORIZADO,
  ORDENAVEIS_FORNECEDOR,
  ORDENAVEIS_ORCAMENTO_X_ESTOQUE,
  ORDENAVEIS_PRODUTO_VENDIDO,
  ORDENAVEIS_PROFISSIONAL,
} from '@/mocks/api/relatorios'
import { ORDENAVEIS_SERVICO } from '@/mocks/api/servicos'
import {
  ORDENAVEIS_CONCESSAO as ORDENAVEIS_CONCESSAO_MOCK,
  ORDENAVEIS_TRILHA as ORDENAVEIS_TRILHA_MOCK,
} from '@/mocks/api/suporte'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * `sortBy` FORA DA WHITELIST É 400 — E A WHITELIST PRECISA ESTAR PUBLICADA.
 *
 * O padrão 1 do `CLAUDE.md` descreve o modo de falhar: coluna cujo `accessorKey`
 * o servidor não aceita "quebra a ordenação com 400 só ao clicar no cabeçalho".
 * O que faltava era o outro lado dessa frase — **onde está escrito o que o
 * servidor aceita**. Em 21/08 a resposta era: em lugar nenhum, para 11 das 13
 * listagens (#284). A lista existia duas vezes, em `src/data/*-api.ts` e no
 * `MapaDeCampos` de cada módulo do `cabinet-erp-api`, e as duas cópias não se
 * conheciam. Foi assim que a obra publicou um par `id`+`name` cuja metade legível
 * não ordenava (#273).
 *
 * ## O que este arquivo guarda
 *
 * 1. **Toda listagem que publica `sortBy` declara a whitelist na descrição** — o
 *    mesmo cobrado do `filters` em `tests/filtros-do-contrato.test.ts` do
 *    `cabinet-erp-api`. Parâmetro cujo valor válido não está escrito é 400 que
 *    ninguém consegue prever.
 * 2. **A lista do front é IGUAL à publicada**, onde o front guarda uma. Divergir
 *    faz a tela desenhar a coluna ordenável e o servidor recusar o clique.
 * 3. **Listagem sem lista no front é nomeada**, com motivo. Sem isso, a lista
 *    nova nasce sem ninguém conferindo e a guarda não percebe.
 *
 * A lista de listagens é DESCOBERTA no contrato, nunca escrita aqui: operação
 * nova entra na cobrança sozinha. E a leitura da whitelist é a MESMA dos outros
 * dois lugares que já a fazem (o corte no travessão, no ponto ou no `**`),
 * porque as descrições seguem falando de campos depois de terminar a lista.
 */

interface Parametro {
  name: string
  description?: string
}
interface Operacao {
  operationId?: string
  parameters?: Parametro[]
}
const doc = contrato as unknown as { paths: Record<string, Record<string, Operacao>> }

type Listagem = {
  operationId: string
  caminho: string
  sortBy: string[] | undefined
  filters: string[] | undefined
}

/**
 * "Listagem" = operação `GET` que publica `pageSize`. É o traço do contrato, e
 * não um nome mantido à mão — o mesmo critério do guarda do backend.
 */
function listagensDoContrato(): Listagem[] {
  const achadas: Listagem[] = []
  for (const [caminho, item] of Object.entries(doc.paths)) {
    const op = item.get
    if (op === undefined) continue
    const parametros = op.parameters ?? []
    if (!parametros.some((p) => p.name === 'pageSize')) continue
    achadas.push({
      operationId: op.operationId ?? `GET ${caminho}`,
      caminho,
      sortBy: whitelist(parametros.find((p) => p.name === 'sortBy')),
      filters: whitelist(parametros.find((p) => p.name === 'filters')),
    })
  }
  return achadas
}

/** `undefined` = o parâmetro não é publicado. `[]` = publicado e MUDO. */
function whitelist(parametro: Parametro | undefined): string[] | undefined {
  if (parametro === undefined) return undefined
  const texto = (parametro.description ?? '').replace(/\s+/g, ' ')
  const rotulo = /Whitelist( deste recurso)?:/.exec(texto)
  if (rotulo === null) return []
  const resto = texto.slice(rotulo.index + rotulo[0].length)
  const fim = resto.search(/—|\.\s|\*\*/)
  return [...(fim === -1 ? resto : resto.slice(0, fim)).matchAll(/`([^`]+)`/g)].map(
    (m) => m[1] as string,
  )
}

/** A REGRA, sobre dados — para os modos de reprovar serem exercíveis com listas de mentira. */
function publicamSemDeclarar(listagens: readonly Listagem[], qual: 'sortBy' | 'filters'): string[] {
  return listagens
    .filter((l) => l[qual] !== undefined && l[qual]?.length === 0)
    .map((l) => l.operationId)
    .sort()
}

/**
 * As listagens cujo `sortBy` o front NÃO guarda em lista própria, e por quê.
 *
 * Não é allowlist de conveniência: é o inventário do que ainda não tem tela. No
 * dia em que uma delas ganhar `ORDENAVEIS`, o caso "o inventário é o complemento"
 * reprova e cobra a entrada aqui — que é o mesmo que cobrar a conferência.
 */
const SEM_LISTA_NO_FRONT: Record<string, string> = {
  // A TRILHA do suporte (item 6 da fundação). A fronteira a lê, mas não publica
  // `sortBy`: a trilha se lê por SEQUÊNCIA, e a única ordenação que faz sentido
  // nela — tempo — é o padrão. Oferecer o parâmetro à tela seria oferecer a
  // leitura errada da auditoria, agrupada por tipo de evento em vez de por
  // ordem dos fatos. Quem ganhar tela de suporte herda esta decisão, não um
  // `ORDENAVEIS` a preencher.
  ListSupportGrantAudit:
    'a trilha ordena só por tempo, e é o padrão — a fronteira não expõe `sortBy` de propósito',
  // IMPRESSÃO (web#333 / api#163). A tela de layouts de etiqueta é o editor de
  // medidas, e ela nasce depois do motor de render pela mesma razão das telas de
  // entrega: sem PDF para conferir, o editor deixaria alguém acertar milímetro
  // contra uma prévia que não existe. Sai daqui quando ganhar tela, com
  // `ORDENAVEIS` próprio.
  ListLabelLayouts:
    'o editor de etiqueta ainda não tem tela — ela nasce com o motor de render (api#163 fase B)',
  // SEPARAÇÃO E ENTREGA (G4) — a fila do galpão e o romaneio são a FASE C deste
  // trilho, e nascem depois do servidor pela razão do módulo inteiro: a fila
  // mostra o que já pode sair da prateleira, e sobre dado mockado ela mandaria
  // alguém procurar peça que ninguém liberou. Saem daqui quando ganharem tela,
  // com `ORDENAVEIS` próprio.
  ListPickingQueue:
    'a fila de separação ainda não tem tela — as telas de entrega são a Fase C do trilho',
  ListDeliveries: 'o romaneio ainda não tem tela — as telas de entrega são a Fase C do trilho',
  ListOrders: 'pedido de venda ainda não tem listagem própria na tela',
  ListOrderProfessionalHistory:
    'a trilha de indicação (G13) é sub-recurso do pedido e nasce sem tela — cabeçalho ordenável exigiria a tela do pedido, que não existe',
  ListCatalogLookups: 'o combo pede por `kind` e não ordena — não há cabeçalho para clicar',
  ListStockMovements: 'kardex desenha em ordem fixa (`occurredAt` desc), sem coluna ordenável',
  ListEmployees: 'colaborador ainda é provider de mock, com lista própria lá',
  ListPartnerContacts: 'a grade do parceiro é sub-recurso e não tem cabeçalho ordenável',
  ListRoles:
    'papéis nasceram no contrato antes da tela — a de checkboxes é trilho próprio, depois da fase 1 do api#84',
  ListStockLocations:
    'depósito ainda não tem tela — a lista existe no mock, e é lá que é conferida',
  ListStockBalances: 'saldo por depósito ainda não tem tela — idem, a lista é a do mock',
  ListPaymentTerms:
    'o bloco Pagamento do documento consome a lista inteira ordenada por `name` e não oferece ordenação ao operador — a whitelist existe no mock, e é lá que é conferida',
  ListServices:
    'o cadastro de serviços nasceu no contrato antes da tela — a lista existe no mock, e é lá que é conferida',
  ListCostProfiles:
    'o perfil de custo (G9) nasce no servidor sem tela e sem mock — a cascata não se reimplementa em fixture, e margem inventada é pior que tela vazia',
  ListPriceIndexes:
    'o índice de venda (G9) é a METADE VENDA do mesmo trilho do perfil de custo acima, e fica de fora pela mesma razão: o mock teria de inventar índice E tabela de fornecedor para ecoar um preço calculado, e o terceiro dado de mentira sai com cara de preço apurado pelo servidor',
  // OS DEZ RELATÓRIOS (#310) — a seção Relatórios é a Fase C deste mesmo trilho,
  // e nasce depois do servidor por decisão: tela de relatório sobre dado mockado
  // mostra número inventado com cara de apuração, que é pior do que não mostrar
  // nada. Cada um sai daqui quando ganhar a aba dele, com `ORDENAVEIS` próprio.
  //
  // Eles caem nesta guarda por publicarem `pageSize`, e isso é correto e não
  // acidente: relatório PAGINA, e por paginar precisa dizer por onde ordena —
  // sem `sortBy` declarado, a coluna que a tela desenhar clicável vira 400.
  // AS QUATRO LISTAGENS DE COMPRAS (G2) — as telas são a FASE C deste mesmo
  // trilho, e nascem depois do servidor pela razão que o módulo inteiro tem: a
  // tela de montar ordem agrupa linha de pedido por fornecedor e confere
  // faturamento mínimo, e sobre dado mockado ela mostraria uma ordem que o
  // servidor recusaria. Cada uma sai daqui quando ganhar a tela, com
  // `ORDENAVEIS` próprio.
  ListPurchaseRequests:
    'pedido de compra ainda não tem tela — as telas de Compras são a Fase C do trilho',
  ListPurchaseOrders:
    'ordem de compra ainda não tem tela — as telas de Compras são a Fase C do trilho',
  GetPurchaseArrivalForecast:
    'previsão de chegada ainda não tem tela — as telas de Compras são a Fase C do trilho',
  GetPurchaseStockReplenishment:
    'compras para estoque/reserva ainda não tem tela — as telas de Compras são a Fase C do trilho',
  GetAbcCurveReport: 'curva ABC ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  // O RECEBIMENTO (G3) — a tela é a Fase C deste trilho e nasce depois do
  // servidor pela razão que o módulo inteiro tem: a conferência confronta o que
  // a ORDEM DE COMPRA pediu com o que chegou, e sobre dado mockado ela
  // confrontaria uma ordem inventada. O `sortBy` publicado é conferido do lado
  // do api, contra o `MapaDeCampos` do módulo, na fase B.
  ListGoodsReceipts: 'recebimento ainda não tem tela — as telas de Compras são a Fase C do trilho',
  GetProductsSoldReport:
    'produto vendido ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetSalesComparisonReport:
    'comparativo de vendas ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetSalespersonReport:
    'demonstrativo por atendente ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetProfessionalRankingReport:
    'ranking de profissional ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetSupplierMovementReport:
    'movimentação por fornecedor ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetStockValuationReport:
    'estoque valorizado ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetStockAgingReport:
    'dias sem venda ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetQuoteVsStockReport:
    'orçamento × estoque ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  GetBirthdaysReport:
    'aniversariantes do mês ainda não tem tela — a seção Relatórios é a Fase C do trilho',
  // AS SETE LISTAGENS DE COMISSÕES (G8) — a aba Participação da venda, a consulta de
  // ganhos e a tela de fechamento são a Fase C deste trilho, e nascem depois do
  // servidor pela razão que o módulo inteiro tem: apuração sobre dado mockado mostra
  // dinheiro inventado com cara de conta fechada, que é pior do que não mostrar nada.
  // Cada uma sai daqui quando ganhar a tela, com `ORDENAVEIS` próprio.
  ListOrderParticipants:
    'a aba Participação do pedido ainda não existe — a grade é Fase C do trilho de comissões',
  ListEmployeeCommissionTiers:
    'o perfil de comissão do colaborador ainda não tem aba — o cadastro de colaborador é provider de mock',
  ListPartnerCommissionTiers:
    'o perfil de participação do profissional ainda não tem aba — a tela do parceiro é Fase C do trilho',
  ListTechnicalReserves: 'a Reserva Técnica ainda não tem tela — Fase C do trilho de comissões',
  GetCommissionEarnings: 'a consulta de ganhos ainda não tem tela — Fase C do trilho de comissões',
  ListCommissionClosings:
    'o fechamento de comissão ainda não tem tela — Fase C do trilho de comissões',
  ListCommissionClosingEntries:
    'as linhas do fechamento são sub-recurso e nascem sem tela, junto com o fechamento',
}

/** O `sortBy` publicado × a lista que o front manda. */
const ORDENAVEIS_DO_FRONT: Record<string, readonly string[]> = {
  ListProducts: ORDENAVEIS_PRODUTO,
  ListPartners: ORDENAVEIS_PARCEIRO,
  ListQuotes: ORDENAVEIS_ORCAMENTO,
  ListActivities: ORDENAVEIS_ATIVIDADE,
  ListCrmPipelines: ORDENAVEIS_FUNIL,
  ListCrmOpportunities: ORDENAVEIS_OPORTUNIDADE,
  ListCrmLostReasons: ORDENAVEIS_MOTIVO_DE_PERDA,
  ListWorks: ORDENAVEIS_OBRA,
  // A fronteira do suporte existe antes da tela (regra de acesso a dado não
  // abre exceção), e ela já carrega a whitelist — então entra AQUI, e não no
  // inventário de "sem lista no front".
  ListSupportGrants: ORDENAVEIS_CONCESSAO,
}

/**
 * O `sortBy` publicado × a lista que O MOCK recusa fora dela.
 *
 * Duas cópias diferentes da mesma frase: `src/data/*-api.ts` é o que a TELA
 * manda, e estas são as que o MOCK aceita. As duas precisam bater com o
 * contrato, e por motivos diferentes — a primeira porque o servidor recusa, a
 * segunda porque **o site público é 100% mock** e ali quem recusa é ela.
 *
 * Três estavam menores que o contrato quando esta lista nasceu: `catalog-lookups`
 * sem `active`, o kardex só com `occurredAt`, e o parceiro sem `parentId` — este
 * com a TELA mandando `parentId`, ou seja, 400 garantido no clique do cabeçalho
 * em `cabinetonline.cc`.
 */
const ORDENAVEIS_DO_MOCK: Record<string, readonly string[]> = {
  ListProducts: ORDENAVEIS_PRODUTO_MOCK,
  ListPartners: ORDENAVEIS_PARCEIRO_MOCK,
  ListCatalogLookups: ORDENAVEIS_LOOKUPS_MOCK,
  ListStockMovements: ORDENAVEIS_MOVIMENTO_MOCK,
  ListPartnerContacts: ORDENAVEIS_CONTATO_MOCK,
  ListQuotes: ORDENAVEIS_ORCAMENTO_MOCK,
  ListActivities: ORDENAVEIS_ATIVIDADE_MOCK,
  ListCrmPipelines: ORDENAVEIS_FUNIL_MOCK,
  ListCrmLostReasons: ORDENAVEIS_MOTIVO_MOCK,
  ListCrmOpportunities: ORDENAVEIS_OPORTUNIDADE_MOCK,
  ListEmployees: ORDENAVEIS_COLABORADOR_MOCK,
  ListWorks: ORDENAVEIS_OBRA,
  ListRoles: ORDENAVEIS_PAPEL_MOCK,
  // SUPORTE-DA-PLATAFORMA (item 6 da fundação) — nasce sem tela e COM mock, e
  // aqui isso pesa mais que no resto: o site público é 100% mock, então quem
  // recusa prazo ausente, motivo de fachada e segunda concessão é o handler.
  ListSupportGrants: ORDENAVEIS_CONCESSAO_MOCK,
  ListSupportGrantAudit: ORDENAVEIS_TRILHA_MOCK,
  // Depósito e saldo nascem sem tela e COM mock (#291). É este eixo que os
  // mede, e não o de cima: quem recusa `sortBy` fora da whitelist, hoje, é o
  // handler — e o site público é 100% mock.
  ListStockLocations: ORDENAVEIS_DEPOSITO,
  ListStockBalances: ORDENAVEIS_SALDO,
  // Condição de pagamento nasce sem tela e COM mock (S4), como depósito: quem
  // recusa `sortBy` fora da whitelist, hoje, é o handler.
  ListPaymentTerms: ORDENAVEIS_CONDICAO,
  // Serviço nasce sem tela e COM mock, pela mesma razão: quem recusa `sortBy`
  // fora da whitelist, hoje, é o handler — e o site público é 100% mock.
  ListServices: ORDENAVEIS_SERVICO,
  // COMPRAS (G2) nasce sem tela e COM mock, como depósito e serviço: quem
  // recusa `sortBy` fora da whitelist, hoje, é o handler — e o site público é
  // 100% mock. As quatro saíram de `SEM_HANDLER_NO_MOCK` no mesmo commit em que
  // `src/mocks/api/compras.ts` passou a servi-las.
  ListPurchaseRequests: ORDENAVEIS_PEDIDO_DE_COMPRA,
  ListPurchaseOrders: ORDENAVEIS_ORDEM_DE_COMPRA,
  GetPurchaseArrivalForecast: ORDENAVEIS_PREVISAO,
  GetPurchaseStockReplenishment: ORDENAVEIS_REPOSICAO,
  // OS DEZ RELATÓRIOS (#310) entram por este eixo e NÃO pelo de cima: eles
  // nascem sem tela, e quem recusa `sortBy` fora da whitelist, hoje, é o
  // handler do mock — o site público é 100% mock. Relatório PAGINA, e por
  // paginar precisa dizer por onde ordena; a coluna que a Fase C desenhar
  // clicável fora desta lista vira 400 no clique do cabeçalho.
  GetAbcCurveReport: ORDENAVEIS_CURVA_ABC,
  GetProductsSoldReport: ORDENAVEIS_PRODUTO_VENDIDO,
  GetSalesComparisonReport: ORDENAVEIS_COMPARATIVO,
  GetSalespersonReport: ORDENAVEIS_ATENDENTE,
  GetProfessionalRankingReport: ORDENAVEIS_PROFISSIONAL,
  GetSupplierMovementReport: ORDENAVEIS_FORNECEDOR,
  GetStockValuationReport: ORDENAVEIS_ESTOQUE_VALORIZADO,
  GetStockAgingReport: ORDENAVEIS_DIAS_SEM_VENDA,
  GetQuoteVsStockReport: ORDENAVEIS_ORCAMENTO_X_ESTOQUE,
  GetBirthdaysReport: ORDENAVEIS_ANIVERSARIANTES,
}

/**
 * A listagem que o MOCK não serve, e por quê.
 *
 * `/api/orders` está no contrato e na passagem, e handler nenhum o responde: em
 * modo mock ele cai no fallback da SPA e volta `index.html` com 200, que é o
 * `urn:cabinet:erro:resposta-nao-json` do cliente. Hoje não morde porque tela
 * nenhuma o consome — quando alguma consumir, é o site público que quebra.
 */
const SEM_HANDLER_NO_MOCK: Record<string, string> = {
  // IMPRESSÃO (web#333 / api#163). Sem handler de mock de propósito: layout de
  // etiqueta é medida de papel, e um mock inventaria 210×297 com quatro colunas
  // para uma loja que compra rolo de outro tamanho. Quem abrir a tela sem proxy
  // tem de ver que não há dado, não um rolo plausível.
  ListLabelLayouts:
    'medida de papel não se inventa — o mock devolveria uma etiqueta que não existe na loja',
  // SEPARAÇÃO E ENTREGA (G4) caem aqui pelo MESMO motivo da trilha de indicação,
  // e não pelo dos relatórios: as duas são progresso FÍSICO de linha de pedido, e
  // o pedido de venda não tem handler no mock. Servi-las sem o documento dono
  // faria a fila do galpão listar peça de um pedido que só existe no navegador,
  // com uuid que nenhuma outra tela reconhece. Saem daqui junto com o mock do
  // pedido, não antes — e é por isso que não é dívida separada.
  ListPickingQueue:
    'a fila de separação é derivada do pedido de venda, que não tem handler no mock — a fila sem o documento dono listaria peça de pedido inexistente',
  ListDeliveries:
    'o romaneio pende do pedido de venda, que não tem handler no mock — mockar a entrega sem o documento dono casaria id inventado com id de servidor',
  ListOrders: 'pedido de venda não tem handler no mock — nenhuma tela o consome ainda',
  ListCostProfiles:
    'o perfil de custo (G9) passa direto para o servidor — ver `rotas-do-backend.ts`: a simulação exige a cascata inteira, e um mock dela devolveria margem inventada',
  // COMPRAS (G2) SAIU DAQUI. O motivo que estava escrito — "o mock não guarda
  // qual linha já foi levada por uma ordem" — deixou de valer: `compras.ts`
  // guarda esse estado em `LinhaDePedido.purchaseOrderId`, e é dele que saem o
  // `status` derivado do pedido, o recorte `onlyOpenItems`, o 409 de
  // `item-ja-em-ordem` e as duas consultas. As quatro estão em
  // `ORDENAVEIS_DO_MOCK`, acima.
  //
  // OS DEZ RELATÓRIOS (#310) TAMBÉM SAÍRAM, e o motivo que estava escrito —
  // "somar dez relatórios seria reimplementar em TypeScript as agregações que o
  // Postgres faz do outro lado" — continua VALENDO, e é por isso que
  // `relatorios.ts` não as reimplementa. Ele agrega só o que o mock TEM
  // (estoque, orçamento, aniversário) e devolve envelope VAZIO onde a fonte é o
  // pedido de venda, que o mock não guarda. Nenhuma soma disputa com o
  // `GROUP BY` do servidor, e o caminho deixa de responder `index.html` com 200.
  ListOrderProfessionalHistory:
    'a trilha de indicação é sub-recurso do pedido, que não tem handler no mock — mockar a trilha sem o documento dono casaria id inventado com id de servidor',
  ListGoodsReceipts:
    'recebimento não tem handler no mock — a grade confronta o que a ordem de compra pediu com o que chegou, e o mock não guarda ordem; mockar a conferência sem a ordem dona daria divergência calculada contra número inventado',
  // AS SETE DE COMISSÕES (G8) pela MESMA razão da trilha de indicação, e não pela
  // do 501: a apuração soma sobre o PEDIDO DE VENDA, que o mock não guarda.
  // Reimplementá-la aqui inventaria dinheiro — um número com cara de conta
  // fechada, calculado sobre documento que não existe. As três primeiras são
  // sub-recurso de pedido/pessoa e casariam id inventado com id de servidor;
  // as quatro últimas não têm sobre o que somar.
  ListOrderParticipants:
    'sub-recurso do pedido de venda, que não tem handler no mock — participação sem o documento dono casaria id inventado com id de servidor',
  ListEmployeeCommissionTiers:
    'perfil de comissão é sub-recurso do colaborador, e a lista de pessoas do mock diverge da do servidor (a costura já declarada em `cobertura-do-colaborador`)',
  ListPartnerCommissionTiers:
    'perfil de participação é sub-recurso do parceiro, cuja família JÁ passa pelo backend — mockar só o filho partiria a família',
  ListTechnicalReserves: 'a Reserva Técnica nasce de um pedido de venda, que o mock não guarda',
  GetCommissionEarnings:
    'a apuração AGREGA sobre pedido de venda — mesma razão que manteve os dez relatórios de venda fora: somar aqui reimplementaria em TypeScript o que o Postgres faz do outro lado, e sobre dado que não existe',
  ListCommissionClosings: 'fechamento é consequência da apuração, que o mock não tem como calcular',
  ListCommissionClosingEntries:
    'as linhas do fechamento são sub-recurso do fechamento, que não tem handler',
  ListPriceIndexes:
    'o índice é METADE de um cálculo, não um cadastro que se olha: servi-lo obrigaria o mock a inventar também a tabela de preço por fornecedor e a ecoar `calculatedUnitPriceCents` no item do orçamento — três dados de mentira encadeados, e o terceiro sai com cara de preço apurado pelo servidor. Envelope vazio seria pior: a tela concluiria que a empresa não tem índice nenhum. Sai daqui quando a tela do G9 nascer, com o mock derivando o preço da MESMA fórmula do servidor',
}

/**
 * O `filters` publicado × o que O MOCK aplica.
 *
 * A régua da linha de cima mede a TELA; esta mede quem recorta em modo mock. O
 * pior caso deste eixo não é recusar demais, é **ignorar**: filtro descartado em
 * silêncio devolve a lista inteira com a condição desenhada no painel, e quem lê
 * conclui que ela não estreita nada. Era o caso do orçamento até 2026-08-22 — o
 * handler nunca olhou para `filters`.
 */
const FILTRAVEIS_DO_MOCK: Record<string, readonly string[]> = {
  ListProducts: Object.keys(FILTRAVEIS_PRODUTO_MOCK),
  ListPartners: Object.keys(FILTRAVEIS_PARCEIRO_MOCK),
  ListQuotes: Object.keys(FILTRAVEIS_ORCAMENTO_MOCK),
  ListCrmOpportunities: Object.keys(FILTRAVEIS_OPORTUNIDADE_MOCK),
  ListWorks: Object.keys(FILTRAVEIS_OBRA),
}

/** O `filters` publicado × a lista que o front manda, onde ele publica. */
const FILTRAVEIS_DO_FRONT: Record<string, readonly string[]> = {
  ListProducts: FILTRAVEIS_PRODUTO,
  ListPartners: FILTRAVEIS_PARCEIRO,
  ListQuotes: FILTRAVEIS_ORCAMENTO,
  ListCrmOpportunities: FILTRAVEIS_OPORTUNIDADE,
  ListWorks: Object.keys(FILTRAVEIS_OBRA),
}

const listagens = listagensDoContrato()

describe('1. o contrato é lido de verdade (a guarda se guarda)', () => {
  it('acha as listagens pelo traço `pageSize`, não por uma lista escrita aqui', () => {
    // Piso: se a leitura parar de casar, ela acha zero e todo o resto do arquivo
    // percorre lista vazia — verde para sempre, medindo nada.
    expect(listagens.length).toBeGreaterThanOrEqual(13)
    expect(listagens.every((l) => l.sortBy !== undefined)).toBe(true)
  })
})

describe('2. quem publica `sortBy` diz QUAIS campos', () => {
  it('nenhuma listagem publica o parâmetro e cala a whitelist', () => {
    expect(
      publicamSemDeclarar(listagens, 'sortBy'),
      'Operação publica `sortBy` e a descrição não diz a whitelist. O valor válido ' +
        'passa a existir só no código dos dois lados, e o 400 vira surpresa no clique.',
    ).toEqual([])
  })

  it('o mesmo vale para `filters`, onde ele é publicado', () => {
    expect(publicamSemDeclarar(listagens, 'filters')).toEqual([])
  })
})

describe('3. a lista do front é a publicada', () => {
  it.each(Object.keys(ORDENAVEIS_DO_FRONT))('%s ordena pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.sortBy
    expect(publicada, `${opid} sumiu do contrato`).toBeDefined()
    expect([...(ORDENAVEIS_DO_FRONT[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it.each(Object.keys(FILTRAVEIS_DO_FRONT))('%s filtra pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.filters
    expect(publicada, `${opid} não publica filters`).toBeDefined()
    expect([...(FILTRAVEIS_DO_FRONT[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })
})

describe('3b. o MOCK aceita o que o contrato publica', () => {
  it.each(Object.keys(ORDENAVEIS_DO_MOCK))('%s ordena pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.sortBy
    expect(publicada, `${opid} sumiu do contrato`).toBeDefined()
    expect([...(ORDENAVEIS_DO_MOCK[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it.each(Object.keys(FILTRAVEIS_DO_MOCK))('%s filtra pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.filters
    expect(publicada, `${opid} não publica filters`).toBeDefined()
    expect([...(FILTRAVEIS_DO_MOCK[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it('quem publica `filters` tem mock que os APLICA — ignorar é pior que recusar', () => {
    // Filtro descartado em silêncio faz a tela mostrar a lista inteira com a
    // condição no painel. Se uma listagem publica `filters` e não aparece aqui,
    // ou ela ganhou um mapa no mock, ou o handler dela não existe (e aí está
    // nomeado no inventário abaixo).
    const semMapa = listagens
      .filter((l) => l.filters !== undefined)
      .map((l) => l.operationId)
      .filter((id) => FILTRAVEIS_DO_MOCK[id] === undefined && SEM_HANDLER_NO_MOCK[id] === undefined)
      .sort()

    expect(semMapa, 'publica `filters` e o mock não os aplica').toEqual([])
  })

  it('toda listagem tem handler no mock, ou está nomeada com o motivo', () => {
    const orfas = listagens
      .map((l) => l.operationId)
      .filter((id) => ORDENAVEIS_DO_MOCK[id] === undefined && SEM_HANDLER_NO_MOCK[id] === undefined)
      .sort()

    expect(
      orfas,
      'Listagem do contrato que o mock não serve e ninguém declarou: em modo mock ' +
        'ela devolve o `index.html` da SPA com 200, e o site público é 100% mock.',
    ).toEqual([])
  })
})

describe('4. o inventário é o complemento — nada fica sem dono em silêncio', () => {
  it('toda listagem ou tem lista no front, ou está nomeada com motivo', () => {
    const orfas = listagens
      .map((l) => l.operationId)
      .filter((id) => ORDENAVEIS_DO_FRONT[id] === undefined && SEM_LISTA_NO_FRONT[id] === undefined)
      .sort()

    expect(
      orfas,
      'Listagem do contrato que ninguém confere: ou ela ganha `ORDENAVEIS` no front ' +
        'e entra em ORDENAVEIS_DO_FRONT, ou entra em SEM_LISTA_NO_FRONT com o motivo.',
    ).toEqual([])
  })

  it('o inventário não guarda nome que o contrato não conhece', () => {
    const conhecidas = new Set(listagens.map((l) => l.operationId))
    const fantasmas = Object.keys(SEM_LISTA_NO_FRONT).filter((id) => !conhecidas.has(id))

    expect(fantasmas, 'nome no inventário que sumiu do contrato — lixo de renomeação').toEqual([])
  })
})

describe('5. a guarda sabe ficar vermelha', () => {
  const mudo: Listagem[] = [
    { operationId: 'ListFalsa', caminho: '/api/falsa', sortBy: [], filters: undefined },
    { operationId: 'ListOutra', caminho: '/api/outra', sortBy: ['a'], filters: [] },
  ]

  it('acusa quem publica o parâmetro sem declarar a whitelist', () => {
    expect(publicamSemDeclarar(mudo, 'sortBy')).toEqual(['ListFalsa'])
    expect(publicamSemDeclarar(mudo, 'filters')).toEqual(['ListOutra'])
  })

  it('a leitura corta no fim da FRASE, não engole o resto da descrição', () => {
    // `/api/crm/opportunities` continua falando de campos depois da lista, para
    // dizer o que ficou de FORA. Parser guloso cobraria o contrário da frase.
    const opp = listagens.find((l) => l.operationId === 'ListCrmOpportunities')

    expect(opp?.sortBy).toContain('expectedValueCents')
    expect(opp?.filters).not.toContain('expectedValueCents')
  })
})
