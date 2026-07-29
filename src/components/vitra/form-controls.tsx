import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { LookupCombo } from '@/components/vitra/lookup-combo'
import type { LookupKind } from '@/mocks/lookups'
import { useFormContext } from 'react-hook-form'

/**
 * Controles de formulário ligados ao RHF via useFormContext.
 * Telas só COMPÕEM — não reimplementam label/erro/registro.
 */

interface BaseProps {
  name: string
  label: string
  className?: string
}

export function TextField({
  name,
  label,
  className,
  ...inputProps
}: BaseProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TextareaField({
  name,
  label,
  className,
  ...textareaProps
}: BaseProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea {...textareaProps} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Data: ISO (yyyy-mm-dd) no dado; input type="date" na borda. */
export function DateField({ name, label, className }: BaseProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="date" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Dinheiro: centavos (int) no dado; digitação em reais na borda. */
export function MoneyField({ name, label, className }: BaseProps) {
  const { setValue, getValues } = useFormContext()
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              inputMode="decimal"
              value={
                typeof field.value === 'number'
                  ? (field.value / 100).toFixed(2).replace('.', ',')
                  : ''
              }
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setValue(name, digits === '' ? null : Number(digits), { shouldDirty: true })
              }}
              onBlur={() => {
                // normaliza exibição
                const v = getValues(name)
                if (typeof v !== 'number') setValue(name, null)
              }}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function CheckboxField({ name, label, className }: BaseProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center gap-2">
            <FormControl>
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
            </FormControl>
            <FormLabel className="!mt-0 font-normal">{label}</FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** `[combo]` puro (sem botão "..."): select nativo com as opções do kind. */
export function SelectField({
  name,
  label,
  options,
  className,
}: BaseProps & { options: readonly string[] }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...field}
              value={field.value ?? ''}
            >
              <option value="">Selecione…</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** `[combo +...]`: LookupCombo ligado ao form. */
export function LookupField({
  name,
  label,
  kind,
  className,
  hideQuickAdd,
}: BaseProps & { kind: LookupKind; hideQuickAdd?: boolean }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <LookupCombo
              kind={kind}
              value={field.value ?? null}
              onChange={field.onChange}
              hideQuickAdd={hideQuickAdd}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Opção exclusiva (○/●) com rótulos lado a lado. */
export function RadioField({
  name,
  label,
  options,
  className,
}: BaseProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup
              className="flex flex-row flex-wrap gap-4"
              value={field.value ?? ''}
              onValueChange={field.onChange}
            >
              {options.map((o) => (
                <div key={o.value} className="flex items-center gap-2">
                  <RadioGroupItem value={o.value} id={`${name}-${o.value}`} />
                  <Label htmlFor={`${name}-${o.value}`} className="font-normal">
                    {o.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
