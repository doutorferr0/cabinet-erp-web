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
  | 'stock-locations'
  | 'payment-terms'
  | 'installment-policy'
  | 'employees'
  | 'catalog-lookups'
  | 'projects'
  | 'dashboard'
  | 'roles'

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
  /**
   * Decisão do user em 2026-08-22 (api#79, ponto 4), e **INTERINA**.
   *
   * Depósito não vai junto de `variants`, apesar de ser estoque: movimentar é
   * operação de atendimento, criar depósito muda a leitura de saldo de TODO
   * mundo — a mesma linha de corte que já põe `employees` e não `products` em
   * `admin`. Vira a permissão nomeada `depositos:gerenciar` quando o modelo por
   * AÇÃO (api#84) entregar; até lá o papel é o piso, porque a matriz é por papel.
   */
  'stock-locations': 'admin',
  /**
   * Condição de pagamento e a política de parcelamento sobem juntas, e ficam
   * onde o depósito ficou — pela MESMA linha de corte, não por simetria.
   *
   * Parcelar não é operação de atendimento: é a regra que decide o que TODO
   * vendedor pode oferecer, e o erro sai em documento assinado antes de alguém
   * notar. `operator-sales` grava o orçamento (é o trabalho dele) e escolhe
   * entre as condições que existem; criar a condição é outra coisa.
   *
   * A política fica no MESMO degrau que a condição, e não um acima, porque quem
   * pode escrever a condição já decide o plano na prática: um teto de 6× guardado
   * de `admin` enquanto `operator-full` cadastra a condição de 10 parcelas seria
   * cadeado na porta com a janela aberta.
   *
   * **INTERINO**, como a linha do depósito: vira permissão nomeada quando o
   * modelo por AÇÃO (api#84) entregar.
   */
  'payment-terms': 'admin',
  'installment-policy': 'admin',
  employees: 'admin',
  /**
   * Decisão, não herança (`cabinet-erp-api#66`).
   *
   * A linha nasceu `admin` como fechado-por-precaução, quando o contrato ainda
   * não publicava escrita de lista de apoio. A escrita chegou (api#38) e a
   * linha continuou `admin` sem ninguém decidir. O que fechou em
   * `operator-full` é a natureza da tabela: `catalog_lookups` é GLOBAL — sem
   * `tenant_id`, sem RLS — então cadastrar item de lista escreve para o GRUPO,
   * e um nome errado aparece no combo das outras empresas, nas 19 telas, para
   * sempre. É palavra por palavra o critério que esta matriz já usa para
   * `products`/`variants`: o cadastro que vale para o grupo inteiro, onde o
   * erro de um vaza para todo mundo.
   *
   * O argumento da OBRA (não travar o vendedor no meio do atendimento) não
   * transfere: obra tem `tenant_id` e o erro fica dentro do tenant de quem
   * errou.
   */
  'catalog-lookups': 'operator-full',
  projects: 'owner',
  dashboard: 'owner',
  /**
   * Gerenciar papéis é distribuir permissão para os outros — é a definição de
   * `admin` na api#84 ("acesso completo, cria usuários e papéis"), e não uma
   * escolha desta linha.
   *
   * A matriz continua sendo a escala ANTIGA de propósito: enquanto a conversão
   * do api#84 não chega à fase 3, é por ela que o front esconde controle. O dia
   * em que o vínculo publicar as permissões efetivas, esta matriz inteira morre
   * junto com `alcanca()` — não só esta linha.
   */
  roles: 'admin',
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
  'stock-locations': ['/api/stock-locations'],
  'payment-terms': ['/api/payment-terms'],
  'installment-policy': ['/api/installment-policy'],
  employees: ['/api/employees'],
  'catalog-lookups': ['/api/catalog-lookups'],
  projects: ['/api/projects'],
  dashboard: ['/api/dashboard'],
  roles: ['/api/roles'],
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
