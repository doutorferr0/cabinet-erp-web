import { OrnamentoDoModulo } from '@/components/cabinet/ornamento'
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
 * Banda de identidade (DESIGN.md §CadastroForm): a faixa em caixa preta onde a
 * tela diz o próprio nome, pintada com a ZONA DE IDENTIDADE — desde a 1.6, o
 * lilás Primary/02 da paleta no lugar do creme-avermelhado tingido.
 *
 * Substitui o `<h1 className="text-xl font-semibold">` que estava copiado em 19
 * rotas: mesma classe repetida, sem dono e sem a zona. Duas consequências:
 *
 * 1. **Um lugar só** — mudar o título de tela do sistema inteiro deixa de ser
 *    varredura de arquivo em arquivo (era o vetor de deriva do DESIGN.md).
 * 2. **A zona volta a significar** — o lilás Primary/02 é o emprego fixo de
 *    IDENTIDADE (par da zona de dinheiro, o verde Success/02): quem vê a faixa
 *    sabe que ali se lê "que tela é esta", nunca dado. As duas eram CREMES
 *    TINGIDOS até a 1.6 e este comentário ainda as chamava assim — com as
 *    superfícies cinzas de 2026-08-13 não sobrou creme nenhum no sistema para
 *    o nome apontar.
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
        // FUSÃO v5: trilho de cor à esquerda (PREENCHIMENTO do acento — traço
        // segue preto) + um degrau a mais de respiro. A banda é a peça que diz
        // "que tela é esta"; o trilho é a assinatura de cor dela.
        'relative flex items-center gap-3.5 overflow-hidden border-2 border-border bg-zone-id py-3 pr-3.5 pl-5',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-accent" />
      {/* Headline: o degrau mais alto da rampa, um por tela — e desde
          2026-08-13 na voz de QUEM (Newsreader, pelo seletor `h1` do
          `index.css`), porque título de tela responde "quem é esta tela" no
          mesmo grupo do nome próprio de entidade.
          **Sem CAIXA ALTA** (decisão do user, 2026-08-13): serifada não leva
          caixa alta. Maiúscula só na inicial — o título já chega escrito assim
          ("Cadastro de Fornecedores"), então quem capitaliza é o texto, não o
          CSS. A caixa alta era da época em que o título falava em Sora, onde
          ela dava força sem custo; numa serifada de alto contraste ela vira
          letreiro e fecha o vão entre serifas vizinhas.
          Peso 700 e não 800: o Newsreader entra com dois pesos só (400/700), e
          `font-extrabold` sem arquivo de 800 vira negrito SINTÉTICO — o browser
          engorda o traço por conta e fecha as hastes finas. */}
      <h1 className="font-bold text-2xl">{titulo}</h1>
      {contexto ? (
        <span className="font-bold font-mono text-[0.75rem] uppercase tracking-[0.07em] text-text-strong">
          {contexto}
        </span>
      ) : null}
      {children ? <div className="ml-auto flex items-center gap-3">{children}</div> : null}
      {/* Marca d'água do módulo, 24px, no fim da faixa (memória §@ornamentos).
          Fica DEPOIS do `children` e com `ml-auto` só quando não há children:
          o carimbo e o número do documento são dado, e dado vem antes de
          decoração na ordem de leitura. Um por região — esta é a região. */}
      <OrnamentoDoModulo tamanho={24} className={children ? '' : 'ml-auto'} />
    </div>
  )
}
