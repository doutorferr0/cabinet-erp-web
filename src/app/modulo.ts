/**
 * MÓDULO DA ROTA — de qual módulo é a tela que está no ar.
 *
 * A fase 1.6 dá a cada módulo um par de cores fixo (`[data-modulo]` no
 * `index.css`) e uma forma fixa (`DO_MODULO` em `forma.tsx`). Quem resolve o par é o CSS; o que
 * falta é dizer ao CSS em que módulo o operador está, e essa informação só
 * existe na URL.
 *
 * Fica numa função pura, e não espalhado em `startsWith` dentro do shell, por
 * dois motivos: dá para testar sem montar rota, e a atribuição de cor por
 * módulo passa a ter UM lugar onde é lida — trocar a cor de um módulo é editar
 * o `index.css`, trocar o alcance é editar aqui.
 *
 * `Colaboradores` não tem cor própria de propósito: a tabela de shape×cor
 * travada pelo user cobre oito módulos e esse não é um deles. Cai no par padrão
 * (marca do sistema) até o user atribuir — inventar a nona cor aqui seria
 * decidir identidade visual por conta própria.
 *
 * `crm` é o NONO módulo, e não é exceção à regra acima: o par (verde neon
 * #00E676, hue 151) e o desenho (`brutalist-011`, a cintura que faz o funil)
 * foram escolhidos PELO USER em 2026-08-13, depois de eu medir que o magenta do
 * mapa de tabelas (#B0306B) cai no mesmo hue 330 do módulo Compras.
 */
export type Modulo =
  | 'boletim'
  | 'clientes'
  | 'fornecedores'
  | 'profissionais'
  | 'produtos'
  | 'estoque'
  | 'vendas'
  | 'compras'
  | 'crm'

/** Prefixo de rota → módulo. Ordem importa: o mais específico primeiro. */
const porPrefixo: ReadonlyArray<readonly [string, Modulo]> = [
  ['/cadastros/clientes', 'clientes'],
  ['/cadastros/fornecedores', 'fornecedores'],
  ['/cadastros/profissionais', 'profissionais'],
  ['/cadastros/produtos', 'produtos'],
  ['/estoque', 'estoque'],
  ['/crm', 'crm'],
  ['/vendas', 'vendas'],
  ['/compras', 'compras'],
]

export function moduloDaRota(pathname: string): Modulo | undefined {
  // `/` é o Boletim e é prefixo de todo o resto: casamento exato, nunca prefixo.
  if (pathname === '/') return 'boletim'
  const achado = porPrefixo.find(
    ([prefixo]) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  )
  return achado?.[1]
}
