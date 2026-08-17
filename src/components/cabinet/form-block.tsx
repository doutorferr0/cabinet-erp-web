import { type ModuloCor, classeDaTintaDaFaixa } from '@/components/cabinet/modulo-cores'
import { cn } from '@/lib/utils'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * FormBlock — a forma-assinatura do agrupamento em formulário (DESIGN.md
 * §Shapes): `<fieldset>` + `<legend>` sobre a borda superior, citação direta
 * do groupbox do SoftLux. Compartimento fechado: borda em Régua, canto 4px,
 * goteira interna de 12px. O `<legend>` usa Meta (mono, caixa alta pequena)
 * — é o rótulo de compartimento, não um subtítulo.
 *
 * `legend` é opcional porque a transcrição registra molduras sem nome (§2,
 * "Bloco separado por moldura"). Compartimento sem legenda continua sendo
 * compartimento: a caixa é o agrupamento, a legenda só o nomeia.
 *
 * Blocos irmãos NUNCA compartilham parede — cada um tem caixa própria e são
 * separados por goteira de 12px (`{spacing.md}`). Parede compartilhada é
 * gramática de grade, não de compartimento.
 *
 * **Fundo afundado (1.6):** o compartimento é quase-branco, não branco. A folha
 * virou branca nesta fase e com isso caixa dentro de caixa passou a se separar
 * só pelo traço; meio grau de luz devolve o degrau sem gastar cor. E é degrau,
 * não zona: quem tem cor de verdade aqui é o bloco cujo CONTEÚDO tem dono
 * (valor, identidade, pendência), e esse recebe a zona por cima desta classe.
 *
 * ## HIERARQUIA (issue #99, mockup aprovado pelo user em 2026-08-14)
 *
 * Até aqui o bloco era MOLDURA, não hierarquia: o cadastro despejava 40 campos
 * de uma vez sem dizer o que é obrigatório e o que é enfeite. As três
 * propriedades novas — `colapsavel`, `obrigatorio` e `cor` — existem para o
 * operador saber, sem ler, o que precisa preencher para gravar.
 *
 * **A invariante, e ela é testada:** obrigatório mora em bloco SEMPRE ABERTO,
 * opcional pode morar em bloco recolhido, e **bloco fechado nunca esconde campo
 * obrigatório**. Por isso `obrigatorio` vence `colapsavel` em vez de os dois
 * combinarem: um bloco que é obrigatório E recolhível seria a promessa de
 * esconder o que trava o Gravar.
 *
 * **O corpo fechado é ESCONDIDO, não desmontado.** Desmontar tiraria os campos
 * do registro do react-hook-form e, com eles, os valores já digitados — abrir e
 * fechar um bloco apagaria o trabalho do operador. `hidden` mantém o campo no
 * DOM (e no form) e fora do alcance do foco, que é o que a gramática de
 * disclosure pede.
 *
 * A propriedade nova é OPT-IN: sem nenhuma delas o bloco renderiza exatamente
 * como sempre renderizou, e as vinte e tantas telas que já o usam não mudam.
 */

/** Controles que GUARDAM valor. Botão, checkbox e radio ficam de fora: neles
 *  "preenchido" não é uma pergunta com resposta — o contador conta campo. */
const CAMPOS_COM_VALOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea'

interface Contagem {
  preenchidos: number
  total: number
}

function medir(raiz: HTMLElement | null): Contagem {
  if (!raiz) return { preenchidos: 0, total: 0 }
  const campos = [...raiz.querySelectorAll<HTMLInputElement>(CAMPOS_COM_VALOR)]
  return {
    preenchidos: campos.filter((campo) => campo.value.trim() !== '').length,
    total: campos.length,
  }
}

function temCampoObrigatorio(raiz: HTMLElement | null): boolean {
  return !!raiz?.querySelector('[required], [aria-required="true"]')
}

export interface FormBlockProps {
  legend?: string
  className?: string
  children: React.ReactNode
  /**
   * Recolhe e expande. Nasce FECHADO — o bloco recolhível é, por definição, o
   * que o operador pode deixar para depois. Ignorado quando `obrigatorio`.
   */
  colapsavel?: boolean
  /**
   * Bloco que trava o Gravar: nunca colapsa, carimba `Obrigatório`, e é o
   * ÚNICO lugar em que um campo `required` pode viver. Em desenvolvimento, um
   * campo obrigatório fora daqui derruba o render com mensagem — é invariante,
   * não sugestão.
   */
  obrigatorio?: boolean
  /**
   * Nasce ABERTO, mesmo sendo `colapsavel`. É o que o lápis da ficha aciona
   * (issue #103): abrir a edição de UM módulo, e não o formulário inteiro com o
   * bloco procurado ainda fechado.
   *
   * Só o estado INICIAL — depois disso quem manda é o gatilho. Prender o bloco
   * ao search param faria o botão parar de funcionar enquanto a URL não mudasse.
   */
  iniciaAberto?: boolean
  /**
   * Veste a cor de um módulo: faixa de cabeçalho na cheia `/01`, corpo na
   * pastel `/02`. Quem resolve o par é o `[data-modulo]` do `index.css`; aqui
   * só se diz QUAL. Ver `modulo-cores.ts` para a tinta da faixa, que é medida.
   */
  cor?: ModuloCor
  /**
   * O símbolo do bloco, pousado na faixa antes do nome, na MESMA tinta preta
   * do texto — traço nunca veste cor de módulo (regra do user, 2026-08-17).
   * Quem escolhe o símbolo é `modulo-icones.ts`, por id de módulo.
   */
  icone?: LucideIcon
}

export function FormBlock({
  legend,
  className,
  children,
  colapsavel = false,
  obrigatorio = false,
  iniciaAberto = false,
  cor,
  icone: Icone,
}: FormBlockProps) {
  const idCorpo = useId()
  // A referência mora no `<fieldset>`, não no corpo: o bloco SEM cabeçalho não
  // tem corpo embrulhado, e é justamente o formato das vinte telas de hoje —
  // medir a partir do corpo deixaria a invariante do `required` cega nelas.
  const blocoRef = useRef<HTMLFieldSetElement>(null)
  // `obrigatorio` VENCE `colapsavel`: ver a invariante no docstring.
  const podeColapsar = colapsavel && !obrigatorio
  const [aberto, setAberto] = useState(!podeColapsar || iniciaAberto)
  const [contagem, setContagem] = useState<Contagem>({ preenchidos: 0, total: 0 })

  // O bloco com cabeçalho de verdade — faixa, carimbo, contador, gatilho.
  // Sem nenhuma das propriedades novas, cai no compartimento de sempre.
  const comCabecalho = podeColapsar || obrigatorio || cor !== undefined

  /**
   * Recontagem SEM lista de dependências, de propósito, e a razão é o
   * react-hook-form: campo registrado por `register` é NÃO CONTROLADO, então
   * digitar não re-renderiza ninguém, e `reset()` (carregar um registro) muda o
   * valor sem disparar evento de React. Nenhuma dependência descreveria as
   * duas coisas. Rodar a cada render cobre `reset` e re-render; o `onChange` no
   * `<fieldset>` cobre a digitação. `setContagem` devolve o estado ANTERIOR
   * quando os números não mudaram — sem isso, efeito sem deps que chama `set`
   * seria laço infinito.
   */
  useEffect(() => {
    // Só quem MOSTRA contador conta. Sem esta guarda, as vinte telas que usam o
    // bloco simples pagariam um `querySelectorAll` por render para alimentar um
    // número que ninguém desenha.
    if (podeColapsar) {
      const proxima = medir(blocoRef.current)
      setContagem((atual) =>
        atual.preenchidos === proxima.preenchidos && atual.total === proxima.total
          ? atual
          : proxima,
      )
    }

    if (import.meta.env.DEV && !obrigatorio && temCampoObrigatorio(blocoRef.current)) {
      throw new Error(
        `FormBlock${legend ? ` "${legend}"` : ''}: campo obrigatório dentro de bloco que não é \`obrigatorio\`. Campo que trava o Gravar mora em bloco sempre aberto — senão o formulário esconde o que impede de gravar.`,
      )
    }
  })

  const faixa = cn(
    'flex w-full items-center gap-2 px-3 py-2 text-left',
    cor ? cn('bg-modulo-cheia', classeDaTintaDaFaixa(cor)) : 'bg-surface-sunken text-text-strong',
    // Régua entre faixa e corpo só com o bloco aberto — fechado, a faixa É o
    // bloco inteiro e uma linha embaixo dela penduraria no vazio. A separação é
    // por ESPESSURA, nunca por cor: utility de cor de borda não vale neste repo
    // (DESIGN.md §Medição, pendência 6).
    aberto && 'border-b-2',
  )

  // Regra do user (2026-08-17): traço é SEMPRE preto — cor só em preenchimento.
  // O ícone herda a tinta da faixa (preta em todos os módulos) em vez de vestir
  // a /01; o quadrado-selo saiu junto: na faixa clara ele só somava moldura.
  const selo = Icone ? <Icone aria-hidden="true" className="size-4 shrink-0" /> : null

  const nomeDaFaixa = (
    // `aria-hidden`: o mesmo texto já é o `<legend>` do compartimento e o
    // `aria-label` do gatilho. Sem isto o leitor de tela diria o nome três
    // vezes ao entrar no bloco.
    <span
      aria-hidden="true"
      className="min-w-0 flex-1 truncate font-bold font-mono text-[0.75rem] uppercase tracking-[0.06em]"
    >
      {legend}
    </span>
  )

  const carimbos = (
    <>
      {obrigatorio ? (
        <span className="shrink-0 border-2 bg-destructive px-2 py-0.5 font-bold font-mono text-[0.625rem] text-destructive-foreground uppercase tracking-[0.08em]">
          Obrigatório
        </span>
      ) : null}
      {podeColapsar ? (
        <>
          <span className="shrink-0 border-2 bg-card px-2 py-0.5 font-bold font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.08em]">
            Opcional
          </span>
          {/* Verde de PREENCHIMENTO (`fill-money`), não a tinta `--money`: é
              fundo, e o `fill-*` é o único verde que desce de luz no escuro e
              sobrevive à inversão da tinta (DESIGN.md §Medição). */}
          <span
            data-slot="form-block-contador"
            className={cn(
              'shrink-0 border-2 px-2 py-0.5 font-bold font-mono text-[0.6875rem] text-foreground tabular-nums',
              contagem.preenchidos > 0 ? 'bg-fill-money' : 'bg-card',
            )}
          >
            {contagem.preenchidos}/{contagem.total}
          </span>
        </>
      ) : null}
    </>
  )

  return (
    <fieldset
      ref={blocoRef}
      {...(cor ? { 'data-modulo': cor } : {})}
      data-slot="form-block"
      onChange={podeColapsar ? () => setContagem(medir(blocoRef.current)) : undefined}
      className={cn(
        'rounded-lg border',
        comCabecalho ? 'overflow-hidden' : 'bg-surface-sunken p-3',
        className,
      )}
    >
      {comCabecalho ? (
        <>
          {/* O `<legend>` continua sendo o nome do compartimento — e fica FORA
              da faixa, escondido só visualmente. MEDIDO em Chrome antes de
              decidir: `<legend>` participa da renderização da borda do
              `<fieldset>` (o browser INTERROMPE o traço atrás dele), então um
              legend `w-full` fazendo as vezes de faixa come a borda de cima e
              transborda a de lado — nos dois temas, com e sem
              `overflow-hidden`. Quatro variantes fotografadas; as duas que
              mantêm a caixa inteira são as que NÃO usam o legend como faixa.
              Aqui o compartimento continua nomeado por `<legend>` de verdade
              (role `group` com nome acessível), e a faixa é peça visual. */}
          {legend ? <legend className="sr-only">{legend}</legend> : null}
          {podeColapsar ? (
            <button
              type="button"
              aria-expanded={aberto}
              aria-controls={idCorpo}
              aria-label={legend ?? 'Expandir bloco'}
              onClick={() => setAberto((estava) => !estava)}
              className={cn(faixa, 'cursor-pointer focus-visible:focus-ring-inset')}
            >
              {selo}
              {nomeDaFaixa}
              {carimbos}
              <ChevronDown
                aria-hidden="true"
                className={cn('size-4 shrink-0 transition-transform', aberto && 'rotate-180')}
              />
            </button>
          ) : (
            <div className={faixa}>
              {selo}
              {nomeDaFaixa}
              {carimbos}
            </div>
          )}
        </>
      ) : legend ? (
        <legend className="px-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-text-strong">
          {legend}
        </legend>
      ) : null}
      {comCabecalho ? (
        <div
          id={idCorpo}
          {...(podeColapsar && !aberto ? { hidden: true } : {})}
          className={cn('p-3', cor && 'bg-modulo')}
        >
          {children}
        </div>
      ) : (
        // SEM cabeçalho não há embrulho, e não é economia de nó: as telas de
        // hoje passam layout no `className` do bloco (`flex flex-col gap-3` em
        // `profissional-form`), contando que os filhos sejam filhos DIRETOS do
        // `<fieldset>`. Um `<div>` no meio faria o flex governar o embrulho e
        // não os campos — as vinte telas mudariam de layout de graça.
        children
      )}
    </fieldset>
  )
}
