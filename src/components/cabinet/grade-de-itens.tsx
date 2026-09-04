import { VitraDataTable } from '@/components/cabinet/data-table'
import { totalItemCentavos } from '@/components/cabinet/documento'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { bindShortcut } from '@/lib/shortcuts'
import type { TableFetcher } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'

/**
 * GRADE DE ITENS do documento — Reface 2.0, D17 (issue #485).
 *
 * **Por que não é a `FormGrid`.** A `FormGrid` é a grade genérica do
 * formulário e tem NOVE consumidores (contatos do parceiro, faixas de
 * comissão, participação, funil, serviços do orçamento, variantes do
 * produto…). O que a D17 pede é a anatomia do DOCUMENTO — código, descrição
 * com subtítulo, quantidade, unitário, total e o bloco `Totais` — e ela não
 * cabe nas outras nove sem transformar cada coluna em opção. Re-skinar a
 * `FormGrid` mudaria a cara de nove telas que ninguém pediu para mudar; a
 * grade do documento vira componente próprio e a `FormGrid` fica de pé.
 *
 * **A convenção de `aria-label` é a MESMA** (`<rótulo> linha <n>`): as telas de
 * orçamento, pedido de venda, pedido de compra e ordem de compra já têm suíte
 * escrita contra ela, e trocar o nome do campo por causa de um reface seria
 * quebrar teste que fala de comportamento, não de aparência.
 *
 * **Os tokens 2.0 (D1, #469) ainda não existem** — esta PR sai antes daquela
 * mergear. O mapeamento aplicado, para a troca ser mecânica quando os
 * `--n-*`/`--t-*` chegarem, está em `PAPEL`, logo abaixo.
 */

/* ------------------------------------------------------------------ *
 * §Hierarquia — os quatro papéis de tipo desta grade, num lugar só.
 *
 * As classes vêm de `src/styles/tokens-2.0.css` e são as ÚNICAS admitidas:
 * a régua da rodada (issue-mãe #469) proíbe `font-size` literal em
 * componente, e é por isso que aqui não há `text-sm`, `text-xs` nem
 * `text-[…]` — cada papel aponta para o degrau que a escala já nomeia.
 * ------------------------------------------------------------------ */
const PAPEL = {
  /** `--t-rotulo`: cabeçalho de coluna e rótulo do bloco de totais. */
  rotulo: 't-rotulo',
  /** `--t-corpo`: texto de leitura da célula. */
  corpo: 't-corpo',
  /** `--t-meta`: o subtítulo que acompanha a descrição. */
  meta: 't-meta',
  /** `--t-dado`: id, quantidade, valor — tudo que se copia, compara ou soma. */
  dado: 't-dado',
  /** `--t-dado-meta`: a contagem e o eco, um degrau abaixo do dado. */
  dadoMeta: 't-dado-meta',
  /** `--t-ui`: botão e ação — a voz de quem faz, não de quem lê. */
  ui: 't-ui',
} as const

/**
 * A CÉLULA INVISÍVEL ATÉ O HOVER (mockup: Formulário › Itens).
 *
 * Em repouso a linha se lê como extrato: sem borda, sem fundo, sem nada que
 * diga "campo". No hover e no foco a célula assume a cara de campo — borda
 * `n-300` (hoje `--rule-hair`) sobre a folha. É o inverso da grade 1.x, que
 * desenhava dez caixas de campo por linha e fazia o operador ler moldura antes
 * de ler dado.
 *
 * **O gatilho é a LINHA, não a célula** (`group-hover`, mockup
 * `.items tr:hover .in`). A diferença não é estética: com o hover por célula, o
 * operador que passa o mouse pela linha vê UMA caixa acender e apagar a cada
 * coluna, e a linha pisca em vez de se oferecer. Acendendo por linha, o gesto
 * é "esta linha é editável" — que é a informação verdadeira.
 *
 * O anel de foco continua: o `hover` some quando o cursor sai, e sem o anel a
 * célula em edição por teclado ficaria sem sinal nenhum.
 */
const CELULA_EDITAVEL = cn(
  'h-7 w-full rounded-control border border-transparent bg-transparent px-2 outline-none transition-colors',
  'group-hover/linha:border-rule-hair group-hover/linha:bg-card',
  'focus:border-rule-hair focus:bg-card',
  'focus-visible:focus-ring-inset',
  'placeholder:text-muted-foreground',
)

export type LinhaDaGrade = Record<string, string | number | boolean | null | undefined>

/**
 * O papel da célula na anatomia do documento.
 *
 * `codigo` e `descricao` são papéis, não tipos de dado: os dois guardam texto,
 * e o que os separa é que o código se COPIA (mono, tinta de acento) e a
 * descrição se LÊ (corpo, com subtítulo opcional embaixo).
 */
export type PapelDaCelula =
  | 'texto'
  | 'codigo'
  | 'descricao'
  | 'quantidade'
  | 'money'
  | 'percent'
  | 'select'
  | 'calculada'

export interface ColunaDaGrade {
  /** Nome do campo dentro da linha do array do RHF. */
  key: string
  rotulo: string
  papel?: PapelDaCelula
  placeholder?: string
  /** Só em `select`. */
  opcoes?: readonly string[]
  /** Só em `calculada`: o texto derivado da linha (não vive no form state). */
  calcular?: (linha: LinhaDaGrade) => string
  /**
   * Só em `descricao`: a chave do SUBTÍTULO, na linha de baixo em `--t-meta`.
   * É o que deixa a grade mostrar acabamento, tamanho ou origem sem gastar uma
   * coluna por campo — a largura que o mockup devolve à descrição.
   */
  subtituloKey?: string
}

/** Uma parcela do bloco `Totais` entre o subtotal e o total. */
export interface AjusteDoTotal {
  rotulo: string
  valorCentavos: number
  /** `-1` subtrai (desconto), `1` soma (acréscimo, frete). */
  sinal: 1 | -1
}

/**
 * SOMA DO DOCUMENTO, em INTEIRO do começo ao fim (CLAUDE.md §Convenções).
 *
 * Recebe os totais de linha já calculados — a regra de "quanto vale a linha" é
 * do documento (a ordem de compra multiplica custo; o orçamento ainda desconta
 * o percentual da linha), a de "quanto vale o documento" é daqui.
 *
 * Nenhuma divisão e nenhum `toFixed` no caminho: o valor sai como entrou,
 * centavo por centavo, e só a borda de exibição formata.
 */
export function totaisEmCentavos(
  totaisDeLinha: readonly number[],
  ajustes: readonly AjusteDoTotal[] = [],
): { subtotalCentavos: number; totalCentavos: number } {
  const subtotalCentavos = totaisDeLinha.reduce((soma, valor) => soma + valor, 0)
  const totalCentavos = ajustes.reduce(
    (soma, ajuste) => soma + ajuste.sinal * ajuste.valorCentavos,
    subtotalCentavos,
  )
  return { subtotalCentavos, totalCentavos }
}

export interface TotaisDaGrade {
  /**
   * Quanto vale UMA linha, em centavos. Padrão: `totalItemCentavos`
   * (quantidade × unitário − desconto da linha), a mesma conta que o orçamento
   * e o pedido de venda já usam.
   */
  totalDaLinha?: (linha: LinhaDaGrade) => number
  ajustes?: readonly AjusteDoTotal[]
  /** O fecho é o total DESTE documento — "Total da ordem", "Total do pedido". */
  rotuloDoTotal?: string
}

/**
 * Uma origem de linhas no rodapé — `Do estoque`, `De pedidos`.
 *
 * Recebe o `adicionar` da grade e devolve o gatilho MAIS a folha. Fica assim, e
 * não como uma lista de configuração, porque cada origem busca um recurso de
 * tipo próprio (`ProductDto`, `PedidoDeCompra`…): uma lista tipada
 * uniformemente exigiria apagar o tipo na fronteira e devolvê-lo por asserção
 * dentro de cada `onSelect`. Com o fecho, cada tela compõe
 * `<FonteEmFolha<ProductDto>>` e o tipo atravessa inteiro.
 */
export interface FonteDeItens {
  id: string
  render: (adicionar: (linhas: LinhaDaGrade[]) => void) => React.ReactNode
}

export interface GradeDeItensProps {
  /** Nome do array no form (RHF `useFieldArray`). */
  name: string
  colunas: readonly ColunaDaGrade[]
  /** Valores da linha nova em `+ Adicionar item`. */
  linhaNova: LinhaDaGrade
  /** Origens do rodapé, além do `+ Adicionar item`. */
  fontes?: readonly FonteDeItens[]
  totais?: TotaisDaGrade
  /**
   * Chamado a cada edição de célula, inclusão e remoção.
   *
   * É o gancho do AUTOSAVE da D15 (#483): a grade não sabe gravar e não deve
   * saber — quem decide se grava, quando e com que espera é o cabeçalho do
   * registro. Enquanto a D15 não mergeia, a prop fica opcional e a grade se
   * comporta como sempre.
   */
  aoAlterar?: () => void
  /** Esconde `+ Adicionar item` — a tela que só admite linha vinda de origem. */
  semAdicionar?: boolean
  vazio?: string
}

/**
 * FOLHA DE BUSCA de uma origem (mockup: `Do estoque` e `De pedidos` abrem
 * `Sheet`, não `Dialog`).
 *
 * A tabela de dentro é a MESMA `VitraDataTable` das listagens — padrão 5 da
 * transcrição ("Janela de busca contendo a MESMA DataTable"). O que muda em
 * relação ao `SearchDialog` é o continente: gaveta em vez de diálogo, porque a
 * escolha de item é repetida (o operador traz cinco produtos seguidos) e o
 * diálogo modal centralizado cobre justamente a grade que ele está enchendo.
 */
export function FonteEmFolha<T>({
  rotulo,
  titulo,
  descricao,
  icone,
  colunas,
  queryKey,
  fetcher,
  paraLinhas,
  adicionar,
  atalho,
  primaria,
}: {
  rotulo: string
  titulo: string
  descricao: string
  icone?: React.ReactNode
  colunas: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  /** A linha escolhida vira uma ou mais linhas da grade. */
  paraLinhas: (escolhida: T) => LinhaDaGrade[]
  adicionar: (linhas: LinhaDaGrade[]) => void
  /**
   * O atalho que já abria esta busca antes do reface (`Alt+P` e companhia).
   *
   * Existe porque a tecla é CONVENIÊNCIA e não requisito (CLAUDE.md
   * §Atalhos): o rodapé abre a folha por clique, e quem já tinha o dedo na
   * tecla não a perde numa rodada de design. Mudar o continente de diálogo
   * para gaveta não é motivo para tirar o gancho de ninguém.
   */
  atalho?: string
  /** A origem que é o caminho padrão do documento ganha a caixa. */
  primaria?: boolean
}) {
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    if (!atalho) return
    return bindShortcut(atalho, () => setAberta(true))
  }, [atalho])

  return (
    <>
      <AcaoDoRodape {...(primaria && { primaria })} onClick={() => setAberta(true)}>
        {icone}
        {rotulo}
      </AcaoDoRodape>
      {aberta ? (
        <Sheet
          isOpen={aberta}
          onOpenChange={setAberta}
          side="right"
          className="data-[side=right]:sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>{titulo}</SheetTitle>
            <SheetDescription>{descricao}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            <VitraDataTable
              columns={colunas}
              queryKey={queryKey}
              fetcher={fetcher}
              actions={[
                {
                  id: 'trazer',
                  label: 'Trazer para a grade',
                  variant: 'default',
                  needsSelection: true,
                  onClick: (linha) => {
                    if (!linha) return
                    adicionar(paraLinhas(linha))
                    setAberta(false)
                  },
                },
              ]}
            />
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

/**
 * Ação do rodapé tracejado.
 *
 * **A hierarquia entre as três é do mockup, e é intencional:** `+ Adicionar
 * item` tem caixa (`outline`) porque é a ação que sempre cabe; `Do estoque` e
 * `De pedidos` são fantasmas ao lado dela porque são atalhos, não o caminho
 * padrão. Três botões de mesmo peso fariam o operador escolher onde não há
 * escolha a fazer.
 *
 * A issue escreve as três separadas por `·`; o mockup as separa por espaço
 * (`.addrow{gap:8px}`) e a régua da rodada manda usar a ferramenta mais barata
 * que resolve — com pesos diferentes, o espaço já resolve, e o ponto viraria
 * uma segunda marca na mesma fronteira. Vale o mockup.
 */
export function AcaoDoRodape({
  onClick,
  children,
  primaria,
}: {
  onClick: () => void
  children: React.ReactNode
  primaria?: boolean
}) {
  return (
    <Button
      type="button"
      variant={primaria ? 'outline' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-7 gap-1.5 px-2',
        // `--t-ui` é o degrau do BOTÃO (§Hierarquia). `--t-corpo` é texto de
        // leitura e deixaria a ação com a mesma voz da célula ao lado dela.
        PAPEL.ui,
        // `!` pelo mesmo motivo do fecho: `t-ui` traz `color: n-900` fora de
        // camada e apagaria o recuo da origem, deixando as três ações do
        // rodapé com o mesmo peso de tinta.
        primaria ? null : 'border-0 text-muted-foreground! hover:text-foreground!',
      )}
    >
      {children}
    </Button>
  )
}

function CelulaCalculada({
  linhaName,
  ariaLabel,
  calcular,
}: {
  linhaName: string
  ariaLabel: string
  calcular: (linha: LinhaDaGrade) => string
}) {
  const linha = useWatch({ name: linhaName }) as LinhaDaGrade | undefined
  return (
    <output aria-label={ariaLabel} className={cn('block px-2 text-right', PAPEL.dado)}>
      {calcular(linha ?? {})}
    </output>
  )
}

function CelulaMoney({
  name,
  ariaLabel,
  aoAlterar,
}: {
  name: string
  ariaLabel: string
  aoAlterar?: () => void
}) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <input
          aria-label={ariaLabel}
          inputMode="decimal"
          className={cn(CELULA_EDITAVEL, PAPEL.dado, 'text-right')}
          value={
            typeof field.value === 'number' ? (field.value / 100).toFixed(2).replace('.', ',') : ''
          }
          onChange={(e) => {
            // O operador digita dígitos; o estado guarda CENTAVOS inteiros. É a
            // razão de a célula ser controlada e não `register`: sem a
            // conversão, "10,00" viraria a string "10,00" no submit.
            const digitos = e.target.value.replace(/\D/g, '')
            field.onChange(digitos === '' ? null : Number(digitos))
            aoAlterar?.()
          }}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      )}
    />
  )
}

function CelulaPercent({
  name,
  ariaLabel,
  aoAlterar,
}: {
  name: string
  ariaLabel: string
  aoAlterar?: () => void
}) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <input
          aria-label={ariaLabel}
          inputMode="decimal"
          className={cn(CELULA_EDITAVEL, PAPEL.dado, 'text-right')}
          value={typeof field.value === 'number' ? formatPercent(field.value) : ''}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '')
            field.onChange(digitos === '' ? null : Number(digitos))
            aoAlterar?.()
          }}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      )}
    />
  )
}

function CelulaSelect({
  name,
  ariaLabel,
  opcoes,
  aoAlterar,
}: {
  name: string
  ariaLabel: string
  opcoes: readonly string[]
  aoAlterar?: () => void
}) {
  return (
    <Controller
      name={name}
      render={({ field }) => {
        // O valor da linha entra na lista quando não está nela — item
        // desativado depois de gravado, ou lista de apoio que não carregou. Sem
        // isto a célula abriria em branco e a gravação seguinte apagaria o
        // valor sem ninguém pedir.
        const atual = typeof field.value === 'string' ? field.value : ''
        const lista = atual && !opcoes.includes(atual) ? [atual, ...opcoes] : opcoes
        return (
          <select
            aria-label={ariaLabel}
            className={cn(CELULA_EDITAVEL, PAPEL.corpo)}
            value={atual}
            onChange={(e) => {
              field.onChange(e.target.value || null)
              aoAlterar?.()
            }}
            onBlur={field.onBlur}
          >
            <option value="">—</option>
            {lista.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )
      }}
    />
  )
}

/**
 * Descrição com SUBTÍTULO: o campo editável em cima, o eco em `--t-meta`
 * embaixo. O subtítulo não é campo — é o que a linha já sabe (acabamento,
 * tamanho, origem) mostrado sem gastar coluna.
 */
function CelulaDescricao({
  name,
  ariaLabel,
  placeholder,
  subtituloName,
  aoAlterar,
}: {
  name: string
  ariaLabel: string
  placeholder?: string | undefined
  subtituloName: string | null
  aoAlterar?: () => void
}) {
  const { register } = useFormContext()
  const subtitulo = useWatch({ name: subtituloName ?? name, disabled: subtituloName === null }) as
    | string
    | null
    | undefined
  const registro = register(name)

  return (
    <div className="flex flex-col">
      <input
        aria-label={ariaLabel}
        {...(placeholder !== undefined && { placeholder })}
        className={cn(CELULA_EDITAVEL, PAPEL.corpo)}
        {...registro}
        onChange={(e) => {
          void registro.onChange(e)
          aoAlterar?.()
        }}
      />
      {subtituloName && subtitulo ? (
        <span className={cn(PAPEL.meta, 'truncate px-2')}>{String(subtitulo)}</span>
      ) : null}
    </div>
  )
}

function LinhaDeTotal({
  rotulo,
  valorCentavos,
  fecho,
}: {
  rotulo: string
  valorCentavos: number
  fecho?: boolean
}) {
  return (
    <>
      <span
        className={cn('text-right', fecho ? PAPEL.corpo : PAPEL.meta, fecho && 'font-semibold')}
      >
        {rotulo}
      </span>
      <output
        // O nome acessível do FECHO é `Total`, e não o rótulo visível.
        // Quem lê a tela precisa do contexto ("Total da ordem"); quem procura
        // o dado — leitor de tela e teste de comportamento — procura o total.
        // Prender os dois no mesmo texto faria toda tela que renomeia o fecho
        // quebrar teste que não fala de aparência nenhuma.
        aria-label={fecho ? 'Total' : rotulo}
        className={cn(
          PAPEL.dado,
          'text-right',
          fecho && 'font-semibold',
          // O `!` não é gosto: `tokens-2.0.css` entra por `@import` DEPOIS do
          // Tailwind e declara o `color` das `.t-*` fora de `@layer`, então
          // `t-dado` (n-900) vence `text-money` por mais específico que o
          // utilitário seja. Sem isto o fecho sai em tinta preta e o teste
          // passa mesmo assim — o DOM tem a classe certa, quem não pinta é a
          // cascata. Sai no dia em que as `.t-*` forem para `@layer
          // components` (decisão da D1/D30, registrada na #469).
          valorCentavos < 0 ? 'text-destructive!' : fecho ? 'text-money!' : 'text-foreground!',
        )}
        // O FECHO tem 16px e a escala `--t-*` para em 12.5 no dado: não há
        // degrau para ele. A régua da rodada manda, para token que falta,
        // consumir `var(--x, <fallback>)` e pedir o degrau na #469 — é o que
        // esta linha faz, e não um `text-[16px]` que ninguém conseguiria
        // trocar depois. O `--t-dado` continua dando família, peso tabular e
        // entrelinha; só o tamanho vem de fora.
        {...(fecho && { style: { fontSize: 'var(--t-total-documento, 16px)' } })}
      >
        {formatMoneyBRL(valorCentavos)}
      </output>
    </>
  )
}

/**
 * BLOCO `Totais` — o extrato do documento, no PÉ DO CARD (mockup: Ramp).
 *
 * **Fica dentro do card e não como card próprio.** A §Hierarquia admite dois
 * níveis de card (página › card) e nada além; um terceiro pano em volta dos
 * totais seria o nível proibido, e a fronteira "itens acabam, conta começa"
 * não precisa de tanto: o TINT (`n-50`) é a terceira ferramenta e a mais
 * barata que resolve. Por isso também não há borda em cima do bloco — tint e
 * hairline na mesma fronteira seriam duas ferramentas onde cabe uma.
 *
 * Fora da MALHA da tabela, porém: alinhar um fecho de 16px sob uma coluna de
 * 12.5 quebra o alinhamento por tamanho antes de qualquer questão de fonte.
 * O grid próprio (`rótulo | valor`, encostado à direita) devolve ao total a
 * régua que ele precisa e não deve alinhamento a coluna nenhuma.
 */
function BlocoDeTotais({
  subtotalCentavos,
  ajustes = [],
  totalCentavos,
  rotuloDoTotal = 'Total',
}: {
  subtotalCentavos: number
  ajustes?: readonly AjusteDoTotal[]
  totalCentavos: number
  rotuloDoTotal?: string
}) {
  return (
    <div
      data-slot="grade-de-itens-totais"
      className="grid justify-end gap-x-6 gap-y-1.5 bg-surface-sunken px-4 py-3"
      style={{ gridTemplateColumns: 'auto minmax(6.5rem, auto)' }}
    >
      <LinhaDeTotal rotulo="Subtotal" valorCentavos={subtotalCentavos} />
      {ajustes.map((ajuste) => (
        <LinhaDeTotal
          key={ajuste.rotulo}
          rotulo={ajuste.rotulo}
          valorCentavos={ajuste.sinal * ajuste.valorCentavos}
        />
      ))}
      <LinhaDeTotal rotulo={rotuloDoTotal} valorCentavos={totalCentavos} fecho />
    </div>
  )
}

function alinhaADireita(coluna: ColunaDaGrade): boolean {
  return (
    coluna.papel === 'quantidade' ||
    coluna.papel === 'money' ||
    coluna.papel === 'percent' ||
    coluna.papel === 'calculada'
  )
}

function Celula({
  coluna,
  caminho,
  linhaName,
  subtituloName,
  ariaLabel,
  register,
  aoAlterar,
}: {
  coluna: ColunaDaGrade
  caminho: string
  linhaName: string
  subtituloName: string | null
  ariaLabel: string
  register: ReturnType<typeof useFormContext>['register']
  aoAlterar?: () => void
}) {
  if (coluna.papel === 'calculada') {
    return (
      <CelulaCalculada
        linhaName={linhaName}
        ariaLabel={ariaLabel}
        calcular={coluna.calcular ?? (() => '')}
      />
    )
  }
  if (coluna.papel === 'money') {
    return <CelulaMoney name={caminho} ariaLabel={ariaLabel} {...(aoAlterar && { aoAlterar })} />
  }
  if (coluna.papel === 'percent') {
    return <CelulaPercent name={caminho} ariaLabel={ariaLabel} {...(aoAlterar && { aoAlterar })} />
  }
  if (coluna.papel === 'select') {
    return (
      <CelulaSelect
        name={caminho}
        ariaLabel={ariaLabel}
        opcoes={coluna.opcoes ?? []}
        {...(aoAlterar && { aoAlterar })}
      />
    )
  }
  if (coluna.papel === 'descricao') {
    return (
      <CelulaDescricao
        name={caminho}
        ariaLabel={ariaLabel}
        {...(coluna.placeholder !== undefined && { placeholder: coluna.placeholder })}
        subtituloName={subtituloName}
        {...(aoAlterar && { aoAlterar })}
      />
    )
  }

  const registro = register(caminho)
  return (
    <input
      aria-label={ariaLabel}
      {...(coluna.placeholder !== undefined && { placeholder: coluna.placeholder })}
      className={cn(
        CELULA_EDITAVEL,
        // O código se COPIA: mono e tinta de acento (`--primary-text` no 2.0,
        // `--modulo` hoje). A quantidade se SOMA: mono tabular à direita.
        coluna.papel === 'codigo' && PAPEL.dado,
        coluna.papel === 'quantidade' && cn(PAPEL.dado, 'text-right'),
        coluna.papel !== 'codigo' && coluna.papel !== 'quantidade' && PAPEL.corpo,
      )}
      // O CÓDIGO é o único texto com acento do 2.0 (`--primary-text`, que é a
      // ponta escura da rampa lime). Chartreuse cheio é FILL e nunca texto —
      // e é por isso que a cor vem do token direto, e não de um `text-[…]`
      // que a régua da rodada proíbe.
      {...(coluna.papel === 'codigo' && { style: { color: 'var(--primary-text)' } })}
      {...registro}
      onChange={(e) => {
        void registro.onChange(e)
        aoAlterar?.()
      }}
    />
  )
}

export function GradeDeItens({
  name,
  colunas,
  linhaNova,
  fontes = [],
  totais,
  aoAlterar,
  semAdicionar,
  vazio = 'Nenhum item ainda — o rodapé abaixo inclui o primeiro.',
}: GradeDeItensProps) {
  const { control, register } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })
  const linhas = (useWatch({ control, name }) as LinhaDaGrade[] | undefined) ?? []

  const totalDaLinha = totais?.totalDaLinha ?? totalItemCentavos
  const { subtotalCentavos, totalCentavos } = totaisEmCentavos(
    totais ? linhas.map((linha) => totalDaLinha(linha)) : [],
    totais?.ajustes,
  )

  function adicionar(novas: readonly LinhaDaGrade[]) {
    for (const nova of novas) append(nova)
    aoAlterar?.()
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Card: a grade é o objeto sobre o plano da página. Dentro dele só
          espaço, hairline e tint — a regra dos 4 níveis da §Hierarquia. */}
      <div className="min-w-0 overflow-hidden rounded-card border border-rule-hair bg-card">
        {/* Só a MALHA rola na horizontal. Se o card inteiro rolasse, o fecho
            sairia de vista junto com a última coluna — e o total é o que o
            operador confere depois de mexer. */}
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              {/* Header separado do corpo por TINT, não por borda (§Hierarquia:
                nunca duas ferramentas na mesma fronteira). */}
              <tr className="bg-surface-sunken">
                {colunas.map((coluna) => (
                  <th
                    key={coluna.key}
                    scope="col"
                    className={cn(
                      'h-9 px-3 align-middle',
                      PAPEL.rotulo,
                      alinhaADireita(coluna) && 'text-right',
                    )}
                  >
                    {coluna.rotulo}
                  </th>
                ))}
                <th scope="col" className="w-10" />
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 ? (
                <tr>
                  <td
                    colSpan={colunas.length + 1}
                    className={cn('h-16 px-3 text-center italic', PAPEL.meta)}
                  >
                    {vazio}
                  </td>
                </tr>
              ) : (
                fields.map((field, indice) => (
                  // Linha de 40px, hairline entre linhas, sem linha vertical
                  // nenhuma — a tabela do 2.0 (§Hierarquia).
                  <tr
                    key={field.id}
                    className="group/linha h-10 border-t border-rule-hair first:border-t-0"
                  >
                    {colunas.map((coluna) => (
                      <td key={coluna.key} className="px-1 py-1 align-middle">
                        <Celula
                          coluna={coluna}
                          caminho={`${name}.${indice}.${coluna.key}`}
                          linhaName={`${name}.${indice}`}
                          subtituloName={
                            coluna.subtituloKey ? `${name}.${indice}.${coluna.subtituloKey}` : null
                          }
                          ariaLabel={`${coluna.rotulo} linha ${indice + 1}`}
                          register={register}
                          {...(aoAlterar && { aoAlterar })}
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Excluir linha ${indice + 1}`}
                        className="border-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          remove(indice)
                          aoAlterar?.()
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Rodapé tracejado: a fronteira entre "o que o documento tem" e "o que
            dá para trazer". Tracejado porque não é fim de dado — é o convite. */}
        <div
          data-slot="grade-de-itens-rodape"
          className="flex flex-wrap items-center gap-2 border-t border-dashed border-rule-hair px-3 py-2"
        >
          {semAdicionar ? null : (
            <AcaoDoRodape primaria onClick={() => adicionar([linhaNova])}>
              <Plus className="size-4" /> Adicionar item
            </AcaoDoRodape>
          )}
          {fontes.map((fonte) => (
            <span key={fonte.id} className="flex items-center">
              {fonte.render(adicionar)}
            </span>
          ))}
        </div>
        {totais ? (
          <BlocoDeTotais
            subtotalCentavos={subtotalCentavos}
            {...(totais.ajustes && { ajustes: totais.ajustes })}
            totalCentavos={totalCentavos}
            {...(totais.rotuloDoTotal && { rotuloDoTotal: totais.rotuloDoTotal })}
          />
        ) : null}
      </div>
    </div>
  )
}
