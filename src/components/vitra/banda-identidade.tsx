import { cn } from '@/lib/utils'

export interface BandaDeIdentidadeProps {
  /** Nome da tela, literal da transcrição ("Cadastro de fornecedores"). */
  titulo: string
  /** Contexto que qualifica o título (empresa, banco, nº do documento). */
  contexto?: string
  /** Fim da banda: carimbo, nº do documento — o que a tela precisar à direita. */
  children?: React.ReactNode
  className?: string
}

/**
 * Banda de identidade (DESIGN.md §CadastroForm): a faixa creme-avermelhada em
 * caixa preta onde a tela diz o próprio nome.
 *
 * Substitui o `<h1 className="text-xl font-semibold">` que estava copiado em 19
 * rotas: mesma classe repetida, sem dono e sem a zona. Duas consequências:
 *
 * 1. **Um lugar só** — mudar o título de tela do sistema inteiro deixa de ser
 *    varredura de arquivo em arquivo (era o vetor de deriva do DESIGN.md).
 * 2. **A zona volta a significar** — creme-avermelhado é o emprego fixo de
 *    IDENTIDADE (par da zona de dinheiro, creme-esverdeada): quem vê a faixa
 *    sabe que ali se lê "que tela é esta", nunca dado.
 *
 * Fica DENTRO da folha, acima da barra de ações — a folha é a página, a banda é
 * o cabeçalho dela.
 */
export function BandaDeIdentidade({
  titulo,
  contexto,
  children,
  className,
}: BandaDeIdentidadeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 border-2 border-border bg-zone-id px-3.5 py-2.5',
        className,
      )}
    >
      {/* Headline 800 caps: o degrau mais alto da rampa, um por tela. */}
      <h1 className="font-extrabold text-2xl uppercase tracking-[-0.02em]">{titulo}</h1>
      {contexto ? (
        <span className="font-bold font-mono text-[0.75rem] uppercase tracking-[0.07em] text-muted-foreground">
          {contexto}
        </span>
      ) : null}
      {children ? <div className="ml-auto flex items-center gap-3">{children}</div> : null}
    </div>
  )
}
