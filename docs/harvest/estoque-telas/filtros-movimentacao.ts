/**
 * FILTROS DA LISTAGEM DE MOVIMENTAÇÃO — declaração staged.
 *
 * Material de `docs/harvest/`: **não é importado por `src/`** e não importa de
 * `src/`. Por isso os tipos aparecem duplicados aqui em vez de vir de
 * `@/lib/filtro-de-consulta` — a pasta é lida, não compilada
 * (`tsconfig.app.json` inclui só `src`).
 *
 * O racional de cada campo está em `telas.md` §3.3. Aqui fica a forma exata que
 * a tela vai declarar, para que a integração seja recortar e trocar os tipos
 * locais pelos do repo.
 *
 * ## Três coisas para conferir na hora de integrar
 *
 * 1. **`id` é o nome que VIAJA.** Nos recursos HTTP ele tem que ser idêntico ao
 *    campo do DTO e estar na whitelist de filtro do servidor. Enquanto não
 *    houver caminho de estoque no contrato, esta lista não pode ser ligada: o
 *    provider HTTP recusa filtro sem contrato em voz alta, e é assim que deve
 *    ser (regra do #76).
 * 2. **`icon` é `LucideIcon` no repo, `string` aqui.** Importar `lucide-react`
 *    numa pasta que ninguém compila acrescentaria dependência a material
 *    staged. Na integração, `'CalendarDays'` vira `CalendarDays`.
 * 3. **`opcoes` de local e de operador vêm do servidor**, não daqui. Os valores
 *    abaixo são o formato, não o conteúdo: local é `stock_locations` (4 no
 *    legado) e operador é `employees` da empresa.
 */

type VarianteDeFiltro = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiSelect'

interface OpcaoDeFiltro {
  valor: string
  rotulo: string
}

interface CampoFiltravel {
  id: string
  rotulo: string
  variante: VarianteDeFiltro
  opcoes?: readonly OpcaoDeFiltro[]
  placeholder?: string
  /** No repo: `LucideIcon`. Aqui, o nome do ícone. */
  icon?: string
}

/**
 * Motivos — o domínio proposto em `vocabulario-de-movimento.md` §3.
 *
 * Os VALORES ficam em inglês porque são o que viaja para o servidor (mesma
 * regra do `accessorKey` e dos operadores de filtro); o rótulo PT-BR vive só na
 * borda de exibição.
 */
export const MOTIVOS: readonly OpcaoDeFiltro[] = [
  { valor: 'purchase_receipt', rotulo: 'Entrada por nota' },
  { valor: 'customer_return', rotulo: 'Devolução de cliente' },
  { valor: 'manual_in', rotulo: 'Entrada manual' },
  { valor: 'sales_delivery', rotulo: 'Entrega de pedido' },
  { valor: 'supplier_return', rotulo: 'Devolução ao fornecedor' },
  { valor: 'manual_out', rotulo: 'Saída manual' },
  { valor: 'loss', rotulo: 'Perda ou avaria' },
  { valor: 'count', rotulo: 'Inventário' },
  { valor: 'transfer', rotulo: 'Transferência' },
  { valor: 'opening', rotulo: 'Saldo inicial' },
]

/** Origens — `vocabulario-de-movimento.md` §4. */
export const ORIGENS: readonly OpcaoDeFiltro[] = [
  { valor: 'goods_receipt', rotulo: 'Nota do fornecedor' },
  { valor: 'sales_order', rotulo: 'Pedido de venda' },
  { valor: 'stock_entry', rotulo: 'Lançamento de estoque' },
  { valor: 'stock_count', rotulo: 'Inventário' },
  { valor: 'transfer', rotulo: 'Transferência' },
  { valor: 'migration', rotulo: 'Migração' },
]

/**
 * Os seis campos filtráveis da listagem de movimentação.
 *
 * `delta` (a quantidade) fica DE FORA de propósito: é assinado e tem 3 casas, e
 * comparar o que o operador digita com o que o banco guarda devolveria linha
 * que ninguém pediu — o mesmo motivo que manteve `salario` fora do piloto do
 * filtro estruturado.
 */
export const camposFiltraveis: readonly CampoFiltravel[] = [
  {
    id: 'occurredAt',
    rotulo: 'Data',
    variante: 'date',
    icon: 'CalendarDays',
  },
  {
    id: 'locationId',
    rotulo: 'Local',
    variante: 'select',
    icon: 'Warehouse',
    // Conteúdo real vem de `stock_locations`; estes são os 4 do legado.
    opcoes: [],
  },
  {
    id: 'variantId',
    rotulo: 'Produto',
    variante: 'text',
    icon: 'Package',
    placeholder: 'Código ou parte da descrição…',
  },
  {
    id: 'reason',
    rotulo: 'Motivo',
    variante: 'multiSelect',
    icon: 'Tag',
    opcoes: MOTIVOS,
  },
  {
    id: 'sourceKind',
    rotulo: 'Origem',
    variante: 'select',
    icon: 'FileText',
    opcoes: ORIGENS,
  },
  {
    id: 'employeeId',
    rotulo: 'Operador',
    variante: 'select',
    icon: 'User',
    // Conteúdo real vem de `employees` da empresa.
    opcoes: [],
  },
]
