import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Minus, Plus } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'

export interface FormGridColumn {
  /** Nome do campo dentro da linha do array. */
  key: string
  label: string
  placeholder?: string
}

export interface FormGridProps {
  /** Nome do array no form (RHF useFieldArray). */
  name: string
  columns: FormGridColumn[]
  /** Valores da linha nova ao clicar em Incluir. */
  newRow: Record<string, string>
  addLabel?: string
}

/**
 * Grade editável dentro do formulário — transcrição §9 padrão 3 (10 usos).
 * RHF é o dono do estado; cada célula é um input registrado.
 */
export function FormGrid({ name, columns, newRow, addLabel = 'Incluir' }: FormGridProps) {
  const { register, control } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append(newRow)}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </div>
      <div className="rounded-md border">
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
                  No data to display
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => (
                <TableRow key={field.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="p-1">
                      <Input
                        aria-label={`${col.label} linha ${index + 1}`}
                        placeholder={col.placeholder}
                        className="h-8 border-0 shadow-none focus-visible:ring-0"
                        {...register(`${name}.${index}.${col.key}`)}
                      />
                    </TableCell>
                  ))}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
