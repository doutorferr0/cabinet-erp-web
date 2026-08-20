import { VOZ_DE_NOME } from '@/components/cabinet/nome'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoneyBRL, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'

/**
 * Tipo da célula. `money` guarda centavos (int) e digita em reais;
 * `check` guarda boolean; `select` é combo puro; `computed` é derivado da
 * linha (não vive no form state). Default `text`.
 */
export type FormGridCellType = 'text' | 'money' | 'percent' | 'check' | 'select' | 'computed'

export interface FormGridColumn {
  /** Nome do campo dentro da linha do array. */
  key: string
  label: string
  type?: FormGridCellType
  placeholder?: string
  /** Só para `type: 'select'`. */
  options?: readonly string[]
  /** Só para `type: 'computed'`: calcula o texto exibido a partir da linha. */
  compute?: (row: FormGridRow) => string
  /**
   * A VOZ da coluna, quando a célula não é dado neutro: `nome` para nome
   * próprio de entidade, `produto` para nome/descrição de produto.
   *
   * Existe pelo mesmo motivo do `voz` do `<TextField>`: a célula editável é um
   * `<input>`, e `<input>` não aceita filho — `<Nome>` e `<Produto>` não
   * entram aqui. Sem isto, a mesma descrição de produto que a listagem mostra
   * em Sora aparece em Inter dentro da grade do documento, e a regra vira
   * "vale onde é texto, não vale onde é campo".
   *
   * O produto NÃO recua para `--muted-foreground` aqui: na listagem ele é
   * coadjuvante do nome do cliente, mas na grade do documento ele É o assunto
   * da linha.
   */
  voz?: 'nome' | 'produto'
}

export type FormGridRow = Record<string, string | number | boolean | null>

/** Fileira de total no pé da grade (DESIGN.md §DocumentoTotais). */
export interface FormGridTotalRow {
  label: string
  valorCentavos: number
  /** `Total`: régua forte acima e único em Title (1.125rem/600) — o GRAND TOTAL do invoice. */
  destaque?: boolean
}

export interface FormGridProps {
  /** Nome do array no form (RHF useFieldArray). */
  name: string
  columns: FormGridColumn[]
  /** Valores da linha nova ao clicar em Incluir. */
  newRow: FormGridRow
  addLabel?: string
  /**
   * Botões próprios da tela acima da grade (ex.: `Ambiente`, `Produto` do
   * orçamento). Recebem o `append` DESTA grade — um `useFieldArray` externo
   * sobre o mesmo array não re-renderiza a tabela.
   */
  actions?: (append: (row: FormGridRow) => void) => React.ReactNode
  /** Esconde o botão `Incluir` padrão quando `actions` já insere linhas. */
  hideAdd?: boolean
  /**
   * Faixa de seção (DESIGN.md §FormGrid): quando presente, a linha cujo valor
   * desta chave é não-vazio vira banda de agrupamento de largura total — sem
   * colunas, rótulo em Meta à esquerda, régua forte acima e abaixo, fundo
   * Tinta de Bancada. Adoção no orçamento (`Ambiente`) aguarda a captura
   * confirmar que o legado agrupa por ambiente.
   */
  sectionKey?: string
  /**
   * Totais como últimas fileiras da própria grade (DESIGN.md §DocumentoTotais):
   * células da esquerda mescladas, rótulo em Meta na coluna anterior à de
   * valor, valor tabular caindo exatamente sob `valueColumnKey`. Sempre
   * derivados dos itens — nunca campo paralelo.
   */
  totals?: { valueColumnKey: string; rows: FormGridTotalRow[] }
}

function MoneyCell({ name, ariaLabel }: { name: string; ariaLabel: string }) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <Input
          aria-label={ariaLabel}
          inputMode="decimal"
          // Célula sem borda (a malha É o campo), mas COM anel: o anel amarelo
          // interno é o único sinal de onde o cursor está — `ring-0` deixava a
          // célula de valor sem foco visível nenhum.
          className="h-8 border-0 text-right shadow-none focus-visible:focus-ring-inset"
          value={
            typeof field.value === 'number' ? (field.value / 100).toFixed(2).replace('.', ',') : ''
          }
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            field.onChange(digits === '' ? null : Number(digits))
          }}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      )}
    />
  )
}

/** Percentual com 4 casas implícitas (§8.2 `Desc. %`). */
function PercentCell({ name, ariaLabel }: { name: string; ariaLabel: string }) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <Input
          aria-label={ariaLabel}
          inputMode="decimal"
          // Célula sem borda (a malha É o campo), mas COM anel: o anel amarelo
          // interno é o único sinal de onde o cursor está — `ring-0` deixava a
          // célula de valor sem foco visível nenhum.
          className="h-8 border-0 text-right shadow-none focus-visible:focus-ring-inset"
          value={typeof field.value === 'number' ? formatPercent(field.value) : ''}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            field.onChange(digits === '' ? null : Number(digits))
          }}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      )}
    />
  )
}

function CheckCell({ name, ariaLabel }: { name: string; ariaLabel: string }) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <Checkbox
          aria-label={ariaLabel}
          isSelected={!!field.value}
          onChange={(v: boolean) => field.onChange(v)}
        />
      )}
    />
  )
}

function SelectCell({
  name,
  ariaLabel,
  options,
}: {
  name: string
  ariaLabel: string
  options: readonly string[]
}) {
  return (
    <Controller
      name={name}
      render={({ field }) => {
        // O valor da linha entra na lista quando não está nela — item desativado
        // depois de gravado, ou lista de apoio que veio do servidor e não
        // carregou. Sem isto a célula apareceria em branco e a próxima gravação
        // apagaria o valor sem ninguém pedir.
        const atual = typeof field.value === 'string' ? field.value : ''
        const lista = atual && !options.includes(atual) ? [atual, ...options] : options

        return (
          <select
            aria-label={ariaLabel}
            className="h-8 w-full border-0 bg-transparent px-2 text-sm outline-none focus-visible:focus-ring-inset"
            value={atual}
            onChange={(e) => field.onChange(e.target.value || null)}
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

/** Célula derivada da linha (ex.: Valor Total = Quant. × Vl. Unitário). */
function ComputedCell({
  rowName,
  ariaLabel,
  compute,
}: {
  rowName: string
  ariaLabel: string
  compute: (row: FormGridRow) => string
}) {
  const row = useWatch({ name: rowName }) as FormGridRow | undefined
  return (
    <output aria-label={ariaLabel} className="block px-2 text-right text-sm tabular-nums">
      {compute(row ?? {})}
    </output>
  )
}

/**
 * Grade editável dentro do formulário — transcrição §9 padrão 3 (10 usos).
 * RHF é o dono do estado; cada célula é um campo registrado.
 */
export function FormGrid({
  name,
  columns,
  newRow,
  addLabel = 'Incluir',
  actions,
  hideAdd,
  sectionKey,
  totals,
}: FormGridProps) {
  const { register, control } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })
  // Linhas vivas para o rótulo da faixa de seção (reativo à edição).
  const rows = useWatch({ control, name }) as FormGridRow[] | undefined
  // Coluna de valor sob a qual os totais caem (precisa ter uma coluna antes, para o rótulo).
  const totalsValueIndex = totals ? columns.findIndex((c) => c.key === totals.valueColumnKey) : -1

  return (
    // Barra→grade é relação entre partes de um mesmo componente: `{spacing.md}`.
    // Dentro da barra, botões irmãos ficam em `{spacing.sm}`.
    //
    // `min-w-0`: sem isso, um item de `flex-col` (o `<fieldset>` do
    // `CadastroForm`, por exemplo) nasce com `min-width: auto` — a grade
    // muitas colunas (Orçamento, 14) empurra a página inteira mais larga que a
    // viewport em vez de rolar dentro de si mesma, porque o `overflow-x-auto`
    // do `form-grid-box` só passa a valer quando este contêiner PODE encolher.
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {hideAdd ? null : (
          <Button type="button" variant="outline" size="sm" onClick={() => append(newRow)}>
            <Plus className="size-4 text-modulo" /> {addLabel}
          </Button>
        )}
        {actions?.((row) => append(row))}
      </div>
      {/* Caixa preta 2px — o mesmo contêiner da DataTable (a malha interna é Fio). */}
      <div data-slot="form-grid-box" className="overflow-x-auto border-2 border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-16 text-center text-muted-foreground"
                >
                  Nenhum item.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => {
                const secao = sectionKey ? rows?.[index]?.[sectionKey] : null
                // Faixa de seção: corte mais forte que a malha — régua forte
                // acima e abaixo, rótulo em Meta, fundo Bancada (DESIGN.md).
                if (secao) {
                  return (
                    <TableRow
                      key={field.id}
                      className="border-y-2 border-border bg-muted hover:bg-muted"
                    >
                      <TableCell colSpan={columns.length + 1} className="p-1">
                        <div className="flex h-8 items-center justify-between px-2">
                          <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            {String(secao)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir linha ${index + 1}`}
                            onClick={() => remove(index)}
                          >
                            <Minus className="size-4 text-modulo" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }
                return (
                  <TableRow key={field.id}>
                    {columns.map((col) => {
                      const path = `${name}.${index}.${col.key}`
                      const ariaLabel = `${col.label} linha ${index + 1}`
                      return (
                        <TableCell key={col.key} className="p-1">
                          {col.type === 'money' ? (
                            <MoneyCell name={path} ariaLabel={ariaLabel} />
                          ) : col.type === 'percent' ? (
                            <PercentCell name={path} ariaLabel={ariaLabel} />
                          ) : col.type === 'check' ? (
                            <CheckCell name={path} ariaLabel={ariaLabel} />
                          ) : col.type === 'select' ? (
                            <SelectCell
                              name={path}
                              ariaLabel={ariaLabel}
                              options={col.options ?? []}
                            />
                          ) : col.type === 'computed' ? (
                            <ComputedCell
                              rowName={`${name}.${index}`}
                              ariaLabel={ariaLabel}
                              compute={col.compute ?? (() => '')}
                            />
                          ) : (
                            <Input
                              aria-label={ariaLabel}
                              {...(col.placeholder !== undefined && {
                                placeholder: col.placeholder,
                              })}
                              // Célula editável sem borda: a malha É o campo; foco = anel amarelo interno.
                              className={cn(
                                'h-8 border-0 bg-transparent focus-visible:focus-ring-inset',
                                col.voz === 'nome' && VOZ_DE_NOME,
                                col.voz === 'produto' && 'font-display',
                              )}
                              {...register(path)}
                            />
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir linha ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        <Minus className="size-4 text-modulo" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {totals && totalsValueIndex >= 1
              ? totals.rows.map((t, i) => (
                  // Totais são fileiras da grade: esquerda mesclada, rótulo em
                  // Meta na coluna anterior, valor sob a coluna de valor.
                  <TableRow
                    key={t.label}
                    className={cn(
                      // Zona de dinheiro: creme-esverdeado é exclusivo das
                      // fileiras de total — dado comum da malha fica em tinta
                      // normal, senão a cor deixa de significar.
                      t.destaque === true
                        ? 'bg-fill-money hover:bg-fill-money'
                        : 'bg-zone-money hover:bg-zone-money',
                      // Sem fio duplo: a régua forte do Total substitui o fio da fileira acima.
                      totals.rows[i + 1]?.destaque === true && 'border-b-0',
                      t.destaque === true && 'rule-strong-top',
                    )}
                  >
                    {totalsValueIndex > 1 ? (
                      <TableCell colSpan={totalsValueIndex - 1} className="p-1" />
                    ) : null}
                    <TableCell className="p-2 text-right font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {t.label}:
                    </TableCell>
                    <TableCell className="p-1">
                      <output
                        aria-label={t.label}
                        className={cn(
                          'block px-2 text-right text-sm tabular-nums',
                          // Convenção do ledger: dinheiro escreve em verde, o
                          // que subtrai escreve em vermelho. Sem isso, um
                          // desconto se lê igualzinho a uma soma.
                          t.valorCentavos < 0 ? 'text-destructive' : 'text-money',
                          // FUSÃO v5: o Total é o número-herói da tela —
                          // 2xl, o maior dado da malha. Ninguém procura o total.
                          t.destaque === true && 'text-2xl font-extrabold',
                        )}
                      >
                        {formatMoneyBRL(t.valorCentavos)}
                      </output>
                    </TableCell>
                    {/* Colunas após a de valor + a coluna do remover, vazias. */}
                    <TableCell colSpan={columns.length - totalsValueIndex} className="p-1" />
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
