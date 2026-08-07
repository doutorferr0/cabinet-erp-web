/**
 * MÓDULO DA ROTA — de qual módulo é a tela que está no ar.
 *
 * A fase 1.6 dá a cada módulo um par de cores fixo (`[data-modulo]` no
 * `index.css`) e um shape de ornamento fixo. Quem resolve o par é o CSS; o que
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

/** Prefixo de rota → módulo. Ordem importa: o mais específico primeiro. */
const porPrefixo: ReadonlyArray<readonly [string, Modulo]> = [
  ['/cadastros/clientes', 'clientes'],
  ['/cadastros/fornecedores', 'fornecedores'],
  ['/cadastros/profissionais', 'profissionais'],
  ['/cadastros/produtos', 'produtos'],
  ['/estoque', 'estoque'],
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
