import { COR_DE_ZONA, DCard, MarcaDeCard } from '@/components/cabinet/painel'

export type CorDoPainel = 'boletim' | 'foco' | 'cadastros'

/**
 * A cor da região, agora em token 2.0 e num quadradinho de 8px.
 *
 * Os três empregos não mudaram — movimento é o assunto da folha, pendência é
 * ESTADO e cadastros é o inventário —, mudou de onde a cor vem e quanta área ela
 * pinta. `boletim` lê `--mod-hoje` (o matiz do grupo "Hoje" na sidebar 2.0, que
 * é onde a folha do dia mora), pendência lê a zona `warn` e cadastros
 * `--mod-estoque` — o mesmo empréstimo de antes, agora sem passar pela tripla
 * HSL do 1.x.
 */
const CORES: Record<CorDoPainel, string> = {
  boletim: 'var(--mod-hoje)',
  foco: COR_DE_ZONA.warn,
  cadastros: 'var(--mod-estoque)',
}

/**
 * PAINEL DO BOLETIM — na Reface 2.0, um `DCard` quieto, como painel e seção.
 *
 * ## O que era, e por que nada disso sobreviveu
 *
 * Era um `fieldset` com moldura DUPLA colorida (borda de 2px + filete externo
 * de 1px com offset), `legend` vazado na borda, interior em papel quadriculado
 * e a cor da região pintando os quatro lados. Três painéis desses lado a lado
 * na folha do dia davam três molduras coloridas competindo com o dado que elas
 * cercam — e §Hierarquia (issue-mãe #469) recusa isso por três regras de uma vez:
 *
 * - **Card = borda `n-300` + `--hard-soft`** (ou tinta + `--hard-1/2`, e a
 *   tinta é dos KPIs). Moldura colorida de 2px não é nenhum dos dois.
 * - **Uma ferramenta por fronteira.** Moldura + filete externo eram duas linhas
 *   na MESMA fronteira, encostadas — o caso que a régua nomeia palavra por
 *   palavra.
 * - **Máximo 2 níveis de card, e dentro de um card só espaço, hairline e
 *   tint.** O papel quadriculado era textura de fundo dentro do card, um quarto
 *   vocabulário de separação que a régua não tem.
 *
 * ## Deixou de ser `fieldset`, e isso é conserto de semântica
 *
 * `fieldset`/`legend` anuncia GRUPO DE CONTROLES ao leitor de tela. As três
 * regiões da folha do dia são tabelas de leitura — nenhum campo, nenhum
 * controle. O argumento é o mesmo que `painel.tsx` já escrevia para não usar
 * `FormBlock`, e ele valia aqui desde sempre; o que faltava era alguém aplicar.
 * A legenda passa a ser o título do card (`.t-bloco`, `h3`), que é o que ela
 * sempre foi na tela.
 *
 * O corpo vai SEM padding: as três regiões são tabelas, e célula de tabela já
 * tem o padding dela. Padding no corpo recuaria a hairline das linhas e cada
 * régua da tabela viraria um traço solto dentro da caixa.
 */
export function PainelBoletim({
  cor,
  legend,
  className,
  children,
}: {
  cor: CorDoPainel
  legend?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <DCard
      data-slot="painel-boletim"
      data-regiao={cor}
      // Sem `legend` não há cabeçalho — e é o certo: cabeçalho vazio ocuparia
      // 41px de altura dizendo nada, e um quadradinho sem rótulo ao lado é cor
      // que o operador não tem como nomear (WCAG 1.4.1).
      {...(legend ? { titulo: legend, marca: <MarcaDeCard cor={CORES[cor]} /> } : {})}
      {...(className ? { className } : {})}
    >
      {children}
    </DCard>
  )
}
