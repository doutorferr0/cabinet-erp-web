import type { ModuloCor } from '@/components/cabinet/modulo-cores'
import { cn } from '@/lib/utils'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * FormBlock — o bloco de dados da ficha no desenho 2.0 (D16, issue #484).
 *
 * ## O que mudou, e por quê
 *
 * Até a 1.7 o bloco era um `<fieldset>` com `<legend>` sobre a borda e faixa
 * pastel do módulo: citação do groupbox do SoftLux. Ele resolvia "isto é um
 * grupo" gastando TRÊS ferramentas de separação na mesma fronteira — caixa,
 * faixa colorida e régua —, e a §Hierarquia da issue-mãe passou a proibir isso
 * em uma linha: *"usar a mais barata que resolve; nunca duas na mesma
 * fronteira"*. O 2.0 fica com UMA: o **card quiet** (borda `--n-300` +
 * `--hard-soft`), que é a ferramenta nº 4 e a única que separa objeto do plano.
 *
 * Dentro do card só entram espaço, hairline e tint — nada de card no card
 * (máximo 2 níveis: página › card).
 *
 * O `<fieldset>` FICA. Ele não era decoração: é o que dá papel `group` com nome
 * acessível ao conjunto e, principalmente, é o que faz `<fieldset disabled>` do
 * `CadastroForm` desligar a ficha inteira em modo consulta. Trocar por `<div>`
 * levaria junto o modo Consul. de vinte telas.
 *
 * ## A invariante do obrigatório continua, e continua testada
 *
 * Obrigatório mora em bloco SEMPRE ABERTO, opcional pode morar em bloco
 * recolhido, e **bloco fechado nunca esconde campo obrigatório**. Por isso
 * `obrigatorio` vence `colapsavel` em vez de os dois combinarem: um bloco
 * obrigatório E recolhível seria a promessa de esconder o que trava o Gravar.
 *
 * **O corpo fechado é ESCONDIDO, não desmontado.** Desmontar tiraria os campos
 * do registro do react-hook-form e, com eles, os valores já digitados — abrir e
 * fechar um bloco apagaria o trabalho do operador.
 *
 * ## Carimbo sem caixa
 *
 * "Obrigatório", "Opcional" e o nome do bloco perderam a caixa preta: a régua
 * diz que **`--t-rotulo` nunca tem caixa/borda/fundo próprio**. O que distingue
 * os três agora é o degrau — título em `.t-bloco`, carimbo em `.t-rotulo`,
 * contador em `.t-dado-meta` (é número que se compara: mono, por definição).
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

/**
 * Tint do card, quando o bloco separa por ASSUNTO e não por posição — é o caso
 * dos cards laterais da ficha (identidade lilás · andamento menta · logística
 * céu · financeiro areia). Tint nunca dentro de tint: um bloco tintado não
 * hospeda outro.
 */
export type TintDeBloco = 'lilac' | 'mint' | 'sky' | 'sand' | 'rose'

const TINT: Record<TintDeBloco, string> = {
  lilac: '[background:var(--tint-lilac)] [border-color:var(--indigo-200)]',
  mint: '[background:var(--tint-mint)] [border-color:var(--mint-200)]',
  sky: '[background:var(--tint-sky)] [border-color:var(--sky-200)]',
  sand: '[background:var(--tint-sand)] [border-color:var(--amber-200)]',
  rose: '[background:var(--tint-rose)] [border-color:var(--rose-200)]',
}

export interface FormBlockProps {
  /**
   * Nome do bloco. `titulo` é o nome do 2.0; `legend` continua aceito porque as
   * vinte telas que já montam o bloco o passam assim, e trocar a prop em todas
   * elas seria a issue inteira de outra pessoa.
   */
  titulo?: string
  legend?: string
  /**
   * Peça à direita do título, em `.t-rotulo` (o `up` do mockup): contagem,
   * procedência ("Puxados de PV-21646"), um link. Nunca botão primário — a ação
   * de peso da tela mora no cabeçalho do registro.
   */
  acoes?: React.ReactNode
  /** Separa o bloco por ASSUNTO. Ver `TintDeBloco`. */
  tint?: TintDeBloco
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
   */
  iniciaAberto?: boolean
  /**
   * Módulo a que o bloco pertence. Continua saindo como `data-modulo` no
   * `<fieldset>` — é por ele que o tint de módulo se aplica em CSS, e é o gancho
   * que as telas e os testes já procuram.
   */
  cor?: ModuloCor
  /**
   * O símbolo do bloco, antes do nome, na MESMA tinta do texto — traço nunca
   * veste cor de módulo (regra do user, 2026-08-17).
   */
  icone?: LucideIcon
}

export function FormBlock({
  titulo,
  legend,
  acoes,
  tint,
  className,
  children,
  colapsavel = false,
  obrigatorio = false,
  iniciaAberto = false,
  cor,
  icone: Icone,
}: FormBlockProps) {
  const idCorpo = useId()
  const idTitulo = useId()
  const nome = titulo ?? legend
  // A referência mora no `<fieldset>`, não no corpo: medir a partir do corpo
  // deixaria a invariante do `required` cega no bloco sem cabeçalho.
  const blocoRef = useRef<HTMLFieldSetElement>(null)
  // `obrigatorio` VENCE `colapsavel`: ver a invariante no docstring.
  const podeColapsar = colapsavel && !obrigatorio
  const [aberto, setAberto] = useState(!podeColapsar || iniciaAberto)
  const [contagem, setContagem] = useState<Contagem>({ preenchidos: 0, total: 0 })

  /**
   * Recontagem SEM lista de dependências, de propósito, e a razão é o
   * react-hook-form: campo registrado por `register` é NÃO CONTROLADO, então
   * digitar não re-renderiza ninguém, e `reset()` (carregar um registro) muda o
   * valor sem disparar evento de React. Nenhuma dependência descreveria as duas
   * coisas. `setContagem` devolve o estado ANTERIOR quando os números não
   * mudaram — sem isso, efeito sem deps que chama `set` seria laço infinito.
   */
  useEffect(() => {
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
        `FormBlock${nome ? ` "${nome}"` : ''}: campo obrigatório dentro de bloco que não é \`obrigatorio\`. Campo que trava o Gravar mora em bloco sempre aberto — senão o formulário esconde o que impede de gravar.`,
      )
    }
  })

  const selo = Icone ? (
    <Icone aria-hidden="true" className="size-4 shrink-0 [color:var(--n-500)]" />
  ) : null

  /**
   * O título é `<h3>` E é o nome acessível do grupo — um texto, um papel.
   *
   * A 1.7 tinha `<legend class="sr-only">` com o mesmo texto do rótulo visível,
   * e o visível ia `aria-hidden` para o leitor de tela não dizer o nome duas
   * vezes. Isso resolvia a duplicação escondendo o `<h3>` da árvore de
   * headings — e um heading mudo é o que o `a11y/useHeadingContent` reprova,
   * com razão: um leitor que navega por títulos não acha o bloco.
   *
   * A saída é apontar: `<fieldset aria-labelledby>` para o id do `<h3>`. O
   * grupo continua nomeado (o papel `group` do fieldset vale com
   * `aria-labelledby` como valia com `<legend>`), o heading existe de verdade na
   * árvore, e o texto é dito uma vez só.
   */
  const nomeDoBloco = (
    <h3 id={idTitulo} className="t-bloco min-w-0 flex-1 truncate text-left">
      {nome}
    </h3>
  )

  const carimbos = (
    <>
      {obrigatorio ? (
        <span data-slot="form-block-carimbo" className="t-rotulo shrink-0 [color:var(--bad)]">
          Obrigatório
        </span>
      ) : null}
      {podeColapsar ? (
        <>
          <span data-slot="form-block-carimbo" className="t-rotulo shrink-0">
            Opcional
          </span>
          <span data-slot="form-block-contador" className="t-dado-meta shrink-0">
            {contagem.preenchidos}/{contagem.total}
          </span>
        </>
      ) : null}
    </>
  )

  // O cabeçalho existe quando há o que pôr nele. Bloco sem nome, sem ação e sem
  // gatilho é só a caixa — e é assim que metade das telas o usa.
  const comCabecalho = nome !== undefined || acoes !== undefined || podeColapsar || obrigatorio

  const cabecalho = (
    <>
      {selo}
      {nomeDoBloco}
      {acoes ? (
        <span data-slot="form-block-acoes" className="t-rotulo ml-auto shrink-0">
          {acoes}
        </span>
      ) : null}
      {carimbos}
    </>
  )

  return (
    <fieldset
      ref={blocoRef}
      {...(cor ? { 'data-modulo': cor } : {})}
      {...(nome ? { 'aria-labelledby': idTitulo } : {})}
      data-slot="form-block"
      onChange={podeColapsar ? () => setContagem(medir(blocoRef.current)) : undefined}
      className={cn(
        // Card quiet: a ÚNICA ferramenta de separação desta fronteira.
        'rounded-[var(--r-panel)] border [border-color:var(--n-300)] shadow-[var(--hard-soft)]',
        tint ? TINT[tint] : '[background:var(--n-0)]',
        'p-[var(--s-4)]',
        className,
      )}
    >
      {comCabecalho ? (
        <>
          {/* Sem `<legend>`, e MEDIDO antes de decidir: `<legend>` participa da
              renderização da borda do `<fieldset>` — o browser INTERROMPE o
              traço atrás dele —, então um legend largo fazendo as vezes de
              cabeçalho come a borda de cima e transborda a de lado. Um legend
              `sr-only` ao lado do `<h3>` diria o nome duas vezes. Quem nomeia o
              grupo é o `aria-labelledby` acima. */}
          {podeColapsar ? (
            <button
              type="button"
              aria-expanded={aberto}
              aria-controls={idCorpo}
              aria-label={nome ?? 'Expandir bloco'}
              onClick={() => setAberto((estava) => !estava)}
              className="flex w-full cursor-pointer items-center gap-[var(--s-2)] focus-visible:focus-ring-inset"
            >
              {cabecalho}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0 [color:var(--n-500)] transition-transform',
                  aberto && 'rotate-180',
                )}
              />
            </button>
          ) : (
            <div className="flex items-center gap-[var(--s-2)]">{cabecalho}</div>
          )}
        </>
      ) : null}
      {comCabecalho ? (
        // Espaço entre cabeçalho e corpo — NÃO hairline. A régua manda usar a
        // ferramenta mais barata que resolve, e aqui o título já está a um
        // degrau tipográfico de distância do dado.
        <div
          id={idCorpo}
          {...(podeColapsar && !aberto ? { hidden: true } : {})}
          className="mt-[var(--s-3)]"
        >
          {children}
        </div>
      ) : (
        // SEM cabeçalho não há embrulho, e não é economia de nó: as telas de
        // hoje passam layout no `className` do bloco (`flex flex-col gap-3` em
        // `profissional-form`), contando que os filhos sejam filhos DIRETOS do
        // `<fieldset>`. Um `<div>` no meio faria o flex governar o embrulho e
        // não os campos — as telas mudariam de layout de graça.
        children
      )}
    </fieldset>
  )
}
