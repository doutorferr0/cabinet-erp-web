import {
  type FamiliaDeCaminho,
  PAPEIS,
  PAPEIS_ORDENADOS,
  PAPEL_MINIMO_POR_FAMILIA,
  type Papel,
  familiaDoCaminho,
  papelLabel,
  podeEscrever,
  podeEscreverNoCaminho,
  usePermissoesDoPapel,
  useReadOnlyPorPapel,
} from '@/data/papeis'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/data/empresas-api', () => ({
  useEmpresasDaSessao: vi.fn(),
}))

import { useEmpresasDaSessao } from '@/data/empresas-api'

function mockSessao(role: Papel | null, carregando = false, erro = false) {
  vi.mocked(useEmpresasDaSessao).mockReturnValue({
    empresas: role ? [{ tenantId: 't-1', name: 'X', role, features: [] }] : [],
    ativa: role ? { tenantId: 't-1', name: 'X', role, features: [] } : null,
    carregando,
    erro,
    trocar: vi.fn(),
    trocando: false,
    falhaAoTrocar: false,
  })
}

describe('PAPEIS', () => {
  it('lista os cinco papéis do CHECK do backend', () => {
    expect(Object.keys(PAPEIS).sort()).toEqual([
      'admin',
      'operator-full',
      'operator-sales',
      'owner',
      'viewer',
    ])
  })

  it('ordem crescente de permissão começa em viewer e termina em owner', () => {
    expect(PAPEIS_ORDENADOS).toEqual([
      'viewer',
      'operator-sales',
      'operator-full',
      'admin',
      'owner',
    ])
  })
})

describe('papelLabel', () => {
  it('devolve o rótulo em português para papel conhecido', () => {
    expect(papelLabel('viewer')).toBe('Consulta')
    expect(papelLabel('owner')).toBe('Proprietário')
  })

  it('devolve o identificador cru para papel desconhecido', () => {
    expect(papelLabel('super-admin')).toBe('super-admin')
  })
})

describe('podeEscrever', () => {
  it('viewer não escreve em nenhuma família', () => {
    for (const familia of Object.keys(PAPEL_MINIMO_POR_FAMILIA) as FamiliaDeCaminho[]) {
      expect(podeEscrever('viewer', familia)).toBe(false)
    }
  })

  it('owner escreve em todas as famílias', () => {
    for (const familia of Object.keys(PAPEL_MINIMO_POR_FAMILIA) as FamiliaDeCaminho[]) {
      expect(podeEscrever('owner', familia)).toBe(true)
    }
  })

  it('operator-sales escreve só nas famílias de mínimo operator-sales', () => {
    expect(podeEscrever('operator-sales', 'quotes')).toBe(true)
    expect(podeEscrever('operator-sales', 'orders')).toBe(true)
    expect(podeEscrever('operator-sales', 'crm')).toBe(true)
    expect(podeEscrever('operator-sales', 'products')).toBe(false)
    expect(podeEscrever('operator-sales', 'employees')).toBe(false)
  })

  it('operator-full escreve em products e variants', () => {
    expect(podeEscrever('operator-full', 'products')).toBe(true)
    expect(podeEscrever('operator-full', 'variants')).toBe(true)
    expect(podeEscrever('operator-full', 'employees')).toBe(false)
  })

  it('admin escreve em employees e catalog-lookups', () => {
    expect(podeEscrever('admin', 'employees')).toBe(true)
    expect(podeEscrever('admin', 'catalog-lookups')).toBe(true)
    expect(podeEscrever('admin', 'projects')).toBe(false)
  })

  it('papel ausente ou desconhecido é sempre false', () => {
    expect(podeEscrever(null, 'products')).toBe(false)
    expect(podeEscrever(undefined, 'crm')).toBe(false)
    expect(podeEscrever('super-admin', 'products')).toBe(false)
  })
})

describe('familiaDoCaminho', () => {
  it('reconhece caminhos exatos e prefixados', () => {
    expect(familiaDoCaminho('/api/products')).toBe('products')
    expect(familiaDoCaminho('/api/products/123')).toBe('products')
    expect(familiaDoCaminho('/api/quotes')).toBe('quotes')
    expect(familiaDoCaminho('/api/quotes/456/items')).toBe('quotes')
    expect(familiaDoCaminho('/api/crm/pipelines')).toBe('crm')
  })

  it('normaliza barras duplas', () => {
    expect(familiaDoCaminho('//api//products//123')).toBe('products')
  })

  it('devolve undefined para caminho sem prefixo conhecido', () => {
    expect(familiaDoCaminho('/api/unknown')).toBeUndefined()
    expect(familiaDoCaminho('/auth/me')).toBeUndefined()
  })
})

describe('podeEscreverNoCaminho', () => {
  it('permite caminho sem família mapeada', () => {
    expect(podeEscreverNoCaminho('viewer', '/auth/me')).toBe(true)
  })

  it('aplica a mesma regra da família para caminho conhecido', () => {
    expect(podeEscreverNoCaminho('viewer', '/api/products')).toBe(false)
    expect(podeEscreverNoCaminho('operator-full', '/api/products')).toBe(true)
  })
})

describe('usePermissoesDoPapel', () => {
  it('enquanto carrega, conhecido é false e podeEscrever é false', () => {
    mockSessao('owner', true)
    const permissoes = usePermissoesDoPapel()
    expect(permissoes.conhecido).toBe(false)
    expect(permissoes.podeEscrever('products')).toBe(false)
  })

  it('com erro, conhecido é false', () => {
    mockSessao('owner', false, true)
    const permissoes = usePermissoesDoPapel()
    expect(permissoes.conhecido).toBe(false)
  })

  it('com sessão owner, pode escrever em qualquer família', () => {
    mockSessao('owner')
    const permissoes = usePermissoesDoPapel()
    expect(permissoes.conhecido).toBe(true)
    expect(permissoes.podeEscrever('projects')).toBe(true)
  })

  it('com sessão viewer, não pode escrever em products', () => {
    mockSessao('viewer')
    const permissoes = usePermissoesDoPapel()
    expect(permissoes.conhecido).toBe(true)
    expect(permissoes.podeEscrever('products')).toBe(false)
  })
})

describe('useReadOnlyPorPapel', () => {
  it('sem familia, readOnly é false e conhecido é true', () => {
    mockSessao('viewer')
    const resultado = useReadOnlyPorPapel(undefined)
    expect(resultado.readOnly).toBe(false)
    expect(resultado.conhecido).toBe(true)
  })

  it('viewer fica readOnly em products', () => {
    mockSessao('viewer')
    const resultado = useReadOnlyPorPapel('products')
    expect(resultado.readOnly).toBe(true)
    expect(resultado.conhecido).toBe(true)
  })

  it('operator-full não fica readOnly em products', () => {
    mockSessao('operator-full')
    const resultado = useReadOnlyPorPapel('products')
    expect(resultado.readOnly).toBe(false)
    expect(resultado.conhecido).toBe(true)
  })
})
