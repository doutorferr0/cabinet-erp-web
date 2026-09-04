import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * Campo — a moldura de UM campo de formulário no desenho 2.0 (D16, issue #484;
 * auditoria de reface §2.3): rótulo em cima **sem caixa**, o controle, e
 * embaixo a linha que explica ou reclama.
 *
 * ## Por que o rótulo perdeu a caixa
 *
 * Até a 1.7 o rótulo de bloco vestia pastel com contorno — era um selo. Selo é
 * peça de IDENTIDADE, e rótulo de campo não identifica coisa nenhuma: ele nomeia
 * o que se digita ao lado. Com quarenta campos numa ficha, quarenta selos
 * empatavam em peso com o dado e a tela virava mosaico. A §Hierarquia da issue-mãe
 * fecha isso por escrito — **`--t-rotulo` nunca tem caixa/borda/fundo próprio** —
 * e aqui o rótulo é texto e só.
 *
 * ## Qual degrau, e por que não o da auditoria ao pé da letra
 *
 * A auditoria §2.3 descreve o label como "12px 500 n-700"; a §Hierarquia declara
 * **onze degraus e nada fora deles**, e 12/500 não é nenhum deles (`--t-meta` é
 * 12/400 n-500, `--t-ui` é 13/500 n-900). Onde as duas divergem vence a
 * §Hierarquia — a issue-mãe a nomeia prioridade nº 1 e a régua só é régua se não
 * abrir exceção pelo primeiro meio pixel. Então: label = `.t-ui` na cor n-700
 * (a hierarquia dentro do Inter é **peso e cor**, nunca tamanho, entre 12 e
 * 13.5), ajuda = `.t-meta`, erro = `.t-meta` na tinta `--bad`. A distância
 * label↔ajuda continua legível porque são 500/n-700 contra 400/n-500 — que é
 * exatamente o que a régua manda usar.
 *
 * ## Ajuda e erro ocupam a MESMA linha, e por quê
 *
 * As duas explicam o campo, então competiriam pelo mesmo lugar; mostrar as duas
 * empurraria o campo seguinte para baixo no exato instante em que o operador
 * errou, movendo o alvo do clique dele. **O erro vence a ajuda** enquanto
 * existe: quem já sabe que digitou errado não precisa mais da dica de como
 * digitar.
 *
 * ## A11y — os ids vêm de fora de propósito
 *
 * `idAjuda`/`idErro` são props e não `useId` interno porque o `<FormControl>` do
 * shadcn já monta o `aria-describedby` do input a partir dos ids DELE
 * (`formDescriptionId`/`formMessageId`). Gerar ids próprios aqui produziria dois
 * pares: o input apontaria para ids que não existem e a ajuda ficaria muda para
 * o leitor de tela — verde no teste, silenciosa na vida real. Sem os ids (uso
 * fora de formulário RHF) o componente segue funcionando.
 *
 * O asterisco é `aria-hidden` com um `sr-only` ao lado: `*` sozinho é lido como
 * "asterisco" ou como nada, dependendo do leitor.
 */
export interface CampoProps {
  label: string
  /** Marca `*` e diz "obrigatório" ao leitor de tela. */
  obrigatorio?: boolean
  /** Dica de preenchimento. Sai de cena enquanto houver `erro`. */
  ajuda?: ReactNode
  /** Mensagem de validação. Vence a `ajuda`. */
  erro?: ReactNode
  /** Id do controle, para o `<label htmlFor>`. */
  htmlFor?: string | undefined
  /** Id que o `aria-describedby` do controle já aponta para a ajuda. */
  idAjuda?: string | undefined
  /** Id que o `aria-describedby` do controle já aponta para o erro. */
  idErro?: string | undefined
  className?: string | undefined
  children: ReactNode
}

export function Campo({
  label,
  obrigatorio = false,
  ajuda,
  erro,
  htmlFor,
  idAjuda,
  idErro,
  className,
  children,
}: CampoProps) {
  return (
    <div data-slot="campo" className={cn('flex min-w-0 flex-col gap-[var(--s-1)]', className)}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: o controle é `children` e
          o id vem do chamador — em RHF quem o conhece é o `<FormItem>`. */}
      <label
        data-slot="campo-label"
        className="t-ui [color:var(--n-700)]"
        {...(htmlFor ? { htmlFor } : {})}
      >
        {label}
        {obrigatorio ? (
          <>
            <span aria-hidden="true" className="ml-0.5 [color:var(--bad)]">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        ) : null}
      </label>
      {children}
      {erro ? (
        <p data-slot="campo-erro" id={idErro} role="alert" className="t-meta [color:var(--bad)]">
          {erro}
        </p>
      ) : ajuda ? (
        <p data-slot="campo-ajuda" id={idAjuda} className="t-meta">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}
