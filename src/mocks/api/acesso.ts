import type { PermissionCatalogDto, RoleDetailDto, RoleDto, RoleWriteRequest } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { verificarEscrita } from './permissao'
import { TIPO, camposInvalidos, conflito, naoEncontrado, problemaJson, semSessao } from './problema'
import { novoId, store } from './store'

/**
 * O "backend" de PAPÉIS E PERMISSÕES no modo mock (api#84, contrato na web#292).
 *
 * Arquivo próprio pela mesma razão do CRM e do orçamento: estado que não é do
 * store das telas antigas, e arquivo novo não disputa linha com quem edita o
 * vizinho.
 *
 * **Ainda não há tela.** A de checkboxes é trilho próprio, depois da fase 1 do
 * api#84 — o que existe aqui responde ao contrato para que o mock não fique
 * mudo em caminho publicado, e para que a tela, quando vier, seja escrita
 * contra o mesmo comportamento que o servidor promete.
 *
 * O que este mock reproduz de propósito, porque é onde o desenho pode estar
 * errado:
 *
 * - **o catálogo é FIXO e vem inteiro** — sem página, sem filtro. Meia lista de
 *   caixas faria o admin gravar papel sem as permissões que não viu;
 * - **papel de sistema recusa alteração com 409**, não 403: quem pede TEM a
 *   permissão, o que recusa é o recurso;
 * - **`permissions` do `PUT` é o conjunto FINAL** — desmarcar tem efeito;
 * - **template não é protegido**: `template` conta de onde o papel veio,
 *   `system` é que trava.
 */

/**
 * O catálogo — SEMENTE DE MOCK, não a lista do servidor.
 *
 * A lista de verdade nasce no código do `cabinet-erp-api` e chega por
 * `GET /api/permissions`; é justamente por isso que o contrato não a congela em
 * enum. O que está aqui é plausível e ancorado no que o repo já conhece: os
 * módulos saem das famílias de caminho de `src/data/papeis.ts`, mais
 * `depositos`, que a api#84 nomeia como o primeiro consumidor
 * (`depositos:gerenciar`, api#79 decisão 4).
 *
 * A granularidade é a da decisão: uma chave por AÇÃO, `modulo:acao`.
 */
const CATALOGO: PermissionCatalogDto = {
  version: 'mock-2026-08-22',
  modules: [
    {
      key: 'produtos',
      label: 'Produtos',
      permissions: [
        { key: 'produtos:ver', label: 'Ver produtos', description: null },
        {
          key: 'produtos:editar',
          label: 'Cadastrar e alterar produtos',
          description: 'Inclui variantes. O cadastro vale para o grupo inteiro.',
        },
      ],
    },
    {
      key: 'estoque',
      label: 'Estoque',
      permissions: [
        { key: 'estoque:ver', label: 'Ver saldos e kardex', description: null },
        {
          key: 'estoque:movimentar',
          label: 'Movimentar estoque',
          description: 'Entrada, saída e ajuste. Estoque não se escreve: movimenta-se.',
        },
      ],
    },
    {
      key: 'depositos',
      label: 'Depósitos',
      permissions: [
        { key: 'depositos:ver', label: 'Ver depósitos', description: null },
        {
          key: 'depositos:gerenciar',
          label: 'Criar e alterar depósitos',
          description: 'O primeiro consumidor da permissão por ação (api#79).',
        },
      ],
    },
    {
      key: 'parceiros',
      label: 'Parceiros',
      permissions: [
        {
          key: 'parceiros:ver',
          label: 'Ver clientes, fornecedores e profissionais',
          description: null,
        },
        { key: 'parceiros:editar', label: 'Cadastrar e alterar parceiros', description: null },
      ],
    },
    {
      key: 'orcamento',
      label: 'Orçamento',
      permissions: [
        { key: 'orcamento:ver', label: 'Ver orçamentos', description: null },
        { key: 'orcamento:editar', label: 'Criar e alterar orçamentos', description: null },
        {
          key: 'orcamento:imprimir',
          label: 'Imprimir orçamento',
          description: 'Separada da edição: quem atende o cliente imprime sem poder mudar o preço.',
        },
        { key: 'orcamento:cancelar', label: 'Cancelar orçamento', description: null },
      ],
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      permissions: [
        { key: 'pedidos:ver', label: 'Ver pedidos', description: null },
        { key: 'pedidos:editar', label: 'Gerar e alterar pedidos', description: null },
        { key: 'pedidos:cancelar', label: 'Cancelar pedido', description: null },
      ],
    },
    {
      key: 'crm',
      label: 'CRM',
      permissions: [
        { key: 'crm:ver', label: 'Ver funis e oportunidades', description: null },
        { key: 'crm:editar', label: 'Mover cartões e editar oportunidades', description: null },
        {
          key: 'crm:gerenciar',
          label: 'Configurar funis, estágios e motivos de perda',
          description: 'Mexe no desenho do processo, não num negócio.',
        },
      ],
    },
    {
      key: 'atividades',
      label: 'Atividades e tarefas',
      permissions: [
        { key: 'atividades:ver', label: 'Ver atividades e tarefas', description: null },
        { key: 'atividades:editar', label: 'Registrar e concluir atividades', description: null },
      ],
    },
    {
      key: 'colaboradores',
      label: 'Colaboradores',
      permissions: [
        { key: 'colaboradores:ver', label: 'Ver colaboradores', description: null },
        {
          key: 'colaboradores:editar',
          label: 'Cadastrar colaboradores e vínculos',
          description: 'O e-mail do colaborador é a credencial de acesso.',
        },
      ],
    },
    {
      key: 'listas',
      label: 'Listas de apoio',
      permissions: [
        {
          key: 'listas:editar',
          label: 'Cadastrar itens de lista',
          description: 'A tabela é GLOBAL: o nome errado aparece no combo das outras empresas.',
        },
      ],
    },
    {
      key: 'papeis',
      label: 'Papéis e permissões',
      permissions: [
        {
          key: 'papeis:gerenciar',
          label: 'Criar e alterar papéis',
          description: 'Distribui permissão para os outros — é o que define o administrador.',
        },
      ],
    },
    {
      key: 'dashboard',
      label: 'Painel',
      permissions: [
        {
          key: 'dashboard:ver',
          label: 'Ver indicadores da empresa',
          description: 'Fatura, margem e agenda do grupo aparecem aqui.',
        },
      ],
    },
  ],
}

/** Toda chave que o catálogo publica — o que o `PUT` aceita e nada além. */
const CHAVES = new Set(CATALOGO.modules.flatMap((m) => m.permissions.map((p) => p.key)))

/** O papel GUARDADO — a linha da tabela, com o conjunto junto. */
interface PapelGuardado {
  id: string
  name: string
  description: string | null
  system: boolean
  template: boolean
  active: boolean
  permissions: string[]
}

const TODAS = [...CHAVES]

/**
 * A semente ANTECIPA a fase 3 do api#84, e é de propósito.
 *
 * `owner` e `admin` são os dois papéis de sistema; os outros três são
 * exatamente os papéis antigos que sobram da escala (`operator-full`,
 * `operator-sales`, `viewer`), já com o rótulo PT-BR que `src/data/papeis.ts`
 * lhes dá, agora na forma de template de fábrica. É o que a migração vai
 * produzir — semear outra coisa treinaria a tela contra um mundo que não vai
 * existir.
 */
function semear(): PapelGuardado[] {
  return [
    {
      id: novoId('papel'),
      name: 'Proprietário',
      description: 'Dono da organização. Não se remove e não se edita.',
      system: true,
      template: false,
      active: true,
      permissions: TODAS,
    },
    {
      id: novoId('papel'),
      name: 'Administrador',
      description: 'Acesso completo; cria usuários e papéis.',
      system: true,
      template: false,
      active: true,
      permissions: TODAS,
    },
    {
      id: novoId('papel'),
      name: 'Operador',
      description: 'O antigo `operator-full`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: TODAS.filter((k) => !k.startsWith('papeis:') && !k.startsWith('colaboradores:')),
    },
    {
      id: novoId('papel'),
      name: 'Operador de Vendas',
      description: 'O antigo `operator-sales`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: [
        'parceiros:ver',
        'parceiros:editar',
        'orcamento:ver',
        'orcamento:editar',
        'orcamento:imprimir',
        'pedidos:ver',
        'pedidos:editar',
        'crm:ver',
        'crm:editar',
        'atividades:ver',
        'atividades:editar',
        'produtos:ver',
        'estoque:ver',
      ],
    },
    {
      id: novoId('papel'),
      name: 'Consulta',
      description: 'O antigo `viewer`, virado template.',
      system: false,
      template: true,
      active: true,
      permissions: TODAS.filter((k) => k.endsWith(':ver')),
    },
  ]
}

let papeis: PapelGuardado[] = semear()

/** Devolve os papéis à semente — irmão de `resetQuotes`, para o teste isolar. */
export function resetAcesso(): void {
  papeis = semear()
}

function linha(papel: PapelGuardado): RoleDto {
  return {
    id: papel.id,
    name: papel.name,
    description: papel.description,
    system: papel.system,
    template: papel.template,
    active: papel.active,
    permissionCount: papel.permissions.length,
  }
}

function detalhe(papel: PapelGuardado): RoleDetailDto {
  return { ...linha(papel), permissions: [...papel.permissions] }
}

/** `sortBy` desta listagem — a whitelist que o contrato publica. */
export const ORDENAVEIS_PAPEL = ['name', 'active'] as const

/**
 * Valida o corpo de escrita. Devolve a resposta de erro, ou `undefined`.
 *
 * A permissão fora do catálogo é `campos-invalidos` com `fields[]` apontando
 * `permissions`, e não um 400 genérico: a tela precisa levar o erro à caixa, e
 * uma frase solta mandaria o admin conferir sessenta delas.
 */
function recusarCorpo(corpo: RoleWriteRequest, id: string | null) {
  if (!corpo.name?.trim()) {
    return camposInvalidos([{ path: 'name', message: 'Nome do papel é obrigatório.' }])
  }
  const desconhecidas = (corpo.permissions ?? []).filter((k) => !CHAVES.has(k))
  if (desconhecidas.length > 0) {
    return camposInvalidos([
      { path: 'permissions', message: `Fora do catálogo: ${desconhecidas.join(', ')}.` },
    ])
  }
  const repetido = papeis.some(
    (p) => p.id !== id && p.name.toLowerCase() === corpo.name.trim().toLowerCase(),
  )
  if (repetido) return conflito('Já existe um papel com este nome.')
  return undefined
}

export const handlersDeAcesso = [
  http.get('*/api/permissions', () => {
    if (!store.logado) return semSessao()
    return HttpResponse.json(CATALOGO)
  }),

  http.get('*/api/roles', ({ request }) => {
    if (!store.logado) return semSessao()
    // Sem recorte por empresa ativa: papel é da ORGANIZAÇÃO, e quem é por
    // empresa é a ATRIBUIÇÃO, no vínculo.
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      )
    }
    if (sortBy && !ORDENAVEIS_PAPEL.some((o) => o === sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let rows = papeis.map(linha)
    if (q) {
      const alvo = q.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(alvo))
    }
    if (sortBy) {
      const chave = sortBy as 'name' | 'active'
      rows.sort((a, b) => {
        const va = String(a[chave] ?? '')
        const vb = String(b[chave] ?? '')
        return sortDesc ? vb.localeCompare(va) : va.localeCompare(vb)
      })
    }
    const total = rows.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: rows.slice(inicio, inicio + pageSize), total })
  }),

  http.post('*/api/roles', async ({ request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('roles')
    if (semPermissao) return semPermissao
    const corpo = (await request.json()) as RoleWriteRequest
    const recusa = recusarCorpo(corpo, null)
    if (recusa) return recusa
    // `system` e `template` são do servidor: papel que se declarasse de sistema
    // pelo corpo passaria por cima da recusa de edição.
    const novo: PapelGuardado = {
      id: novoId('papel'),
      name: corpo.name.trim(),
      description: corpo.description ?? null,
      system: false,
      template: false,
      active: corpo.active ?? true,
      permissions: [...(corpo.permissions ?? [])],
    }
    papeis.push(novo)
    return HttpResponse.json(detalhe(novo), { status: 201 })
  }),

  http.get('*/api/roles/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    const achado = papeis.find((p) => p.id === String(params.id))
    if (!achado) return naoEncontrado('Papel não encontrado.')
    return HttpResponse.json(detalhe(achado))
  }),

  http.put('*/api/roles/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    const semPermissao = verificarEscrita('roles')
    if (semPermissao) return semPermissao
    const achado = papeis.find((p) => p.id === String(params.id))
    if (!achado) return naoEncontrado('Papel não encontrado.')
    if (achado.system) {
      return conflito('Papel de sistema não é editável.', TIPO.papelDeSistema)
    }
    const corpo = (await request.json()) as RoleWriteRequest
    const recusa = recusarCorpo(corpo, achado.id)
    if (recusa) return recusa
    achado.name = corpo.name.trim()
    achado.description = corpo.description ?? null
    achado.active = corpo.active ?? true
    // Conjunto FINAL, não acréscimo — desmarcar caixa precisa ter efeito.
    achado.permissions = [...(corpo.permissions ?? [])]
    return HttpResponse.json(detalhe(achado))
  }),
]
