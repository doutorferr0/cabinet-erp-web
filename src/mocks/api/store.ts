import type {
  AgendaEventDto,
  CatalogLookupDto,
  PartnerAddress,
  PartnerDto,
  PartnerPayoutBankInfo,
  ProductDetailDto,
  ProjectDto,
  ProjectPlanDto,
  StockMovementDto,
  TaskDto,
  TodoDto,
  VinculoDeEmpresa,
} from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { VOCABULARIO_DE_APOIO, idDeApoio } from '@/mocks/lookups'

/**
 * Estado em memória do modo mock (`VITE_API_MODE=mock`).
 *
 * Os handlers gerados pelo Orval (index.msw.ts) devolvem faker aleatório e SEM
 * estado — bom para shape, inútil para fluxo: "gravei → aparece na lista" é o
 * que uma tela de ERP precisa provar. Este store é a camada fina por cima:
 * os SHAPES continuam vindo do contrato (os tipos importados acima são os
 * gerados — divergência de shape aqui é erro de compilação), o ESTADO vem daqui.
 *
 * ## O que o mock reproduz de multi-tenancy
 *
 * Duas empresas no seed, e o VÍNCULO de parceiro é por empresa — o mesmo
 * cadastro responde `code`/`paymentTerms`/`active` diferentes conforme a
 * empresa ativa, que é a semântica central do `PartnerDto`. Produtos/estoque
 * são servidos iguais para as duas empresas — recorte de estoque por empresa é
 * refino futuro; o limite está registrado na memória do projeto.
 */

interface VinculoDeParceiro {
  code: string | null
  paymentTerms: string | null
  active: boolean
}

export interface ParceiroDaOrg {
  id: string
  legalName: string
  tradeName: string | null
  document: string | null
  email: string | null
  isCustomer: boolean
  isSupplier: boolean
  isProfessional: boolean
  registrationActive: boolean
  /**
   * O conselho, a conta de comissão e o vínculo pai — os três opcionais que o
   * contrato publica desde 2026-08-13 e o mock não guardava.
   *
   * A falta não era inofensiva: `corpoDeEscrita` RECUSA gravar quando o
   * registro chega sem um campo que o `PUT` substitui, então alterar um
   * parceiro no modo mock — o modo do site público — lançava
   * `O registro veio do servidor sem \`registration\`` em vez de gravar. É a
   * mesma regra que o #244 já aplicou aos cinco campos de contato, faltando
   * aos três mais antigos.
   */
  registration: string | null
  payoutBankInfo: PartnerPayoutBankInfo | null
  parentId: string | null
  /**
   * Contato e endereço são do CADASTRO da organização, não do vínculo — o
   * mesmo lugar onde moram nome e documento. O celular de quem atende as duas
   * empresas do grupo é um só; o que muda por empresa é código, prazo e o
   * `active`, que continuam em `VinculoDeParceiro`.
   */
  mobilePhone: string | null
  businessPhone: string | null
  homePhone: string | null
  fax: string | null
  /** `null` = nenhum campo preenchido. Endereço PARCIAL é caso normal. */
  address: PartnerAddress | null
  /**
   * Fase 1 do comparativo Softlux (#250). Todos no CADASTRO da organização: a
   * IE é da empresa, a categoria e o especificador são do relacionamento
   * comercial do grupo, e a observação é a mesma para quem atende as duas
   * empresas. O que muda por empresa continua sendo código, prazo e `active`.
   *
   * `specifierId` e `parentId` convivem aqui de propósito — são dois vínculos
   * diferentes, e o mock precisa poder ter os dois preenchidos ao mesmo tempo
   * para que a tela prove que não os confunde.
   */
  stateRegistration: string | null
  ruralProducerRegistration: string | null
  categoryId: string | null
  specifierId: string | null
  notes: string | null
  facebook: string | null
  instagram: string | null
  /** Vínculo por empresa (tenantId → dados do vínculo). Sem entrada = não vinculado. */
  vinculos: Record<string, VinculoDeParceiro>
}

export interface StoreDaApi {
  logado: boolean
  /**
   * Gatilho de ensaio: a PRÓXIMA escrita responde 401 e desarma sozinha.
   *
   * É o que torna a expiração de sessão provocável no navegador (#124, ponto
   * 4). Sem ele, o pior caso do trilho — o cookie vencer entre abrir o
   * formulário e clicar em Gravar — só existia dentro do teste, e ninguém
   * conseguia ver a tela se comportar.
   *
   * Vale para UMA escrita, não para a sessão inteira: o alvo é o envio, e
   * derrubar a sessão de leitura junto faria a guarda desmontar a tela antes
   * de o formulário ter chance de reagir — apagando justamente o que o ensaio
   * quer observar.
   */
  expiraProximaEscrita: boolean
  mustChangePassword: boolean
  activeTenantId: string | null
  empresas: VinculoDeEmpresa[]
  lookups: CatalogLookupDto[]
  produtos: ProductDetailDto[]
  parceiros: ParceiroDaOrg[]
  movimentos: StockMovementDto[]
  tarefas: TaskDto[]
  todos: TodoDto[]
  agenda: AgendaEventDto[]
  projetos: ProjectDto[]
  /** Plano por projeto (`projectId` → plano). Sem entrada = projeto sem plano. */
  planos: Record<string, ProjectPlanDto>
  proximoId: number
}

export const TENANT_MATRIZ = 'tenant-matriz'
export const TENANT_FILIAL = 'tenant-filial'

function lookupsDoSeed(): CatalogLookupDto[] {
  return Object.entries(VOCABULARIO_DE_APOIO).flatMap(([kind, nomes]) =>
    nomes.map((name, i) => ({ id: `lk-${kind}-${i + 1}`, kind, name, active: true })),
  )
}

function produtosDoSeed(): ProductDetailDto[] {
  return [
    {
      id: 'prod-0001',
      code: 'PD-1001',
      description: 'PENDENTE VIDRO FUMÊ 30CM',
      active: true,
      variants: [
        {
          id: 'var-0001',
          finish: 'PRETO FOSCO',
          size: '30CM',
          active: true,
          priceCents: 189900,
          stockQty: 12,
          minStock: 2,
        },
        {
          id: 'var-0002',
          finish: 'DOURADO',
          size: '30CM',
          active: true,
          priceCents: 219900,
          stockQty: 4,
          minStock: 2,
        },
      ],
    },
    {
      id: 'prod-0002',
      code: 'AR-2001',
      description: 'ARANDELA ALUMÍNIO IP65',
      active: true,
      variants: [
        {
          id: 'var-0003',
          finish: 'BRANCO',
          size: 'ÚNICO',
          active: true,
          priceCents: 45900,
          stockQty: 30,
          minStock: 5,
        },
      ],
    },
    {
      id: 'prod-0003',
      code: 'FT-3001',
      description: 'FITA LED 2700K 5M',
      active: false,
      variants: [],
    },
  ]
}

function parceirosDoSeed(): ParceiroDaOrg[] {
  return [
    {
      id: 'parc-0001',
      legalName: 'EVOLED ILUMINACAO LTDA',
      tradeName: 'EVOLED',
      document: '11222333000144',
      email: 'comercial@evoled.dev',
      isCustomer: false,
      isSupplier: true,
      isProfessional: false,
      registrationActive: true,
      // Fornecedor não tem conselho nem conta de comissão: os três nascem nulos
      // e o `null` é o dado, não a ausência dele.
      registration: null,
      payoutBankInfo: null,
      parentId: null,
      // IE de empresa: o fornecedor tem, e é o único dos três que a edita.
      stateRegistration: '110042490114',
      ruralProducerRegistration: null,
      categoryId: null,
      specifierId: null,
      notes: null,
      facebook: null,
      instagram: '@evoled.oficial',
      mobilePhone: '11987650001',
      businessPhone: '1133330001',
      homePhone: null,
      fax: '1133330009',
      address: {
        zipCode: '01310930',
        street: 'AVENIDA PAULISTA',
        number: '1578',
        complement: 'CONJ 42',
        district: 'BELA VISTA',
        city: 'SAO PAULO',
        state: 'SP',
      },
      vinculos: {
        [TENANT_MATRIZ]: { code: 'F-001', paymentTerms: '28/35/42', active: true },
        [TENANT_FILIAL]: { code: 'FOR-9', paymentTerms: 'À VISTA', active: true },
      },
    },
    {
      id: 'parc-0002',
      legalName: 'MARIA HELENA ARQUITETURA ME',
      tradeName: 'MH ARQUITETURA',
      document: '55666777000188',
      email: 'contato@mharq.dev',
      isCustomer: true,
      isSupplier: false,
      isProfessional: true,
      registrationActive: true,
      // A ÚNICA profissional do seed, e por isso a única com conselho e conta —
      // é nela que o `Alterar` da tela §3 se exercita no navegador.
      registration: 'CAU A123456-7',
      // A cliente-profissional do seed: categoria E especificador preenchidos,
      // que é o par que prova que `specifierId` não é `parentId` — ela não
      // pende de escritório nenhum (`parentId: null`) e mesmo assim tem quem a
      // indicou.
      stateRegistration: null,
      ruralProducerRegistration: null,
      categoryId: idDeApoio('CATEGORIA_CLIENTE', 'ARQUITETO'),
      specifierId: idDeApoio('PROFISSIONAL', 'ANA RIBEIRO'),
      notes: 'Atende obras de alto padrão; prefere contato por WhatsApp.',
      facebook: null,
      instagram: '@mh.arquitetura',
      payoutBankInfo: {
        bankNumber: '341',
        bankName: 'ITAÚ UNIBANCO',
        branchNumber: '0710',
        accountNumber: '55012-9',
      },
      parentId: null,
      mobilePhone: '19998880002',
      businessPhone: null,
      homePhone: null,
      fax: null,
      // Endereço PARCIAL — cidade e UF e nada mais. É o que vem do legado na
      // maioria das fichas, e a tela precisa saber desenhar isto sem inventar
      // CEP para completar.
      address: {
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        district: null,
        city: 'CAMPINAS',
        state: 'SP',
      },
      vinculos: {
        [TENANT_MATRIZ]: { code: 'C-010', paymentTerms: null, active: true },
      },
    },
    {
      id: 'parc-0003',
      legalName: 'CONSTRUTORA HORIZONTE SA',
      tradeName: null,
      document: '99888777000166',
      email: null,
      isCustomer: true,
      isSupplier: false,
      isProfessional: false,
      registrationActive: true,
      registration: null,
      payoutBankInfo: null,
      parentId: null,
      stateRegistration: null,
      ruralProducerRegistration: null,
      categoryId: null,
      specifierId: null,
      notes: null,
      facebook: null,
      instagram: null,
      // Cadastro SEM contato e SEM endereço: o `null` do objeto inteiro é um
      // estado do contrato, não um descuido do seed.
      mobilePhone: null,
      businessPhone: null,
      homePhone: null,
      fax: null,
      address: null,
      vinculos: {
        [TENANT_FILIAL]: { code: 'C-201', paymentTerms: '30/60', active: false },
      },
    },
  ]
}

/**
 * SEMENTE DO DASHBOARD — datas RELATIVAS ao dia em que o mock roda.
 *
 * Datas fixas envelheceriam: uma agenda semeada em agosto mostraria "hoje" vazio
 * em setembro, e o mini-calendário marcaria dias de um mês que ninguém está
 * olhando. O Boletim tem o problema oposto e o assume por escrito (a data de
 * referência dele é a da captura do SoftLux); aqui a tela É sobre hoje, então o
 * mock precisa acompanhar o relógio.
 */
function diaISO(deslocamento: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return diaLocalISO(d)
}

/** Hoje, na hora cheia informada, no fuso local — como o servidor mandaria. */
function hojeAs(hora: number, minuto: number): string {
  const d = new Date()
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

function tarefasDoSeed(): TaskDto[] {
  const RA = { id: 'user-ra', name: 'Rafael Alves', initials: 'RA' }
  const LM = { id: 'user-lm', name: 'Lívia Moreira', initials: 'LM' }
  const HF = { id: 'user-hf', name: 'Henrique Ferro', initials: 'HF' }
  const JP = { id: 'user-jp', name: 'João Pedro', initials: 'JP' }

  return [
    {
      id: 'task-0001',
      title: 'Orçamento — Casa Jardim Botânico',
      description: 'Projeto luminotécnico completo, 3 pavimentos.',
      status: 'todo',
      priority: 'high',
      dueOn: diaISO(3),
      commentCount: 4,
      attachmentCount: 2,
      assignees: [RA, LM],
    },
    {
      id: 'task-0002',
      title: 'Cotação trilhos — 3 fornecedores',
      description: 'Comparar prazo e preço antes da ordem.',
      status: 'todo',
      priority: 'medium',
      dueOn: diaISO(5),
      commentCount: 2,
      attachmentCount: 1,
      assignees: [HF],
    },
    {
      id: 'task-0003',
      title: 'Follow-up cliente Mendes',
      description: 'Retomar proposta enviada no mês passado.',
      status: 'todo',
      priority: 'low',
      dueOn: diaISO(7),
      commentCount: 1,
      attachmentCount: 0,
      assignees: [JP],
    },
    {
      id: 'task-0004',
      title: 'Pedido de compra #479 — Stella',
      description: 'Aguardando confirmação de frete.',
      status: 'doing',
      priority: 'medium',
      dueOn: diaISO(1),
      commentCount: 6,
      attachmentCount: 3,
      assignees: [RA, HF],
    },
    {
      id: 'task-0005',
      title: 'Conferência de estoque — galpão 2',
      description: 'Contagem cíclica das luminárias de trilho.',
      status: 'doing',
      priority: 'low',
      dueOn: diaISO(2),
      commentCount: 3,
      attachmentCount: 1,
      assignees: [LM],
    },
    {
      id: 'task-0006',
      title: 'Orçamento — loja Iguatemi (v3)',
      description: 'Revisão final antes do envio ao cliente.',
      status: 'review',
      priority: 'high',
      dueOn: diaISO(1),
      commentCount: 9,
      attachmentCount: 5,
      assignees: [LM, JP],
    },
    {
      id: 'task-0007',
      title: 'Orçamento aprovado — loft Cambuí',
      description: null,
      status: 'done',
      priority: 'low',
      dueOn: diaISO(-2),
      commentCount: 12,
      attachmentCount: 4,
      assignees: [HF],
    },
    {
      id: 'task-0008',
      title: 'Entrada NF 1204 no estoque',
      description: null,
      status: 'done',
      priority: 'low',
      dueOn: diaISO(-1),
      commentCount: 2,
      attachmentCount: 1,
      assignees: [RA],
    },
  ]
}

function agendaDoSeed(): AgendaEventDto[] {
  return [
    {
      id: 'ev-0001',
      startsAt: hojeAs(9, 0),
      title: 'Revisar orçamento',
      context: 'Residência Alphaville',
      kind: 'quote',
    },
    {
      id: 'ev-0002',
      startsAt: hojeAs(11, 30),
      title: 'Receber pedido #482',
      context: 'fornecedor Interlight',
      kind: 'delivery',
    },
    {
      id: 'ev-0003',
      startsAt: hojeAs(15, 0),
      title: 'Reunião com arquiteta',
      context: 'projeto Galleria',
      kind: 'meeting',
    },
    {
      id: 'ev-0004',
      startsAt: `${diaISO(3)}T10:00:00.000Z`,
      title: 'Entrega — trilhos eletrificados',
      context: 'obra Vila Nova',
      kind: 'delivery',
    },
    {
      id: 'ev-0005',
      startsAt: `${diaISO(5)}T14:00:00.000Z`,
      title: 'Vencimento — duplicata Stella',
      context: null,
      kind: 'payment',
    },
    {
      id: 'ev-0006',
      startsAt: `${diaISO(8)}T09:30:00.000Z`,
      title: 'Apresentação de orçamento',
      context: 'loja Iguatemi',
      kind: 'quote',
    },
    {
      id: 'ev-0007',
      startsAt: `${diaISO(-4)}T16:00:00.000Z`,
      title: 'Reunião de fechamento',
      context: 'loft Cambuí',
      kind: 'meeting',
    },
  ]
}

function todosDoSeed(): TodoDto[] {
  return [
    { id: 'todo-0001', title: 'Atualizar tabela de preços Lumini', done: true },
    { id: 'todo-0002', title: 'Cadastrar 8 produtos novos no estoque', done: false },
    { id: 'todo-0003', title: 'Enviar orçamento revisado ao cliente Braga', done: false },
    { id: 'todo-0004', title: 'Conferir NF 1207 pendente', done: false },
  ]
}

function projetosDoSeed(): ProjectDto[] {
  return [
    { id: 'proj-0001', name: 'Residência Alphaville', status: 'active' },
    { id: 'proj-0002', name: 'Loja Iguatemi', status: 'proposed' },
    { id: 'proj-0003', name: 'Loft Cambuí', status: 'closed' },
  ]
}

function planosDoSeed(): Record<string, ProjectPlanDto> {
  return {
    'proj-0001': {
      projectId: 'proj-0001',
      phases: [
        {
          id: 'fase-0001',
          name: 'Levantamento',
          startsOn: diaISO(-60),
          endsOn: diaISO(-20),
          items: [
            {
              id: 'plan-0001',
              label: 'Visita técnica e medições',
              kind: 'task',
              startsOn: diaISO(-60),
              endsOn: diaISO(-45),
              progressPercent: 100,
            },
            {
              id: 'plan-0002',
              label: 'Orçamento preliminar',
              kind: 'task',
              startsOn: diaISO(-44),
              endsOn: diaISO(-20),
              progressPercent: 100,
            },
          ],
        },
        {
          id: 'fase-0002',
          name: 'Aquisição',
          startsOn: diaISO(-19),
          endsOn: diaISO(25),
          items: [
            {
              id: 'plan-0003',
              label: 'Pedido de compra #479',
              kind: 'order',
              startsOn: diaISO(-19),
              endsOn: diaISO(6),
              progressPercent: 60,
            },
            {
              id: 'plan-0004',
              label: 'Entrega de trilhos',
              kind: 'delivery',
              startsOn: diaISO(7),
              endsOn: diaISO(25),
              progressPercent: 0,
            },
          ],
        },
        {
          id: 'fase-0003',
          name: 'Instalação',
          startsOn: diaISO(26),
          endsOn: diaISO(90),
          items: [
            {
              id: 'plan-0005',
              label: 'Montagem dos pavimentos 1 e 2',
              kind: 'task',
              startsOn: diaISO(26),
              endsOn: diaISO(70),
              progressPercent: 0,
            },
            {
              id: 'plan-0006',
              label: 'Entrega final',
              kind: 'delivery',
              startsOn: diaISO(71),
              endsOn: diaISO(90),
              progressPercent: 0,
            },
          ],
        },
      ],
    },
    'proj-0002': {
      projectId: 'proj-0002',
      phases: [
        {
          id: 'fase-0004',
          name: 'Proposta',
          startsOn: diaISO(-5),
          endsOn: diaISO(30),
          items: [
            {
              id: 'plan-0007',
              label: 'Orçamento v3',
              kind: 'task',
              startsOn: diaISO(-5),
              endsOn: diaISO(10),
              progressPercent: 80,
            },
            {
              id: 'plan-0008',
              label: 'Aprovação do cliente',
              kind: 'task',
              startsOn: diaISO(11),
              endsOn: diaISO(30),
              progressPercent: 0,
            },
          ],
        },
      ],
    },
    'proj-0003': { projectId: 'proj-0003', phases: [] },
  }
}

export function criarStore(): StoreDaApi {
  return {
    logado: false,
    expiraProximaEscrita: false,
    mustChangePassword: false,
    activeTenantId: null,
    // As duas empresas diferem no que OPERAM, não só no nome: a Matriz compra e
    // emprega (fornecedor, profissional externo, colaborador), a Filial só
    // vende. É o que torna o `features` exercitável em dev — trocar de empresa
    // no rodapé encolhe e devolve o menu de Cadastros diante do operador.
    empresas: [
      {
        tenantId: TENANT_MATRIZ,
        name: 'Vertz Iluminação — Matriz',
        role: 'admin',
        features: ['suppliers', 'professionals', 'employees'],
      },
      {
        tenantId: TENANT_FILIAL,
        name: 'Vertz Iluminação — Filial',
        role: 'member',
        features: [],
      },
    ],
    lookups: lookupsDoSeed(),
    produtos: produtosDoSeed(),
    parceiros: parceirosDoSeed(),
    movimentos: [],
    tarefas: tarefasDoSeed(),
    todos: todosDoSeed(),
    agenda: agendaDoSeed(),
    projetos: projetosDoSeed(),
    planos: planosDoSeed(),
    // COMEÇA ACIMA DO SEED, e não em 1. O contador é um só para todos os
    // prefixos e o seed grava ids à mão (`parc-0001`, `prod-0003`): saindo de
    // 1, o PRIMEIRO cadastro incluído nascia `parc-0002` — id que já existia.
    // Nada quebrava na hora; quebrava na releitura por id, que encontrava o
    // registro do seed e devolvia o cadastro errado, com cara de "não gravou".
    proximoId: 1000,
  }
}

export const store: StoreDaApi = criarStore()

export function resetStore(): void {
  Object.assign(store, criarStore())
}

/**
 * Abre a sessão do store SEM passar pelo login — o autologin de dev
 * (`VITE_MOCK_AUTOLOGIN`, ligado por padrão no modo mock; ver `browser.ts`).
 *
 * Semeia o que uma sessão de verdade traria depois de login + escolha de
 * empresa: colaborador admin, os dois vínculos do seed e a PRIMEIRA empresa
 * como ativa. Sem a empresa ativa a sessão existiria mas o domínio responderia
 * lista vazia (semântica da Etapa 0) — cair no app com tudo em branco não é
 * "entrar sem login", é entrar pela metade.
 *
 * Isto NÃO afrouxa autorização: quem responde continua sendo o handler do
 * `/auth/me`, e a guarda continua exigindo o 200. O que muda é o estado do
 * store de onde o handler tira a resposta — nenhuma linha de código de
 * autorização sabe que existe modo de desenvolvimento.
 *
 * Fora do `criarStore()` de propósito: o seed é o estado DESLOGADO que
 * `resetStore()` devolve a cada teste dos handlers, e é o que a tela de login
 * do modo mock precisa encontrar quando o autologin está desligado.
 */
export function semearSessaoAutenticada(): void {
  store.logado = true
  store.mustChangePassword = false
  store.activeTenantId = store.empresas[0]?.tenantId ?? null
}

/**
 * Arma o ensaio de expiração: a PRÓXIMA escrita responde 401.
 *
 * A sessão de leitura continua de pé de propósito — ver `expiraProximaEscrita`.
 * O gatilho se desarma ao disparar, então o reenvio depois da reentrada passa;
 * fosse permanente, o operador entraria de novo e tomaria 401 outra vez, e o
 * ensaio provaria o contrário do que existe para mostrar.
 */
export function armarExpiracaoDaProximaEscrita(): void {
  store.expiraProximaEscrita = true
}

/**
 * Derruba a sessão inteira, como um cookie que venceu de vez.
 *
 * Ensaia o outro caminho, o do ponto 1: o `/auth/me` passa a 401, a guarda
 * manda ao login e a rota de origem é preservada. É complementar ao gatilho de
 * escrita, não substituto — este apaga a tela, aquele a mantém de pé.
 */
export function expirarSessaoAgora(): void {
  store.logado = false
  store.activeTenantId = null
}

export function novoId(prefixo: string): string {
  store.proximoId += 1
  return `${prefixo}-${String(store.proximoId).padStart(4, '0')}`
}

/** O `PartnerDto` do contrato: cadastro da ORG + vínculo da empresa ativa. */
export function partnerDto(p: ParceiroDaOrg, tenantId: string): PartnerDto {
  const vinculo = p.vinculos[tenantId]
  return {
    id: p.id,
    code: vinculo?.code ?? null,
    legalName: p.legalName,
    tradeName: p.tradeName,
    document: p.document,
    email: p.email,
    isCustomer: p.isCustomer,
    isSupplier: p.isSupplier,
    isProfessional: p.isProfessional,
    paymentTerms: vinculo?.paymentTerms ?? null,
    active: vinculo?.active ?? false,
    registrationActive: p.registrationActive,
    registration: p.registration,
    payoutBankInfo: p.payoutBankInfo,
    // DERIVADO, nunca guardado: `parentName` que se grava é `parentName` que um
    // dia diverge do `parentId` — a razão pela qual a escrita também não o
    // aceita de volta (ver a descrição no contrato).
    parentId: p.parentId,
    parentName: p.parentId
      ? (store.parceiros.find((outro) => outro.id === p.parentId)?.legalName ?? null)
      : null,
    // As cinco chaves saem SEMPRE, mesmo nulas: `corpoDeEscrita` recusa gravar
    // quando o registro chega sem um campo que o `PUT` substitui — ausente não
    // é nulo, e um mock que omite ensinaria a tela a tratar os dois como a
    // mesma coisa.
    mobilePhone: p.mobilePhone,
    businessPhone: p.businessPhone,
    homePhone: p.homePhone,
    fax: p.fax,
    address: p.address,
    // Fase 1 (#250), pela mesma regra das cinco de cima: a chave sai SEMPRE.
    stateRegistration: p.stateRegistration,
    ruralProducerRegistration: p.ruralProducerRegistration,
    categoryId: p.categoryId,
    specifierId: p.specifierId,
    notes: p.notes,
    facebook: p.facebook,
    instagram: p.instagram,
    // DERIVADOS do id, como `parentName` — nome guardado é nome que um dia
    // diverge, e é por isso que a escrita não os aceita de volta.
    categoryName: nomeDeApoio(p.categoryId),
    specifierName: nomeDeApoio(p.specifierId),
  }
}

/** Nome de um item de lista de apoio, pelo id. `null` quando não há id. */
function nomeDeApoio(id: string | null): string | null {
  if (!id) return null
  return store.lookups.find((l) => l.id === id)?.name ?? null
}
