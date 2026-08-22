import type {
  PagedResultOfPartnerDto,
  PartnerAddress,
  PartnerDto,
  PartnerPayoutBankInfo,
  PartnerWriteRequest,
} from '@/api/gerado'
import { createPartner, getPartner, linkPartner, listPartners, updatePartner } from '@/api/gerado'
import {
  ErroDaApi,
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DE PARCEIROS — `GET /api/partners`.
 *
 * Uma tabela só, três telas. Fornecedor, Cliente e Profissional Externo são
 * PAPÉIS do mesmo cadastro (`is_customer`/`is_supplier`/`is_professional` no
 * schema), e o endpoint filtra por `role`. Não é o front que decidiu unificar: o
 * backend publicou o filtro justamente porque "a tela é Fornecedores".
 *
 * ## O que a resposta junta
 *
 * O `PartnerDto` mistura duas origens, e a diferença importa na hora de ler:
 *
 * | Campo | Vem de | Significa |
 * |---|---|---|
 * | `legalName`, `tradeName`, `document`, `email`, os três papéis | cadastro da ORGANIZAÇÃO | vale para o grupo inteiro |
 * | `code`, `paymentTerms`, `active` | vínculo com a EMPRESA | vale só para a empresa ativa |
 * | `registrationActive` | cadastro da organização | o cadastro global está ativo |
 *
 * Por isso `Ativo` na tela é `active` (o VÍNCULO): a pergunta do operador é "esta
 * empresa trabalha com este fornecedor?", não "este cadastro existe no grupo?".
 *
 * ## Leitura por id: a linha primeiro, o servidor como rede
 *
 * O contrato passou a ter `GET /api/partners/{id}` (backend `#35`) — antes só
 * havia `PUT` nesse caminho, e o detalhe era a LINHA da listagem, porque o
 * `PartnerWriteRequest` é subconjunto do `PartnerDto` e a linha já traz todo
 * campo gravável. Essa parte continua valendo: quem vem da listagem não gasta
 * requisição, a linha é semeada no cache e o formulário a usa.
 *
 * O que mudou é o caso que a linha não alcança — **link direto e recarga**.
 * Agora, sem linha em mãos, a tela busca por id em vez de mandar voltar à
 * listagem. Mesmo DTO nos dois caminhos: não existe DTO de detalhe.
 */

export const URL_PARCEIROS = '/api/partners'

/**
 * Papéis aceitos pelo filtro. Valor fora da lista é **400**, não filtro ignorado —
 * o backend recusa alto de propósito: filtro ignorado faria a tela de Fornecedores
 * mostrar clientes sem ninguém desconfiar de uma lista cheia.
 */
export type PapelDeParceiro = 'customer' | 'supplier' | 'professional'

/**
 * Whitelist de `sortBy` do backend. `paymentTerms`, `email` e `registrationActive`
 * ficam de fora — coluna chaveada por eles responderia 400 ao clicar no cabeçalho.
 */
export const ORDENAVEIS: readonly string[] = [
  'code',
  'legalName',
  'tradeName',
  'document',
  'active',
  // `parentId` entrou pela hierarquia pai/filho (#91). Ordenar por uuid não
  // serve para ninguém; ele está aqui porque a whitelist do contrato é UMA só
  // para `sortBy` e `filters`, e é como `filters` que a tela do pai pede os
  // filhos. Divergir as duas listas custaria um parâmetro novo no contrato para
  // uma consulta que o filtro já sabe fazer.
  'parentId',
]

/**
 * Whitelist de `field` do filtro estruturado — hoje a MESMA do `sortBy`, como o
 * contrato declara na descrição do parâmetro `filters`. Alias, não cópia: divergir
 * passa a ser edição deliberada, não duas listas iguais fora de sincronia.
 */
export const FILTRAVEIS: readonly string[] = ORDENAVEIS

/**
 * Listagem de parceiro SEM recorte de papel — é dela que sai a consulta de
 * filhos (#91). Fica ao lado de `parceirosDoPapel` para as duas lerem a mesma
 * `FILTRAVEIS`: divergir faria a consulta de filhos passar por uma whitelist
 * que o contrato não publica.
 */
export const LISTA_DE_PARCEIROS = createApiListProvider<PartnerDto>({
  url: URL_PARCEIROS,
  filtraveis: FILTRAVEIS,
})

/** Listagem de um papel. `fixa` carrega o `role` em toda consulta da tabela. */
export function parceirosDoPapel(role: PapelDeParceiro): ListProvider<PartnerDto> {
  return createApiListProvider<PartnerDto>({
    url: URL_PARCEIROS,
    fixa: { role },
    filtraveis: FILTRAVEIS,
  })
}

/**
 * Um parceiro por id; `null` quando não existe (404).
 *
 * Chegou com `GET /api/partners/{id}` (backend `#35`) e fecha o buraco mais
 * antigo desta fronteira: **link direto e recarga**. Enquanto só existia a linha
 * da listagem em cache, abrir por URL — ou recarregar a página com o formulário
 * aberto — não tinha de onde tirar o registro, e a tela mandava voltar à
 * listagem.
 *
 * Responde `PartnerDto`, o MESMO da listagem: não há DTO de detalhe, então o que
 * a linha traz e o que o id traz são a mesma coisa. Por isso a linha em cache
 * segue valendo como semente — o `get` é a rede para quando ela não existe.
 *
 * O 409 (sem empresa ativa na sessão) NÃO vira `null`: `itemOuNulo` converte só
 * 404. Dizer "não encontrado" a quem apenas não escolheu empresa mandaria o
 * operador procurar um registro que está lá.
 */
export async function obterParceiro(id: string): Promise<PartnerDto | null> {
  return itemOuNulo<PartnerDto>(await getPartner(id), `o parceiro ${id}`)
}

/**
 * Entrada do registry: listagem do servidor, detalhe por id e `empty` local.
 *
 * O `empty` continua local (`clienteVazio`, `fornecedorVazio`,
 * `profissionalVazio`) — "Incluir" não depende do servidor. O `get` passou a
 * existir com o `#35`; antes dele a entrada ficava SEM `get` de propósito,
 * porque `get` mock ao lado de listagem real casaria uuid do servidor com id
 * inventado e responderia "não encontrado" para registro que existe.
 */
export interface ParceiroProvider<T> extends ListProvider<PartnerDto> {
  get(id: string): Promise<PartnerDto | null>
  empty(id: number): T
}

export function parceiros<T>(role: PapelDeParceiro, empty: (id: number) => T): ParceiroProvider<T> {
  return { ...parceirosDoPapel(role), get: obterParceiro, empty }
}

/**
 * O que a tela EDITA de um parceiro.
 *
 * Recorte do `PartnerWriteRequest` que os formulários de Fornecedor, Cliente e
 * Profissional realmente têm campo para mostrar. O resto do corpo (`code`,
 * `paymentTerms` e os três papéis) viaja INALTERADO a partir da linha — ver
 * `corpoDeEscrita`.
 */
export interface CamposEditaveis {
  legalName: string
  tradeName: string | null
  document: string | null
  email: string | null
  active: boolean
  /**
   * Registro Profissional (CREA/CAU/CFT) e conta de comissão — só a tela de
   * Profissional Externo os edita, e por isso são OPCIONAIS aqui: as telas de
   * Cliente e Fornecedor não têm os campos, e obrigá-las a mandar `null` seria
   * a mesma armadilha que o comentário do `corpoDeEscrita` descreve.
   */
  registration?: string | null
  payoutBankInfo?: PartnerPayoutBankInfo | null
  /**
   * Parceiro-pai (#91). Opcional pela MESMA razão dos dois acima: nenhuma das
   * três telas tem campo para ele no formulário — o vínculo é editado por ação
   * própria, e o `PUT` precisa devolvê-lo como veio para não desvincular quem
   * gravou por outro caminho.
   */
  parentId?: string | null
  /**
   * Contato e endereço (#244). Opcionais pela mesma razão dos de cima, e por
   * uma a mais: as três telas desenham blocos DIFERENTES. Cliente tem Celular
   * no bloco obrigatório e o de Endereço inteiro; Profissional guarda os
   * telefones sob `telefones.*` e tem um SEGUNDO endereço (o da agência, que
   * não viaja); Fornecedor tem `fone1`/`fone2` e nenhum campo de celular.
   * Quem não edita o campo o devolve como veio — ver `corpoDeEscrita`.
   */
  mobilePhone?: string | null
  businessPhone?: string | null
  homePhone?: string | null
  fax?: string | null
  address?: PartnerAddress | null
  /**
   * Fase 1 do comparativo Softlux (#250), e o recorte por tela é o mais
   * desigual de todos: a Inscrição Estadual só o Fornecedor edita
   * (`inscEst`); a IE de Produtor Rural, a categoria, o especificador e a
   * observação só o Cliente tem; as redes sociais os três têm. Quem não edita
   * devolve como veio — a regra do `corpoDeEscrita` logo abaixo.
   *
   * **`specifierId` NÃO é `parentId`.** Um liga o cliente a quem o indicou; o
   * outro liga o profissional ao escritório de que ele faz parte. Coexistem no
   * mesmo cadastro, e trocá-los pagaria comissão de indicação a quem não
   * especificou nada.
   */
  stateRegistration?: string | null
  ruralProducerRegistration?: string | null
  categoryId?: string | null
  specifierId?: string | null
  notes?: string | null
  facebook?: string | null
  instagram?: string | null
  /**
   * Bloco 2 do comparativo (#255): os dois endereços que o cliente tem além do
   * principal, e o vínculo de trabalho que os acompanha.
   *
   * Nenhuma das três telas os edita HOJE — quem os liga é a #254. Entram aqui
   * porque o `PartnerWriteRequest` passou a tê-los e `PUT` é integral: sem
   * atravessar `corpoDeEscrita`, o primeiro Gravar de qualquer tela apagaria o
   * endereço de cobrança que o operador cadastrou por outro caminho.
   */
  billingAddress?: PartnerAddress | null
  businessAddress?: PartnerAddress | null
  businessName?: string | null
  businessRole?: string | null
  businessDocument?: string | null
  foundedOn?: string | null
  /**
   * Bloco 3 do comparativo (#270): o que sobrou da aba `Principal` do cliente —
   * tipo de pessoa, RG com órgão e UF, sexo e data de nascimento.
   *
   * Mesma situação do bloco 2: nenhuma tela os edita HOJE, e é justamente por
   * isso que precisam existir aqui. `PUT` é integral, então campo que não
   * atravessa `corpoDeEscrita` é campo apagado no primeiro Gravar de qualquer
   * uma das três telas.
   */
  /**
   * Fase A0 do módulo COMPRAS (G2): o que a ordem de compra precisa saber do
   * fornecedor — prazo de entrega, faturamento mínimo (geral e por grupo) e o
   * histórico de EMPRESA COMPRADORA com vigência.
   *
   * Mesma situação dos blocos 2 e 3, e por isso a mesma solução: nenhuma tela
   * os edita HOJE (a ficha do Fornecedor é a Fase C do trilho), e é justamente
   * por isso que precisam existir aqui. `PUT` é integral — campo que não
   * atravessa `corpoDeEscrita` é campo apagado no primeiro Gravar de qualquer
   * uma das três telas de parceiro, inclusive as de Cliente e Profissional, que
   * nem desenham o bloco.
   */
  deliveryDays?: number | null
  minimumBillingCents?: number | null
  buyingCompanies?: PartnerWriteRequest['buyingCompanies']
  groupMinimums?: PartnerWriteRequest['groupMinimums']
  personType?: PartnerWriteRequest['personType']
  identityDocument?: string | null
  identityIssuer?: string | null
  identityIssuerState?: string | null
  gender?: string | null
  birthDate?: string | null
}

/**
 * Campo de texto vazio volta como `null`, não como `''`.
 *
 * Medido no par local (2026-08-18): o parceiro do Postgres chega com `email` e
 * `paymentTerms` em `null`, o formulário os carrega como string vazia — input
 * controlado precisa de string — e os devolvia assim. Como o `PUT` é INTEGRAL,
 * abrir o cadastro e clicar em `Gravar` **sem editar nada** trocava "não
 * informado" por "texto vazio" no servidor.
 *
 * Vale nos dois sentidos: quem APAGA um e-mail que existia também quer `null`
 * ali, não `''`. `legalName` fica fora — é obrigatório no formulário, e vazio
 * ali é erro de validação, não ausência a preservar.
 */
function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

/**
 * Linha original + campos editados → corpo do `PUT`.
 *
 * **O que a tela não mostra é devolvido como veio.** `PUT` substitui o registro
 * inteiro: mandar `code`, `paymentTerms` ou os papéis como `null` porque o
 * formulário não tem campo para eles apagaria dado que ninguém pediu para apagar
 * — e o operador só descobriria na próxima listagem.
 *
 * Os três papéis vêm da linha pelo mesmo motivo: quem é cliente E fornecedor não
 * pode deixar de ser fornecedor por ter sido gravado na tela de Clientes.
 */
export function corpoDeEscrita(
  original: PartnerDto,
  editado: CamposEditaveis,
): PartnerWriteRequest {
  // AUSENTE não é NULO. `registration`, `payoutBankInfo` e `parentId` não estão
  // no `required` do `PartnerDto` — o contrato PERMITE que a listagem os omita,
  // e o tipo gerado já os declara `| undefined`. Com `PUT` integral, um
  // `?? null` aqui trataria "o servidor não mandou" como "apague": é a classe de
  // defeito que apagou a ficha técnica do produto (core @regras: campo que a
  // listagem não devolve nunca vira corpo de PUT).
  //
  // Hoje o `cabinet-erp-api` manda os três na listagem — medido em 2026-08-18,
  // registro rico com conselho, conta bancária e vínculo pai. Isto é a guarda
  // para o dia em que parar de mandar, e ela RECUSA em vez de gravar: um
  // `Gravar` que falha em voz alta é melhor que um que grava apagando.
  for (const campo of [
    'registration',
    'payoutBankInfo',
    'parentId',
    // Os cinco de #244 entram na MESMA guarda, e o endereço é o que mais pede
    // por ela: o objeto vai inteiro, então um `?? null` aqui apagaria as sete
    // linhas de uma vez, num Gravar de tela que nem desenha o bloco.
    'mobilePhone',
    'businessPhone',
    'homePhone',
    'fax',
    'address',
    // E os sete do #250, pela MESMA razão: são campos que só uma das três telas
    // edita, e um `?? null` aqui faria o Gravar do Fornecedor apagar a
    // observação e o especificador que a tela de Clientes gravou no mesmo
    // cadastro. A janela em que a listagem HTTP ainda não os manda é a mesma já
    // declarada em `docs/integracao.md`, e fecha com a migração do backend.
    'stateRegistration',
    'ruralProducerRegistration',
    'categoryId',
    'specifierId',
    'notes',
    'facebook',
    'instagram',
    // Bloco 2 (#255). Os dois endereços são o caso que mais pede a guarda: o
    // objeto vai INTEIRO, então um `?? null` aqui apagaria as sete linhas do
    // endereço de cobrança num Gravar de tela que nem desenha o bloco.
    'billingAddress',
    'businessAddress',
    'businessName',
    'businessRole',
    'businessDocument',
    'foundedOn',
    // Bloco 3 (#270), pela MESMA razão dos anteriores: o servidor pode ainda não
    // mandá-los na listagem, e nesse dia a guarda RECUSA em vez de gravar
    // apagando o RG que o operador cadastrou por outro caminho.
    // Fase A0 de COMPRAS (G2), pela MESMA razão de todos os anteriores: o
    // servidor pode ainda não mandá-los na listagem, e nesse dia a guarda
    // RECUSA em vez de gravar apagando o faturamento mínimo que o comprador
    // negociou. As duas COLEÇÕES são o caso que mais pede a guarda — elas vão
    // inteiras, então um `?? null` aqui apagaria o histórico de empresa
    // compradora de uma vez só.
    'deliveryDays',
    'minimumBillingCents',
    'buyingCompanies',
    'groupMinimums',
    'personType',
    'identityDocument',
    'identityIssuer',
    'identityIssuerState',
    'gender',
    'birthDate',
  ] as const) {
    if (editado[campo] === undefined && !(campo in original)) {
      throw new Error(
        `O registro veio do servidor sem \`${campo}\`, e o PUT substitui o cadastro inteiro: gravar assim apagaria o campo. Nada foi enviado.`,
      )
    }
  }

  return {
    legalName: editado.legalName,
    tradeName: textoOuNulo(editado.tradeName),
    document: textoOuNulo(editado.document),
    email: textoOuNulo(editado.email),
    active: editado.active,
    code: textoOuNulo(original.code),
    paymentTerms: textoOuNulo(original.paymentTerms),
    isCustomer: original.isCustomer,
    isSupplier: original.isSupplier,
    isProfessional: original.isProfessional,
    // Editados quando a tela os tem; DEVOLVIDOS COMO VIERAM quando não tem.
    // `undefined` aqui apagaria o conselho e a conta bancária do profissional
    // ao gravar por qualquer outra tela — a mesma regra do `code` acima, e o
    // caminho por onde ela mais dói: desativar um cadastro passa por aqui.
    registration:
      editado.registration !== undefined ? editado.registration : (original.registration ?? null),
    payoutBankInfo:
      editado.payoutBankInfo !== undefined
        ? editado.payoutBankInfo
        : (original.payoutBankInfo ?? null),
    // Mesma regra, e aqui ela é a diferença entre gravar um cadastro e desfazer
    // uma hierarquia: o formulário não tem campo de vínculo, então omitir aqui
    // faria todo Gravar de Cliente desligar o profissional do escritório dele.
    parentId: editado.parentId !== undefined ? editado.parentId : (original.parentId ?? null),
    // Contato e endereço (#244), na mesma regra. O caso que a issue mediu é
    // este, do outro lado: o Celular que o operador digitou não chegava ao
    // servidor porque o corpo é montado a partir do contrato, e o contrato não
    // tinha o campo. Agora tem — e quem não o edita o devolve como veio, em vez
    // de apagá-lo.
    mobilePhone:
      editado.mobilePhone !== undefined ? editado.mobilePhone : (original.mobilePhone ?? null),
    businessPhone:
      editado.businessPhone !== undefined
        ? editado.businessPhone
        : (original.businessPhone ?? null),
    homePhone: editado.homePhone !== undefined ? editado.homePhone : (original.homePhone ?? null),
    fax: editado.fax !== undefined ? editado.fax : (original.fax ?? null),
    address: editado.address !== undefined ? editado.address : (original.address ?? null),
    // Fase 1 (#250). Os de texto passam por `textoOuNulo` quando a tela os
    // edita — input controlado devolve `''`, e `''` gravado troca "não
    // informado" por "vazio" a cada Gravar. Os dois de VÍNCULO (`categoryId` e
    // `specifierId`) não passam: id é escolha, não texto digitado, e `null` ali
    // já é "nenhum".
    stateRegistration:
      editado.stateRegistration !== undefined
        ? textoOuNulo(editado.stateRegistration)
        : (original.stateRegistration ?? null),
    ruralProducerRegistration:
      editado.ruralProducerRegistration !== undefined
        ? textoOuNulo(editado.ruralProducerRegistration)
        : (original.ruralProducerRegistration ?? null),
    categoryId:
      editado.categoryId !== undefined ? editado.categoryId : (original.categoryId ?? null),
    specifierId:
      editado.specifierId !== undefined ? editado.specifierId : (original.specifierId ?? null),
    notes: editado.notes !== undefined ? textoOuNulo(editado.notes) : (original.notes ?? null),
    facebook:
      editado.facebook !== undefined ? textoOuNulo(editado.facebook) : (original.facebook ?? null),
    instagram:
      editado.instagram !== undefined
        ? textoOuNulo(editado.instagram)
        : (original.instagram ?? null),
    // Bloco 2 (#255). Hoje TODOS caem no ramo "devolve como veio" — nenhuma
    // tela os edita ainda (#254 é quem os liga), e é exatamente por isso que
    // eles precisam passar por aqui: o que não atravessa o corpo é apagado.
    billingAddress:
      editado.billingAddress !== undefined
        ? editado.billingAddress
        : (original.billingAddress ?? null),
    businessAddress:
      editado.businessAddress !== undefined
        ? editado.businessAddress
        : (original.businessAddress ?? null),
    businessName:
      editado.businessName !== undefined
        ? textoOuNulo(editado.businessName)
        : (original.businessName ?? null),
    businessRole:
      editado.businessRole !== undefined
        ? textoOuNulo(editado.businessRole)
        : (original.businessRole ?? null),
    businessDocument:
      editado.businessDocument !== undefined
        ? textoOuNulo(editado.businessDocument)
        : (original.businessDocument ?? null),
    foundedOn: editado.foundedOn !== undefined ? editado.foundedOn : (original.foundedOn ?? null),
    // Bloco 3 (#270). Como os do bloco 2, todos caem hoje no ramo "devolve como
    // veio" — nenhuma tela os edita, e o que não atravessa o corpo é apagado.
    // Fase A0 de COMPRAS (G2). Hoje TODOS caem no ramo "devolve como veio" —
    // nenhuma tela os edita ainda. Os dois numéricos NÃO passam por
    // `textoOuNulo`: eles não são texto, e `0` é valor legítimo e distinto de
    // `null` nos dois (mínimo declarado e atendido por qualquer ordem × não
    // impõe mínimo; entrega no mesmo dia × sem prazo acordado). As duas
    // coleções vão como vieram, inteiras: `[]` apagaria o histórico, e o PUT
    // não distingue "não mexi" de "esvaziei" sem que alguém decida aqui.
    deliveryDays:
      editado.deliveryDays !== undefined ? editado.deliveryDays : (original.deliveryDays ?? null),
    minimumBillingCents:
      editado.minimumBillingCents !== undefined
        ? editado.minimumBillingCents
        : (original.minimumBillingCents ?? null),
    buyingCompanies:
      editado.buyingCompanies !== undefined
        ? editado.buyingCompanies
        : (original.buyingCompanies ?? []),
    groupMinimums:
      editado.groupMinimums !== undefined ? editado.groupMinimums : (original.groupMinimums ?? []),
    personType:
      editado.personType !== undefined ? editado.personType : (original.personType ?? null),
    identityDocument:
      editado.identityDocument !== undefined
        ? textoOuNulo(editado.identityDocument)
        : (original.identityDocument ?? null),
    identityIssuer:
      editado.identityIssuer !== undefined
        ? textoOuNulo(editado.identityIssuer)
        : (original.identityIssuer ?? null),
    identityIssuerState:
      editado.identityIssuerState !== undefined
        ? textoOuNulo(editado.identityIssuerState)
        : (original.identityIssuerState ?? null),
    gender: editado.gender !== undefined ? textoOuNulo(editado.gender) : (original.gender ?? null),
    birthDate: editado.birthDate !== undefined ? editado.birthDate : (original.birthDate ?? null),
  }
}

/**
 * Grava a alteração e devolve o registro COMO O SERVIDOR o deixou — o contrato
 * responde `200` com o `PartnerDto`, não `204`. Aceitar corpo vazio aqui seria
 * aceitar uma resposta que o contrato não descreve.
 *
 * `403` é o RLS recusando escopo (a empresa da sessão não é a do registro), e o
 * `detail` do problem+json é o que explica isso ao operador.
 */
export async function atualizarParceiro(
  id: string,
  corpo: PartnerWriteRequest,
): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await updatePartner(id, corpo)
  return dadosOuErro<PartnerDto>(resposta, `Falha ao gravar o parceiro ${id}.`)
}

/**
 * Corpo da DESATIVAÇÃO — a linha inteira de volta, com `active: false`.
 *
 * O `Excluir` da barra de ações nunca apaga (padrão 8): desativa o VÍNCULO com a
 * empresa ativa. Passar pela `corpoDeEscrita` com os próprios valores da linha é
 * o que garante que só `active` muda — o `PUT` substitui o registro inteiro, e
 * montar o corpo à mão aqui seria a segunda chance de esquecer `code`,
 * `paymentTerms` ou um dos papéis e apagá-los sem que ninguém tenha pedido.
 */
export function corpoDeDesativacao(linha: PartnerDto): PartnerWriteRequest {
  return corpoDeEscrita(linha, {
    legalName: linha.legalName,
    tradeName: linha.tradeName,
    document: linha.document,
    email: linha.email,
    active: false,
  })
}

/**
 * `Excluir` da listagem: desativa o vínculo e recarrega a lista.
 *
 * Mora aqui, e não em cada rota, porque as três telas de parceiro fazem a MESMA
 * escrita mudando só a query key da listagem — a triplicação já custou caro no
 * `Alterar`. Em sucesso invalida a listagem: a linha continua na tela (é
 * desativação, não sumiço), mas com `Ativo: Não`, que é a prova visível de que
 * a escrita valeu.
 */
/**
 * Linha + novo pai → corpo do `PUT` (#91). Mesma economia do
 * `corpoDeDesativacao`: o vínculo é UMA propriedade, e todo o resto do registro
 * viaja de volta como veio. Escrever o corpo à mão na tela seria a terceira
 * cópia da regra "o que a tela não mostra é devolvido como veio".
 *
 * `null` DESVINCULA — é a mesma chamada, e é de propósito: vincular e
 * desvincular são o mesmo ato com valores diferentes, não dois caminhos.
 */
export function corpoDeVinculoPai(linha: PartnerDto, paiId: string | null): PartnerWriteRequest {
  return corpoDeEscrita(linha, {
    legalName: linha.legalName,
    tradeName: linha.tradeName,
    document: linha.document,
    email: linha.email,
    active: linha.active,
    parentId: paiId,
  })
}

/**
 * Vincular/desvincular do pai. Invalida o REGISTRO (`['parceiro', id]`) e a
 * lista de filhos dos dois lados: quem sai de um pai entra em outro, e a tela
 * do pai antigo continuaria mostrando um filho que já não é dele.
 */
export function useVincularPai(idParam: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ linha, paiId }: { linha: PartnerDto; paiId: string | null }) =>
      atualizarParceiro(linha.id, corpoDeVinculoPai(linha, paiId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parceiro', idParam] })
      await queryClient.invalidateQueries({ queryKey: ['parceiro-filhos'] })
    },
  })
}

export function useDesativarParceiro(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linha: PartnerDto) => atualizarParceiro(linha.id, corpoDeDesativacao(linha)),
    onSuccess: (_dado, linha) => {
      // O aviso sai daqui, e não da tela, porque quem SABE que a escrita
      // terminou é a mutation: a listagem apenas fecha o diálogo e reconsulta,
      // e uma linha que muda de `Sim` para `Não` no meio de vinte é mudança
      // que passa despercebida. Ver `lib/avisos.ts` (#201).
      avisar(`${linha.legalName} foi desativado.`, 'O cadastro continua no sistema, inativo.')
      return queryClient.invalidateQueries({ queryKey })
    },
  })
}

/**
 * Corpo do `POST` — o cadastro nasce com O PAPEL DA TELA e nenhum outro.
 *
 * O schema exige pelo menos um papel (`partners_papel_check`), e quem sabe qual
 * é a tela: incluir pela tela de Fornecedores cria fornecedor. Marcar os três
 * "por precaução" faria todo cadastro novo aparecer nas três listagens.
 *
 * `code` e `paymentTerms` nascem nulos: são do VÍNCULO com a empresa e nenhum dos
 * formulários tem campo para eles. O contrato aceita nulo — inventar um código
 * aqui competiria com o que o operador espera digitar depois.
 */
export function corpoDeInclusao(
  papel: PapelDeParceiro,
  editado: CamposEditaveis,
): PartnerWriteRequest {
  return {
    legalName: editado.legalName,
    tradeName: editado.tradeName,
    document: editado.document,
    email: editado.email,
    active: editado.active,
    code: null,
    paymentTerms: null,
    isCustomer: papel === 'customer',
    isSupplier: papel === 'supplier',
    isProfessional: papel === 'professional',
    // Na INCLUSÃO não há registro anterior a preservar: o que a tela não edita
    // nasce nulo, igual a `code` e `paymentTerms` logo acima.
    registration: editado.registration ?? null,
    payoutBankInfo: editado.payoutBankInfo ?? null,
    parentId: editado.parentId ?? null,
    mobilePhone: editado.mobilePhone ?? null,
    businessPhone: editado.businessPhone ?? null,
    homePhone: editado.homePhone ?? null,
    fax: editado.fax ?? null,
    address: editado.address ?? null,
    // Na INCLUSÃO não há registro anterior a preservar: o que a tela não edita
    // nasce nulo. Vale para os sete do #250 como já valia para o conselho.
    stateRegistration: textoOuNulo(editado.stateRegistration),
    ruralProducerRegistration: textoOuNulo(editado.ruralProducerRegistration),
    categoryId: editado.categoryId ?? null,
    specifierId: editado.specifierId ?? null,
    notes: textoOuNulo(editado.notes),
    facebook: textoOuNulo(editado.facebook),
    instagram: textoOuNulo(editado.instagram),
    billingAddress: editado.billingAddress ?? null,
    businessAddress: editado.businessAddress ?? null,
    businessName: textoOuNulo(editado.businessName),
    businessRole: textoOuNulo(editado.businessRole),
    businessDocument: textoOuNulo(editado.businessDocument),
    foundedOn: editado.foundedOn ?? null,
    // Fase A0 de COMPRAS (G2): idem — na inclusão não há o que preservar. As
    // duas coleções nascem VAZIAS e não nulas: o contrato as declara array, e
    // fornecedor novo sem histórico de empresa compradora tem lista vazia.
    deliveryDays: editado.deliveryDays ?? null,
    minimumBillingCents: editado.minimumBillingCents ?? null,
    buyingCompanies: editado.buyingCompanies ?? [],
    groupMinimums: editado.groupMinimums ?? [],
    // Bloco 3 (#270): na inclusão não há registro anterior a preservar.
    personType: editado.personType ?? null,
    identityDocument: textoOuNulo(editado.identityDocument),
    identityIssuer: textoOuNulo(editado.identityIssuer),
    identityIssuerState: textoOuNulo(editado.identityIssuerState),
    gender: textoOuNulo(editado.gender),
    birthDate: editado.birthDate ?? null,
  }
}

/**
 * Cria o parceiro e devolve o registro como o servidor o gravou (`201` com o
 * `PartnerDto`). `409` é o documento já cadastrado — índice único em
 * `partners.document` —, e o `detail` é o que diz isso ao operador.
 */
export async function incluirParceiro(corpo: PartnerWriteRequest): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await createPartner(corpo)
  return dadosOuErro<PartnerDto>(resposta, 'Falha ao incluir o parceiro.')
}

/**
 * OS FILHOS DE UM PARCEIRO — o outro lado de `parentId` (#91).
 *
 * Sai do `filters` que a listagem já usa, e não de um caminho novo: o parâmetro
 * existe, a whitelist do contrato passou a publicar `parentId`, e um
 * `GET /api/partners/{id}/children` seria uma segunda forma de perguntar a mesma
 * coisa — com paginação, ordenação e filtro próprios para manter.
 *
 * **Sem `role`**: os filhos de um escritório são profissionais, mas o vínculo é
 * do CADASTRO, não do papel. Filtrar por papel aqui esconderia um filho que
 * também é cliente, e a tela mostraria "nenhum vinculado" para quem tem.
 */
export async function filhosDoParceiro(paiId: string): Promise<PartnerDto[]> {
  // Pelo PROVIDER, não pelo cliente gerado direto, e o motivo é mecânico: o
  // `getListPartnersUrl` do codegen serializa todo parâmetro com `String(value)`
  // — um array de objetos viraria `[object Object]` na query. Quem sabe montar
  // `filters` é o `createApiListProvider`, que faz `JSON.stringify` e ainda
  // barra campo fora da whitelist ANTES de sair. Duplicar a codificação aqui
  // seria manter dois serializadores do mesmo parâmetro.
  const { rows } = await LISTA_DE_PARCEIROS.list({
    q: '',
    sort: null,
    page: 1,
    // O TETO do contrato, não um número escolhido: `queryDaTabela` recusa
    // acima de `PAGE_SIZE_MAX` em vez de mandar uma consulta que o servidor
    // devolveria 400. Escritório com mais de 100 profissionais vinculados não
    // existe no negócio da Vertz; se existir, o bloco mostra a primeira página.
    pageSize: PAGE_SIZE_MAX,
    filtros: [
      {
        filtroId: 'pai',
        id: 'parentId',
        variante: 'text',
        operador: 'eq',
        valor: paiId,
      },
    ],
  })
  return rows
}

/**
 * Se `candidato` pode virar PAI de `parceiro`, com o que a tela tem em mãos.
 *
 * **Duas recusas, e as duas são visíveis antes de gravar**: apontar para si
 * mesmo, e apontar para um dos próprios filhos (o A→B→A que a issue nomeia).
 *
 * **O que esta função NÃO faz, e é importante que não pareça fazer:** ciclo de
 * três ou mais níveis (A→B→C→A) ela não vê, porque a tela conhece um nível para
 * baixo e nenhum para cima. Quem fecha isso é o servidor, e o contrato manda
 * 400. Uma varredura recursiva daqui seria N consultas para chegar a uma
 * resposta que o servidor dá em uma, e ainda ficaria desatualizada entre a
 * checagem e o Gravar.
 */
export function motivoDeRecusaDoVinculo(
  parceiroId: string,
  candidatoId: string,
  filhos: readonly PartnerDto[],
): string | null {
  if (candidatoId === parceiroId) {
    return 'Um cadastro não pode ser vinculado a si mesmo.'
  }
  if (filhos.some((filho) => filho.id === candidatoId)) {
    return 'Este cadastro já é um dos vinculados — o vínculo ficaria em laço.'
  }
  return null
}

/**
 * O id que o 409 de documento repetido carrega — `null` quando o erro é outro.
 *
 * O cadastro é da ORGANIZAÇÃO: o documento já existe no grupo, mas o parceiro não
 * aparece na listagem de quem ainda não o atende. Sem este id a tela ficaria com
 * uma frase descrevendo a saída sem poder tomá-la.
 */
export function idDoParceiroExistente(erro: unknown): string | null {
  if (!(erro instanceof ErroDaApi) || erro.status !== 409) return null
  const corpo = erro.corpo
  if (!corpo || typeof corpo !== 'object') return null
  const id = (corpo as { existingPartnerId?: unknown }).existingPartnerId
  return typeof id === 'string' && id ? id : null
}

/**
 * Liga a empresa ativa a um cadastro que já existe no grupo — o outro lado do
 * 409 acima.
 *
 * **Vincular NÃO edita**, e o corpo prova: só `code`, `paymentTerms` e `active`,
 * que são do VÍNCULO. Aceitar os campos do cadastro faria "vincular" virar
 * caminho para sobrescrever em silêncio a razão social que a empresa vizinha
 * cadastrou. Ajustar o cadastro depois é o `Alterar`, que é explícito.
 */
export async function vincularParceiro(id: string, ativo: boolean): Promise<PartnerDto> {
  const resposta: RespostaDaApi = await linkPartner(id, {
    code: null,
    paymentTerms: null,
    active: ativo,
  })
  return dadosOuErro<PartnerDto>(resposta, `Falha ao vincular o parceiro ${id}.`)
}

/**
 * AS OPÇÕES DO ESPECIFICADOR — do CADASTRO, não da lista de apoio (#265).
 *
 * `specifierId` é um `partners.id`. A #250 escrevera "item da lista
 * `PROFISSIONAL`" olhando o mock, e a #265 corrigiu o contrato para o que o
 * backend sempre fez: `specifier_id uuid REFERENCES partners (id)`. Enquanto o
 * combo lia `GET /api/catalog-lookups?kind=PROFISSIONAL`, o id que ele escolhia
 * existia em `catalog_lookups` e não em `partners` — e o `PUT` levava um uuid
 * que `conferirApoios` recusa com 400 `O especificador não existe.`. Contra o
 * mock isso passava verde: os dois lados são uuid, e mock nenhum confere FK.
 *
 * **Por que uma consulta própria e não a listagem da tela.** A listagem de
 * Profissionais carrega página, ordenação e filtros do operador; o combo quer
 * sempre o mesmo recorte — os profissionais, por nome. Reusar aquela traria o
 * estado da grade para dentro do campo.
 *
 * **Divergência declarada:** `role=professional` é filtro da listagem, que é
 * recortada pela EMPRESA ativa; o backend aceita como especificador qualquer
 * parceiro do GRUPO (`cadastroDoGrupo`, e de propósito — o profissional que
 * atende o grupo inteiro e só está vinculado à loja da esquina não pode sumir
 * da escrita). Então o combo oferece MENOS do que o servidor aceita, nunca
 * mais. O caminho que falta é busca, não combo: quando a lista passar de 100 o
 * componente muda, e `truncada` é quem avisa que esse dia chegou.
 */
export function useEspecificadorOptions(excluir?: string | undefined): {
  options: { id: string; nome: string }[]
  truncada: boolean
  carregando: boolean
  erro: boolean
} {
  const query = useQuery({
    queryKey: ['partners', 'especificadores'],
    queryFn: async () => {
      const resposta: RespostaDaApi = await listPartners({
        role: 'professional',
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'legalName',
      })
      return dadosOuErro<PagedResultOfPartnerDto>(resposta, 'Falha ao carregar os profissionais.')
    },
  })

  const linhas = query.data?.rows ?? []
  // O PRÓPRIO REGISTRO fora da lista: `conferirApoios` responde 400
  // (`Um parceiro não pode ser o próprio especificador.`) e a `0023` tem o
  // `CHECK` embaixo. Oferecer a opção seria desenhar o caminho para um erro
  // que a tela já sabe evitar — e o cliente-profissional do seed (um cadastro,
  // dois papéis) é exatamente quem cairia nele.
  const oferecidos = excluir ? linhas.filter((p) => p.id !== excluir) : linhas

  return {
    options: oferecidos.map((p) => ({ id: p.id, nome: p.legalName })),
    truncada: (query.data?.total ?? 0) > linhas.length,
    carregando: query.isPending,
    erro: query.isError,
  }
}
