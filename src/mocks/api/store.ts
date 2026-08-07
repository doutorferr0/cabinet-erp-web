import type {
  CatalogLookupDto,
  PartnerDto,
  ProductDetailDto,
  StockMovementDto,
  VinculoDeEmpresa,
} from '@/api/gerado'

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
  /** Vínculo por empresa (tenantId → dados do vínculo). Sem entrada = não vinculado. */
  vinculos: Record<string, VinculoDeParceiro>
}

export interface StoreDaApi {
  logado: boolean
  mustChangePassword: boolean
  activeTenantId: string | null
  empresas: VinculoDeEmpresa[]
  lookups: CatalogLookupDto[]
  produtos: ProductDetailDto[]
  parceiros: ParceiroDaOrg[]
  movimentos: StockMovementDto[]
  proximoId: number
}

export const TENANT_MATRIZ = 'tenant-matriz'
export const TENANT_FILIAL = 'tenant-filial'

function lookupsDoSeed(): CatalogLookupDto[] {
  const porKind: Record<string, string[]> = {
    MARCA: ['EVOLED', 'STELLA', 'BRILIA', 'SAVE ENERGY'],
    FABRICA: ['FÁBRICA SP', 'FÁBRICA SUL'],
    TIPO_PRODUTO: ['PENDENTE', 'ARANDELA', 'EMBUTIDO', 'PLAFON', 'FITA LED'],
    TIPO_PECA: ['VIDRO', 'METAL', 'MADEIRA'],
    CLASSIFICACAO: ['DECORATIVO', 'TÉCNICO'],
    SETOR: ['VENDAS', 'ESTOQUE', 'PROJETO'],
    CARGO: ['VENDEDOR', 'PROJETISTA', 'GERENTE'],
    MATERIAIS: ['ALUMÍNIO', 'LATÃO', 'ACRÍLICO'],
  }
  return Object.entries(porKind).flatMap(([kind, nomes]) =>
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
      vinculos: {
        [TENANT_FILIAL]: { code: 'C-201', paymentTerms: '30/60', active: false },
      },
    },
  ]
}

export function criarStore(): StoreDaApi {
  return {
    logado: false,
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
    proximoId: 1,
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
  }
}
