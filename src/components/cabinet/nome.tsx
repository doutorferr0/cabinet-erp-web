import { cn } from '@/lib/utils'

/**
 * NOME — o nome próprio de uma entidade, na voz de QUEM.
 *
 * A tipografia da fase 1.5 dividia por SEMÂNTICA e chegava a quatro famílias
 * (decisão do user, 2026-08-13): uma para QUEM — nome de cliente, profissional,
 * fornecedor, empresa, e título de tela —, uma para O QUÊ — nome de produto e
 * descrição —, Inter para a INTERFACE e uma mono para QUANTO. Esta peça era a
 * primeira delas.
 *
 * **Na 2.0 (#469) são três famílias e a divisão é por PAPEL**: título, interface
 * e dado. `--font-nome` virou alias da família de título, então o `<Nome>`
 * continua se lendo diferente do rótulo ao lado; o que sumiu foi a distinção
 * entre "quem" e "o quê", que custava duas famílias para separar duas colunas
 * da mesma linha. Quem faz essa separação agora é a cor (n-900 contra n-500) e
 * o degrau da régua. Reescrever esta peça em `--t-*` é trabalho de D8/D15.
 *
 * **É componente, e não uma classe `font-nome` solta, pelo mesmo motivo do
 * `<Forma>`:** nome de entidade aparece em formulário, célula de tabela,
 * combo, migalha, banda de identidade e diálogo de confirmação. Regra que
 * depende de alguém lembrar da classe falha na terceira tela — e falha MUDA,
 * porque texto na fonte errada não quebra teste nenhum.
 *
 * **O +2px não é enfeite, é correção de hierarquia.** A altura-x da família de
 * título é menor que a das sans; no MESMO tamanho, o nome do cliente lê como
 * texto secundário e a hierarquia da linha inverte — o rótulo passa a pesar
 * mais que o dado. Medido em render, não deduzido. O ajuste é em `em` e não em
 * px de propósito: a peça entra tanto numa célula de 14px quanto num título de
 * 24px, e o degrau tem de acompanhar o vizinho, não um tamanho fixo.
 *
 * Não confundir com o `<Selo>` nem com a `<BandaDeIdentidade>`: aqui não há
 * caixa, cor nem fundo. É só a voz.
 */
export interface NomeProps {
  children: React.ReactNode
  /**
   * `forte` onde o nome É o título da região — banda, diálogo, cabeçalho de
   * documento. Na célula de listagem fica `normal`: uma coluna inteira em 700
   * deixa de destacar coisa alguma.
   */
  peso?: 'normal' | 'forte'
  className?: string
}

/** +2px a 14px. Em `em` para acompanhar o vizinho em qualquer contexto. */
const DEGRAU = 'text-[1.1em] font-medium'

/**
 * A voz de QUEM como CLASSE — a única exceção à regra "componente, nunca
 * classe", e ela existe por um motivo mecânico: **`<input>` não aceita filho.**
 * O nome do cliente dentro do campo do formulário é o mesmo nome próprio da
 * célula da listagem, e ficaria em Inter só porque o controle é um input.
 *
 * Não usar isto onde couber `<Nome>`. Quem a consome é o `voz="nome"` do
 * `<TextField>`, que é o jeito de pedi-la sem espalhar a classe por tela.
 */
export const VOZ_DE_NOME = `font-nome ${DEGRAU}`

export function Nome({ children, peso = 'normal', className }: NomeProps) {
  return (
    <span
      data-slot="nome"
      className={cn('font-nome', DEGRAU, peso === 'forte' && 'font-bold', className)}
    >
      {children}
    </span>
  )
}

/**
 * PRODUTO — a voz de O QUÊ: nome de produto e descrição.
 *
 * Mora no mesmo arquivo que o `<Nome>` de propósito: os dois são o PAR que faz
 * a linha da listagem se ler. Na 1.5 a linha tinha três famílias — nome, produto
 * e número, cada um na sua —; na 2.0 nome e produto compartilham a de título e
 * quem os separa é a cor. Foi o produto em
 * `--muted-foreground` que impediu o empate visual: em `--foreground` ele
 * disputa a atenção com o nome do cliente e a linha perde o assunto. Separar as
 * duas peças em dois arquivos convidaria a aplicar uma sem a outra, que é
 * exatamente o estado que não funciona.
 *
 * O recuo de cor vale na LISTAGEM, onde o produto é coadjuvante. Onde o produto
 * É o assunto — a tela de cadastro dele, o item do orçamento — passar
 * `className="text-foreground"` devolve o peso.
 */
export function Produto({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    // O QUÊ (produto, serviço) é DADO em Inter 500, tinta cheia: é a coluna que o
    // operador lê primeiro. Descrição vem em caixa alta do legado — tracking leve
    // para as maiúsculas respirarem; nunca display, nunca apagado.
    <span
      data-slot="produto"
      className={cn('font-sans font-medium tracking-[0.01em] text-foreground', className)}
    >
      {children}
    </span>
  )
}
