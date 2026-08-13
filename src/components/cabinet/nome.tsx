import { cn } from '@/lib/utils'

/**
 * NOME — o nome próprio de uma entidade, na voz de QUEM.
 *
 * A tipografia do Cabinet divide por SEMÂNTICA, não por tamanho (decisão do
 * user, 2026-08-13, formulada por ele: *"'cliente:' estaria em Sora e o nome do
 * cliente em Newsreader"*). Quatro famílias, quatro papéis:
 *
 * - **quem** — Newsreader: nome de cliente, profissional, fornecedor, empresa;
 *   título de tela e de documento. É esta peça.
 * - **o quê** — Sora: nome de produto, descrição.
 * - **UI** — Inter: rótulo, cabeçalho de coluna, botão, menu, aba.
 * - **quanto** — PT Mono: número, código, data, valor.
 *
 * **É componente, e não uma classe `font-nome` solta, pelo mesmo motivo do
 * `<Ornamento>`:** nome de entidade aparece em formulário, célula de tabela,
 * combo, migalha, banda de identidade e diálogo de confirmação. Regra que
 * depende de alguém lembrar da classe falha na terceira tela — e falha MUDA,
 * porque texto na fonte errada não quebra teste nenhum.
 *
 * **O +2px não é enfeite, é correção de hierarquia.** A altura-x do Newsreader
 * é menor que a de Sora e Inter; no MESMO tamanho, o nome do cliente lê como
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
const DEGRAU = 'text-[1.15em]'

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
 * PRODUTO — a voz de O QUÊ: nome de produto e descrição, em Sora.
 *
 * Mora no mesmo arquivo que o `<Nome>` de propósito: os dois são o PAR que faz
 * a linha da listagem se ler. Numa mesma linha há três famílias — nome em
 * serifa, produto em Sora, número em mono — e foi o produto em
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
    <span data-slot="produto" className={cn('font-display text-muted-foreground', className)}>
      {children}
    </span>
  )
}
