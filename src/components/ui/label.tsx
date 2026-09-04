import { cn } from '@/lib/utils'
import { LabelContext, Label as LabelPrimitive, type LabelProps } from 'react-aria-components'

/**
 * RÓTULO SEM CAIXA E SEM CAIXA ALTA (Reface 2.0, issue #470).
 *
 * A etiqueta 1.x era Sans 10px bold em CAIXA ALTA com tracking largo — o
 * vocabulário de `--t-rotulo`, que na 2.0 pertence a cabeçalho de coluna,
 * rótulo de KPI e título de grupo da sidebar. Num formulário de trinta campos
 * ela vira trinta linhas de versalete gritando acima de trinta valores, e a
 * caixa alta ainda custa velocidade de leitura em palavra composta ("INSCRIÇÃO
 * ESTADUAL"). Agora o rótulo é frase normal: Inter 500, 12px, n-700 — sussurra,
 * e quem fala é o dado.
 *
 * **Qual degrau.** O mockup pede Inter 500 · 12 · n-700, e a §Hierarquia não
 * publica esse degrau (o de 12px é `--t-meta`, Inter 400 n-500). Em vez de
 * escrever `font-size` literal — proibido pela régua —, o rótulo CONSOME
 * `.t-meta` (que fixa o tamanho) e sobe peso e cor por utility. Falta um
 * `--t-campo` na fundação; anotado na #469 para a D1/D30 decidirem.
 *
 * **Por que `!`.** `.t-meta` mora em `tokens-2.0.css`, importado sem `layer()`:
 * fica fora de camada e DEPOIS das utilities no CSS final, então vence
 * `font-medium`/`text-*` por ordem de documento. O `!` é o que devolve peso e
 * cor ao componente sem editar a fundação (zona da D1).
 *
 * **E por que o erro precisa de especificidade dupla.** `FormLabel`
 * (`ui/form.tsx`, zona da D16) injeta `text-destructive` por `className` — uma
 * utility, que perderia tanto para `.t-meta` quanto para o `!` acima. O seletor
 * `[&.text-destructive]` casa a classe injetada NO PRÓPRIO elemento e resolve o
 * campo inválido sem tocar em arquivo de outra issue.
 *
 * `obrigatorio` marca `*` em `--bad` e `hint` acrescenta a ajuda curta em
 * n-500, os dois do mockup (`.f label em` e `.f label .h`).
 *
 * **O asterisco é `::after`, não um `<span>`, e isso não é economia de nó.** Um
 * elemento de verdade entra no `textContent` do `<label>`, e é dali que o
 * Testing Library monta o nome em `getByLabelText` — "Razão social" viraria
 * "Razão social*" e toda busca exata das telas quebraria no dia em que alguém
 * marcasse o campo como obrigatório. `aria-hidden` resolveria o leitor de tela e
 * NÃO resolveria isso. Como pseudo-elemento, o `*` é o que ele de fato é:
 * convenção visual redundante. Quem anuncia obrigatoriedade a quem não vê é o
 * `required`/`aria-required` do CAMPO.
 *
 * O `hint` continua sendo elemento: ele é informação ("sem máscara"), e
 * informação que só existe em pixel é informação que metade das pessoas não
 * recebe.
 *
 * `w-fit` + `self-start`: o rótulo embrulha o próprio texto e não estica na
 * largura do campo.
 *
 * Com o campo desabilitado a etiqueta NÃO muda (§Desabilitado): ela é o que diz
 * o que o campo é, e apagá-la tira o nome do dado justamente quando o operador
 * não pode mexer nele.
 */
function Label({
  className,
  htmlFor,
  slot,
  obrigatorio,
  hint,
  children,
  ...props
}: LabelProps & {
  /** Campo obrigatório: `*` em `--bad` depois do texto. */
  obrigatorio?: boolean | undefined
  /** Ajuda curta ao lado do rótulo, em n-500 (ex.: "sem máscara"). */
  hint?: string | undefined
}) {
  const label = (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        't-meta inline-flex w-fit items-center gap-1 self-start font-medium! text-[color:var(--n-700)]! select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed [&.text-destructive]:text-[color:var(--bad)]!',
        obrigatorio && "after:ml-px after:text-[color:var(--bad)]! after:content-['*']",
        className,
      )}
      {...props}
      htmlFor={htmlFor}
      slot={slot}
    >
      {children}
      {hint ? <span className="font-normal! text-[color:var(--n-500)]!">{hint}</span> : null}
    </LabelPrimitive>
  )

  // Com htmlFor explícito, sai do contexto da RAC (associação manual).
  if (htmlFor && slot === undefined) {
    return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>
  }

  return label
}

export { Label }
