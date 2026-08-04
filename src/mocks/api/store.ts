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
    empresas: [
      { tenantId: TENANT_MATRIZ, name: 'Vertz Iluminação — Matriz', role: 'admin' },
      { tenantId: TENANT_FILIAL, name: 'Vertz Iluminação — Filial', role: 'member' },
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
