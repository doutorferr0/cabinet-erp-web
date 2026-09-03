import { FormaDoModulo } from '@/components/cabinet/forma'
import { cn } from '@/lib/utils'

export interface BandaDeIdentidadeProps {
  /** Nome da tela, literal da transcrição ("Cadastro de fornecedores"). */
  titulo: string
  /** Contexto que qualifica o título (empresa, banco, nº do documento). */
  contexto?: string
  /** Fim da banda: carimbo, nº do documento — o que a tela precisar à direita. */
  children?: React.ReactNode
  /**
   * Escala do título (#236). `tela` (padrão) é a headline de qualquer tela;
   * `documento` sobe para 36px, o par do número-herói ao lado.
   *
   * É opt-in, e não o novo padrão, porque a banda é a headline de TODA tela —
   * login, configurações, boletim, os cadastros. Subir a medida aqui mudaria
   * o título do sistema inteiro para atender uma decisão que a issue tomou
   * sobre o DOCUMENTO, e ninguém leria isso como decisão: leria como a tela de
   * login ter engordado sozinha.
   */
  escalaTitulo?: 'tela' | 'documento'
  className?: string
}

const ESCALA_TITULO = {
  tela: 'text-[1.75rem]',
  documento: 'text-[2.25rem]',
} as const

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
  escalaTitulo = 'tela',
  className,
}: BandaDeIdentidadeProps) {
  return (
    <div
      className={cn(
        // FUSÃO v5: trilho de cor à esquerda (PREENCHIMENTO do acento — traço
        // segue preto) + um degrau a mais de respiro. A banda é a peça que diz
        // "que tela é esta"; o trilho é a assinatura de cor dela.
        'relative flex items-center gap-3.5 overflow-hidden border-2 border-border bg-[linear-gradient(115deg,hsl(var(--zone-id)),hsl(var(--zone-id)/0.55)_58%,hsl(var(--zone-info)/0.5))] py-3 pr-3.5 pl-5',
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
      <h1
        className={cn(
          'font-[family-name:var(--font-display-condensada)] leading-none tracking-[0.02em] uppercase',
          ESCALA_TITULO[escalaTitulo],
        )}
      >
        {titulo}
      </h1>
      {contexto ? (
        // FUSÃO v5 r3: o MODO da tela é situação, não título — pill âmbar
        // (zona de pendência/foco), como o carimbo CONSULTA do mockup.
        <span className="rounded-full border-2 border-warn bg-zone-warn px-3 py-0.5 font-bold font-mono text-[0.65rem] uppercase tracking-[0.12em] text-foreground">
          {contexto}
        </span>
      ) : null}
      {children ? <div className="ml-auto flex items-center gap-3">{children}</div> : null}
      {/* Marca d'água do módulo, 24px, no fim da faixa (um desenho por região).
          Fica DEPOIS do `children` e com `ml-auto` só quando não há children:
          o carimbo e o número do documento são dado, e dado vem antes de
          decoração na ordem de leitura. Um por região — esta é a região. */}
      <FormaDoModulo tamanho={24} className={children ? '' : 'ml-auto'} />
    </div>
  )
}
