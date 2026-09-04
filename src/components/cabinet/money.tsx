import { cn } from '@/lib/utils'

/**
 * MONEY — o valor monetário com o símbolo em peso menor. Reface 2.0, #471 (D3).
 *
 * ## O problema que ele resolve
 *
 * Hoje o app escreve dinheiro com `formatMoneyBRL`, que devolve a string
 * inteira do `Intl` — `R$ 1.234,56` — e a tela a joga numa célula. Resultado:
 * o `R$` sai no MESMO peso, MESMA cor e MESMO tamanho do número, e numa coluna
 * de 25 linhas isso é uma coluna de "R" e "$" repetidos 25 vezes competindo
 * com o dado. O símbolo é constante: ele não carrega informação nenhuma depois
 * da primeira linha. Quem varre uma coluna de valores compara DÍGITOS.
 *
 * A correção é tipográfica, não de conteúdo: o símbolo continua lá (tirá-lo
 * deixaria o número ambíguo em relatório impresso), mas recua para peso 400 e
 * tinta secundária, enquanto o número fica em mono tabular 500 na tinta forte.
 * É a mesma economia do resto do sistema — o que se compara ganha peso, o que
 * se repete recua. (mockup 2.0, aba Tokens › Dinheiro; referência Ramp.)
 *
 * ## Mono tabular não é preferência — é `--t-dado`
 *
 * `tabular-nums` alinha os dígitos em colunas de largura fixa. Sem isso, `1` é
 * mais estreito que `8` e a mesma quantia em duas linhas fica desalinhada — o
 * olho perde a casa decimal e a comparação vertical, que é o único motivo de
 * uma coluna de valores existir.
 *
 * A §Hierarquia já tem esse degrau e ele é EXATAMENTE este caso: `--t-dado` =
 * JetBrains Mono 500 · 12.5 · tabular · n-900, "id, data, valor, quantidade,
 * código". Então o componente veste a classe `.t-dado` inteira em vez de
 * remontar os quatro valores — é o que a régua quer dizer com "consumidos por
 * classe utilitária ou componente", e é o que impede este arquivo de derivar
 * da escala quando D30 conferir.
 *
 * ## Negativo: cor E sinal, nunca só cor
 *
 * O negativo vai em `--bad` **e** leva o sinal de menos tipográfico (U+2212,
 * não o hífen), colado ao primeiro dígito, depois do símbolo. "Sem sinal
 * solto" da espec é isto: nada de `-R$ 10,00`, com o menos pendurado a três
 * caracteres do número que ele nega. Cor sozinha reprovaria WCAG 1.4.1 e
 * sumiria numa impressão em preto e branco — que é justamente o destino de um
 * relatório de valores. (O mockup pinta o negativo só de vermelho; aqui o
 * mockup perde para a régua de acessibilidade, e a decisão está registrada na
 * PR.)
 */

/** Separa milhar/decimal do pt-BR sem o símbolo — ele é renderizado à parte. */
const numero = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface MoneyProps {
  /** Centavos (int). Dinheiro NUNCA trafega em float (CLAUDE.md §Convenções). */
  valor: number
  /**
   * `leve` recua os centavos para tinta secundária — o KPI mostra a grandeza,
   * e ali os dois últimos dígitos são ruído. Na célula de listagem fica
   * `normal`: quem confere uma nota confere o centavo.
   */
  centavos?: 'normal' | 'leve'
  /** Cancelado/estornado: o valor existiu e não vale mais. */
  riscado?: boolean
  className?: string
}

export function Money({ valor, centavos = 'normal', riscado = false, className }: MoneyProps) {
  const negativo = valor < 0
  // O sinal é renderizado à parte, colado ao dígito — daí o valor absoluto.
  const [inteiros, decimais] = numero.format(Math.abs(valor) / 100).split(',')

  return (
    <span
      data-slot="money"
      data-negativo={negativo || undefined}
      data-riscado={riscado || undefined}
      className={cn(
        // `.t-dado` traz família, peso, tamanho, tabular e a tinta n-900.
        // `justify-end` porque número se compara pela unidade, que é o dígito
        // mais à direita: em célula ele encosta na borda direita da coluna.
        't-dado inline-flex items-baseline justify-end gap-1',
        negativo && '[color:var(--bad)]',
        riscado && 'line-through opacity-70',
        className,
      )}
    >
      {/* O símbolo recua: peso 400, tinta secundária. Nunca some. */}
      <small data-slot="money-simbolo" className="font-normal text-[0.9em] [color:var(--n-500)]">
        R$
      </small>
      <span data-slot="money-valor">
        {/* U+2212: o menos tipográfico tem a largura do dígito, o hífen não —
            num bloco tabular o hífen desalinha a coluna inteira. */}
        {negativo && '−'}
        {inteiros}
        <span
          data-slot="money-centavos"
          className={cn(centavos === 'leve' && 'font-normal [color:var(--n-500)]')}
        >
          ,{decimais}
        </span>
      </span>
    </span>
  )
}
