import { useEmpresasDaSessao } from '@/data/empresas-api'

/**
 * Papéis de acesso — conjunto FECHADO.
 *
 * Fonte: o schema canônico do ERP, onde `employee_company.role` é
 * `text NOT NULL CHECK (role IN ('owner','admin','operator-full',
 * 'operator-sales','viewer'))`. Não é lista inventada: o banco recusa qualquer
 * valor fora dela, e quem implementar o contrato herda a mesma restrição.
 *
 * O rótulo em PT-BR é UI, como já vale para os lookups ("rótulo é UI, não dado").
 * O identificador que trafega continua sendo o do contrato.
 *
 * `super-admin` NÃO está aqui de propósito: o `project-core.md` registra que ele
 * precisa ser quebrado (admin-da-organização ≠ suporte-da-plataforma) e o CHECK
 * do schema não o inclui.
 */
export const PAPEIS = {
  owner: 'Proprietário',
  admin: 'Administrador',
  'operator-full': 'Operador',
  'operator-sales': 'Operador de Vendas',
  viewer: 'Consulta',
} as const

export type Papel = keyof typeof PAPEIS

/**
 * Rótulo do papel; devolve o identificador cru quando ele não é conhecido.
 *
 * Papel novo no backend aparece na tela como veio, em vez de sumir ou virar
 * "desconhecido" — o operador vê algo verdadeiro e o desalinhamento fica visível.
 */
export function papelLabel(role: string): string {
  return PAPEIS[role as Papel] ?? role
}

/**
 * Escala de papéis — ordem crescente de permissão.
 *
 * `viewer` é o piso (só leitura); `owner` é o teto. A comparação é posicional:
 * quem está à direita pode tudo o que quem está à esquerda pode, mais a própria
 * família. Esta ordem é a mesma que o backend usa em `classificacao.ts`.
 */
export const PAPEIS_ORDENADOS = [
  'viewer',
  'operator-sales',
  'operator-full',
  'admin',
  'owner',
] as const satisfies readonly Papel[]

/** Famílias de caminho que o front usa para decidir o que mostrar. */
export type FamiliaDeCaminho =
  | 'quotes'
  | 'orders'
  | 'crm'
  | 'partners'
  | 'activities'
  | 'tasks'
  | 'todos'
  | 'products'
  | 'variants'
  | 'employees'
  | 'catalog-lookups'
  | 'projects'
  | 'dashboard'

/**
 * Papel mínimo por família de caminho — cópia da matriz do backend
 * (`cabinet-erp-api#34`).
 *
 * O servidor continua sendo a autoridade: esta matriz só serve para ESCONDER
 * controles, nunca para autorizar. Se divergir, o pior caso é um 403 bem
 * tratado, não uma mentira silenciosa.
 */
export const PAPEL_MINIMO_POR_FAMILIA: Record<FamiliaDeCaminho, Papel> = {
  quotes: 'operator-sales',
  orders: 'operator-sales',
  crm: 'operator-sales',
  partners: 'operator-sales',
  activities: 'operator-sales',
  tasks: 'operator-sales',
  todos: 'operator-sales',
  products: 'operator-full',
  variants: 'operator-full',
  employees: 'admin',
  'catalog-lookups': 'admin',
  projects: 'owner',
  dashboard: 'owner',
}

/**
 * Mapeamento de prefixo de caminho para família.
 *
 * Não é exaustivo: caminhos que não casam nenhum prefixo não são bloqueados
 * pelo front — a decisão continua com o servidor.
 */
const PREFIXOS_POR_FAMILIA: Record<FamiliaDeCaminho, string[]> = {
  quotes: ['/api/quotes'],
  orders: ['/api/orders'],
  crm: ['/api/crm'],
  partners: ['/api/partners'],
  activities: ['/api/activities'],
  tasks: ['/api/tasks'],
  todos: ['/api/todos'],
  products: ['/api/products'],
  variants: ['/api/products', '/api/variants'],
  employees: ['/api/employees'],
  'catalog-lookups': ['/api/catalog-lookups'],
  projects: ['/api/projects'],
  dashboard: ['/api/dashboard'],
}

/** Devolve a família de um caminho de API, ou `undefined` quando não se aplica. */
export function familiaDoCaminho(caminho: string): FamiliaDeCaminho | undefined {
  const normalizado = caminho.replace(/\/{2,}/g, '/')
  for (const [familia, prefixos] of Object.entries(PREFIXOS_POR_FAMILIA) as [
    FamiliaDeCaminho,
    string[],
  ][]) {
    if (
      prefixos.some((prefixo) => normalizado === prefixo || normalizado.startsWith(`${prefixo}/`))
    ) {
      return familia
    }
  }
  return undefined
}

/**
 * `true` quando o papel alcança a escrita na família.
 *
 * Papel desconhecido ou ausente = `false`: a tela não afirma o que ainda não
 * sabe. Papel novo no backend que não está na escala também cai em `false`,
 * deixando o desalinhamento visível em vez de prometer acesso.
 */
export function podeEscrever(papel: string | null | undefined, familia: FamiliaDeCaminho): boolean {
  if (!papel) return false
  const papelConhecido = PAPEIS_ORDENADOS.find((p) => p === papel)
  if (!papelConhecido) return false
  const ordemPapel = PAPEIS_ORDENADOS.indexOf(papelConhecido)
  const minimo = PAPEL_MINIMO_POR_FAMILIA[familia]
  const ordemMinimo = PAPEIS_ORDENADOS.indexOf(minimo)
  return ordemPapel >= ordemMinimo
}

/** Versão por caminho — útil quando a família é derivada da requisição. */
export function podeEscreverNoCaminho(papel: string | null | undefined, caminho: string): boolean {
  const familia = familiaDoCaminho(caminho)
  if (!familia) return true
  return podeEscrever(papel, familia)
}

/**
 * Permissões do vínculo ativo — irmã de `useRecursosDaEmpresa`.
 *
 * Enquanto o vínculo não chega, `conhecido` é `false` e `podeEscrever` responde
 * `false` para qualquer família. A tela não afirma nem nega antes de saber.
 */
export interface PermissoesDoPapel {
  /** `true` só quando o papel alcança a escrita na família informada. */
  podeEscrever: (familia: FamiliaDeCaminho) => boolean
  /** Se a resposta já é confiável. */
  conhecido: boolean
}

export function usePermissoesDoPapel(): PermissoesDoPapel {
  const { ativa, carregando, erro } = useEmpresasDaSessao()
  const conhecido = !carregando && !erro && ativa !== null
  const papel = ativa?.role ?? null
  return {
    podeEscrever: (familia) => (conhecido ? podeEscrever(papel as Papel | null, familia) : false),
    conhecido,
  }
}

/**
 * Hook prático para formulários: devolve `readOnly` quando o papel do vínculo
 * ativo não alcança a família.
 *
 * `conhecido` exposto para a tela decidir se mostra esqueleto enquanto carrega.
 */
export function useReadOnlyPorPapel(familia: FamiliaDeCaminho | undefined): {
  readOnly: boolean
  conhecido: boolean
} {
  const permissoes = usePermissoesDoPapel()
  if (!familia) return { readOnly: false, conhecido: true }
  return {
    readOnly: permissoes.conhecido && !permissoes.podeEscrever(familia),
    conhecido: permissoes.conhecido,
  }
}
