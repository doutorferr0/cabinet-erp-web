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
import { formatPercent } from '@/lib/formatters'
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
}

export type FormGridRow = Record<string, string | number | boolean | null>

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
}

function MoneyCell({ name, ariaLabel }: { name: string; ariaLabel: string }) {
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <Input
          aria-label={ariaLabel}
          inputMode="decimal"
          className="h-8 border-0 text-right shadow-none focus-visible:ring-0"
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
          className="h-8 border-0 text-right shadow-none focus-visible:ring-0"
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
          checked={!!field.value}
          onCheckedChange={(v) => field.onChange(!!v)}
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
      render={({ field }) => (
        <select
          aria-label={ariaLabel}
          className="h-8 w-full rounded-md border-0 bg-transparent px-2 text-sm focus-visible:outline-none"
          value={field.value ?? ''}
          onChange={(e) => field.onChange(e.target.value || null)}
          onBlur={field.onBlur}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
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
}: FormGridProps) {
  const { register, control } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })
  // Linhas vivas para o rótulo da faixa de seção (reativo à edição).
  const rows = useWatch({ control, name }) as FormGridRow[] | undefined

  return (
    // Barra→grade é relação entre partes de um mesmo componente: `{spacing.md}`.
    // Dentro da barra, botões irmãos ficam em `{spacing.sm}`.
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {hideAdd ? null : (
          <Button type="button" variant="outline" size="sm" onClick={() => append(newRow)}>
            <Plus className="size-4" /> {addLabel}
          </Button>
        )}
        {actions?.((row) => append(row))}
      </div>
      {/* Caixa em Régua com canto 4px — mesmo contêiner da DataTable (a malha interna é Fio). */}
      <div className="overflow-x-auto rounded-lg border">
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
                    <TableRow key={field.id} className="border-rule-strong bg-muted hover:bg-muted">
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
                            <Minus className="size-4" />
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
                              placeholder={col.placeholder}
                              className="h-8 border-0 shadow-none focus-visible:ring-0"
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
                        <Minus className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
