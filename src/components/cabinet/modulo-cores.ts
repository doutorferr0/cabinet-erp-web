/**
 * COR DE BLOCO — a tabela de quem pinta o quê no formulário (issue #99).
 *
 * A cor por bloco é decisão do user de 2026-08-14 e **supersede** o "paleta
 * saturada NÃO" de `direcao-visual-brutalism.md` §4. Os donos continuam
 * intocados: verde = dinheiro, amarelo = foco, vermelho = erro. Cor de bloco
 * nunca invade faixa com dono.
 *
 * **Não há cor nova aqui e não há hex.** O par de cada módulo já mora no
 * `src/index.css` (`[data-modulo="x"]` → `--modulo-01` cheia e `--modulo-02`
 * pastel), e o bloco só declara em QUE módulo ele está: `data-modulo` no
 * `<fieldset>` e as utilities `bg-modulo-cheia` (faixa) e `bg-modulo` (corpo)
 * resolvem o resto pela cascata. Trocar a cor de um módulo continua sendo
 * editar o `index.css` num lugar só.
 *
 * `ModuloCor` é tipo próprio e NÃO um alias de `Modulo` (`src/app/modulo.ts`),
 * ainda que hoje os dois tenham as mesmas nove chaves. `Modulo` responde "de
 * qual módulo é a TELA", e vem da URL; `ModuloCor` responde "que cor este BLOCO
 * veste", e vem de quem escreve o formulário. Um bloco de CRM dentro da tela de
 * Clientes é caso legítimo, e alias faria os dois conceitos andarem juntos por
 * acidente.
 */
export const MODULOS_COR = [
  'produtos',
  'estoque',
  'vendas',
  'compras',
  'clientes',
  'fornecedores',
  'profissionais',
  'crm',
  'boletim',
] as const

export type ModuloCor = (typeof MODULOS_COR)[number]

/**
 * A TINTA DA FAIXA, escolhida por MEDIÇÃO e não por gosto.
 *
 * A faixa do cabeçalho é a cheia `/01` — um neon. Texto sobre neon é o único
 * lugar em que a paleta de módulo vira FUNDO de leitura, e é onde a §Medição de
 * contraste do DESIGN.md já registra a pior reprovação do repo (o item de menu
 * ativo, 1,33:1 no escuro).
 *
 * **O mecanismo que resolve, e que só aparece medindo:** `.dark [data-modulo=…]`
 * redefine só a `/02`. A cheia `/01` é a MESMA cor nos dois temas — então a
 * tinta que pousa nela também não pode mudar de tema. Usar `--foreground` aqui
 * seria repetir o defeito do item de menu: preto no claro (4,00 a 13,71:1) e
 * claro no escuro (1,33 a 4,57:1, oito dos nove reprovando).
 *
 * Fixada a tinta, sobram duas candidatas e a medição decide por módulo. Preto
 * ganha em seis; nos três em que o neon é mais escuro — Vendas, Fornecedores e
 * Profissionais — quem passa é a tinta clara, e são justamente os três que com
 * preto reprovariam (4,00 e 4,13) ou raspariam (4,51) no piso de 4,5.
 * Com a escolha por medição o pior par do conjunto vira **4,66:1**, e vale nos
 * DOIS temas. `modulo-cores.test.ts` recalcula tudo a partir do `index.css` e
 * reprova se alguém trocar um neon sem revisitar a tinta.
 *
 * `text-black`/`text-white` são literais de propósito, e é a única forma
 * honesta com os tokens de hoje: o repo não tem token invariante de tema, e o
 * fundo aqui É invariante. O lugar certo desses dois valores é o próprio
 * `[data-modulo]` do `index.css`, como um `--modulo-cheia-foreground` por
 * módulo — uma linha por bloco. Não fiz porque `index.css` está fora da zona
 * declarada da issue #99; está escrito na PR como próximo passo.
 */
export type TintaDaFaixa = 'preta' | 'clara'

export const TINTA_DA_FAIXA: Record<ModuloCor, TintaDaFaixa> = {
  produtos: 'preta',
  estoque: 'preta',
  vendas: 'clara',
  compras: 'preta',
  clientes: 'preta',
  fornecedores: 'clara',
  profissionais: 'clara',
  crm: 'preta',
  boletim: 'preta',
}

/** Classe da tinta. Ver `TINTA_DA_FAIXA` para por que não é `text-foreground`. */
export const CLASSE_DA_TINTA: Record<TintaDaFaixa, string> = {
  preta: 'text-black',
  clara: 'text-white',
}

/** A classe de tinta que a faixa cheia deste módulo pede. */
export function classeDaTintaDaFaixa(cor: ModuloCor): string {
  return CLASSE_DA_TINTA[TINTA_DA_FAIXA[cor]]
}
